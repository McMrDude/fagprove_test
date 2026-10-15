import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { supabase } from "../../supabaseClient";

type CompletionStatus =
  | "enrolled"
  | "pending_review"
  | "completed"
  | "not_completed";

async function getTeacherId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const secret = process.env.AUTH_SECRET;

  if (!token || !secret) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    if (payload.role !== "teacher" || !payload.id) return null;

    const teacherId = Number(payload.id);

    return Number.isFinite(teacherId) && teacherId > 0
      ? teacherId
      : null;
  } catch {
    return null;
  }
}

async function getTeacherCourse(teacherId: number) {
  const { data, error } = await supabase
    .from("courses")
    .select("id, name")
    .eq("teacher_id", teacherId)
    .single();

  if (error || !data) return null;

  return data;
}

function getOsloDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

// GET: Load course offerings, sessions and participants.
export async function GET(request: NextRequest) {
  const teacherId = await getTeacherId();

  if (!teacherId) {
    return NextResponse.json(
      { error: "Du må være logget inn som lærer." },
      { status: 401 }
    );
  }

  const course = await getTeacherCourse(teacherId);

  if (!course) {
    return NextResponse.json(
      { error: "Fant ikke faget som er tilordnet læreren." },
      { status: 403 }
    );
  }

  const { data: offerings, error: offeringsError } = await supabase
    .from("course_offerings")
    .select("id, course_id, created_at")
    .eq("course_id", course.id)
    .order("created_at", { ascending: false });

  if (offeringsError) {
    return NextResponse.json(
      { error: offeringsError.message },
      { status: 500 }
    );
  }

  const offeringIds = (offerings ?? []).map((offering) => offering.id);

  let sessions: {
    id: number;
    offering_id: number;
    session_number: number;
    session_date: string;
  }[] = [];

  if (offeringIds.length > 0) {
    const { data, error } = await supabase
      .from("course_sessions")
      .select("id, offering_id, session_number, session_date")
      .in("offering_id", offeringIds)
      .order("session_number", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    sessions = data ?? [];
  }

  const params = request.nextUrl.searchParams;
  const offeringId = Number(params.get("offering_id"));
  const sessionId = Number(params.get("session_id"));

  // No session selected: return the available offerings and sessions.
  if (!offeringId || !sessionId) {
    return NextResponse.json({ course, offerings, sessions });
  }

  const offering = (offerings ?? []).find(
    (item) => Number(item.id) === offeringId
  );

  if (!offering) {
    return NextResponse.json(
      { error: "Du har ikke tilgang til dette kurset." },
      { status: 403 }
    );
  }

  const session = sessions.find(
    (item) =>
      Number(item.id) === sessionId &&
      Number(item.offering_id) === offeringId
  );

  if (!session) {
    return NextResponse.json(
      { error: "Fant ikke denne kursøkten." },
      { status: 404 }
    );
  }

  const { data: enrollments, error: enrollmentError } = await supabase
    .from("course_participants")
    .select(
      "id, participant_id, completion_status, completion_reviewed_at"
    )
    .eq("offering_id", offeringId);

  if (enrollmentError) {
    return NextResponse.json(
      { error: enrollmentError.message },
      { status: 500 }
    );
  }

  const participantIds = [
    ...new Set((enrollments ?? []).map((item) => item.participant_id)),
  ];

  let participants: {
    id: number;
    name: string;
    phone_number: string;
  }[] = [];

  if (participantIds.length > 0) {
    const { data, error } = await supabase
      .from("participants")
      .select("id, name, phone_number")
      .in("id", participantIds)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    participants = data ?? [];
  }

  const { data: attendance, error: attendanceError } = await supabase
    .from("attendance")
    .select("id, participant_id, present")
    .eq("session_id", sessionId);

  if (attendanceError) {
    return NextResponse.json(
      { error: attendanceError.message },
      { status: 500 }
    );
  }

  const enrolledIds = new Set(participantIds);

  const attendanceByParticipant = Object.fromEntries(
    (attendance ?? [])
      .filter((item) => enrolledIds.has(item.participant_id))
      .map((item) => [item.participant_id, item.present])
  );

  const enrollmentByParticipant = Object.fromEntries(
    (enrollments ?? []).map((item) => [
      item.participant_id,
      {
        completion_status: item.completion_status,
        completion_reviewed_at: item.completion_reviewed_at,
      },
    ])
  );

  return NextResponse.json({
    course,
    offerings,
    sessions,
    selectedSession: session,
    participants: participants.map((participant) => ({
      ...participant,
      present: attendanceByParticipant[participant.id] ?? null,
      completion_status:
        enrollmentByParticipant[participant.id]?.completion_status ??
        "enrolled",
      completion_reviewed_at:
        enrollmentByParticipant[participant.id]?.completion_reviewed_at ??
        null,
    })),
  });
}

// POST: Save attendance or a teacher's final pass/fail decision.
export async function POST(request: NextRequest) {
  const teacherId = await getTeacherId();

  if (!teacherId) {
    return NextResponse.json(
      { error: "Du må være logget inn som lærer." },
      { status: 401 }
    );
  }

  const course = await getTeacherCourse(teacherId);

  if (!course) {
    return NextResponse.json(
      { error: "Fant ikke lærerens fag." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ugyldig forespørsel." },
      { status: 400 }
    );
  }

  // Handle a teacher's final pass/fail decision.
  if (body.action === "review_completion") {
    const participantId = Number(body.participant_id);
    const offeringId = Number(body.offering_id);
    const status = body.status as CompletionStatus;

    if (
      !Number.isInteger(participantId) ||
      participantId <= 0 ||
      !Number.isInteger(offeringId) ||
      offeringId <= 0 ||
      !["completed", "not_completed"].includes(status)
    ) {
      return NextResponse.json(
        { error: "Ugyldige data for sluttvurderingen." },
        { status: 400 }
      );
    }

    // Confirm the offering belongs to the teacher's subject.
    const { data: offering, error: offeringError } = await supabase
      .from("course_offerings")
      .select("id, course_id")
      .eq("id", offeringId)
      .eq("course_id", course.id)
      .maybeSingle();

    if (offeringError) {
      return NextResponse.json(
        { error: offeringError.message },
        { status: 500 }
      );
    }

    if (!offering) {
      return NextResponse.json(
        { error: "Du har ikke tilgang til denne kursrunden." },
        { status: 403 }
      );
    }

    const { data: courseSessions, error: sessionsError } = await supabase
      .from("course_sessions")
      .select("id, session_date")
      .eq("offering_id", offeringId)
      .order("session_number", { ascending: true });

    if (sessionsError) {
      return NextResponse.json(
        { error: sessionsError.message },
        { status: 500 }
      );
    }

    const sessions = courseSessions ?? [];
    const today = getOsloDate();

    const allSessionsHavePassed =
      sessions.length === 5 &&
      sessions.every(
        (item) => item.session_date && item.session_date < today
      );

    if (!allSessionsHavePassed) {
      return NextResponse.json(
        {
          error:
            "Sluttvurdering er først tilgjengelig når alle fem kursøktene er gjennomført.",
        },
        { status: 400 }
      );
    }

    const { data: enrollment, error: enrollmentError } = await supabase
      .from("course_participants")
      .select("id, completion_status")
      .eq("offering_id", offeringId)
      .eq("participant_id", participantId)
      .maybeSingle();

    if (enrollmentError) {
      return NextResponse.json(
        { error: enrollmentError.message },
        { status: 500 }
      );
    }

    if (!enrollment) {
      return NextResponse.json(
        { error: "Deltakeren er ikke påmeldt denne kursrunden." },
        { status: 403 }
      );
    }

    if (enrollment.completion_status !== "pending_review") {
      return NextResponse.json(
        {
          error:
            "Deltakeren må være klar for sluttvurdering før du kan registrere bestått eller ikke bestått.",
        },
        { status: 400 }
      );
    }

    // Check that attendance has been explicitly recorded for all five sessions.
    const { data: attendanceRecords, error: attendanceError } =
      await supabase
        .from("attendance")
        .select("session_id, present")
        .eq("participant_id", participantId)
        .in(
          "session_id",
          sessions.map((item) => item.id)
        );

    if (attendanceError) {
      return NextResponse.json(
        { error: attendanceError.message },
        { status: 500 }
      );
    }

    const records = attendanceRecords ?? [];

    const attendanceIsComplete =
      records.length === 5 &&
      sessions.every((courseSession) =>
        records.some(
          (record) =>
            String(record.session_id) === String(courseSession.id) &&
            typeof record.present === "boolean"
        )
      );

    if (!attendanceIsComplete) {
      return NextResponse.json(
        {
          error:
            "Oppmøte må være registrert for alle fem kursøktene før sluttvurdering.",
        },
        { status: 400 }
      );
    }

    // Save the decision and the teacher who made it.
    const { data: updatedEnrollment, error: updateError } = await supabase
      .from("course_participants")
      .update({
        completion_status: status,
        completion_reviewed_at: new Date().toISOString(),
        completion_reviewed_by: teacherId,
      })
      .eq("id", enrollment.id)
      .eq("completion_status", "pending_review")
      .select("id")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    if (!updatedEnrollment) {
      return NextResponse.json(
        {
          error:
            "Resultatet ble endret et annet sted. Oppdater siden og prøv igjen.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      completion_status: status,
    });
  }

  // Otherwise, process a normal attendance update.
  const sessionId = Number(body.session_id);
  const participantId = Number(body.participant_id);
  const present = body.present;

  if (
    !Number.isInteger(sessionId) ||
    sessionId <= 0 ||
    !Number.isInteger(participantId) ||
    participantId <= 0 ||
    typeof present !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Ugyldige data for frammøte." },
      { status: 400 }
    );
  }

  const { data: session, error: sessionError } = await supabase
    .from("course_sessions")
    .select("id, offering_id, course_id")
    .eq("id", sessionId)
    .eq("course_id", course.id)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json(
      { error: sessionError.message },
      { status: 500 }
    );
  }

  if (!session) {
    return NextResponse.json(
      { error: "Du har ikke tilgang til denne kursøkten." },
      { status: 403 }
    );
  }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("course_participants")
    .select("id")
    .eq("offering_id", session.offering_id)
    .eq("participant_id", participantId)
    .maybeSingle();

  if (enrollmentError) {
    return NextResponse.json(
      { error: enrollmentError.message },
      { status: 500 }
    );
  }

  if (!enrollment) {
    return NextResponse.json(
      { error: "Deltakeren er ikke påmeldt dette kurset." },
      { status: 403 }
    );
  }

  // Update the attendance record if one exists; otherwise insert it.
  const { data: existing, error: existingError } = await supabase
    .from("attendance")
    .select("id")
    .eq("session_id", sessionId)
    .eq("participant_id", participantId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 }
    );
  }

  let saveError;

  if (existing) {
    const result = await supabase
      .from("attendance")
      .update({
        present,
        marked_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    saveError = result.error;
  } else {
    const result = await supabase.from("attendance").insert({
      session_id: sessionId,
      participant_id: participantId,
      present,
      marked_at: new Date().toISOString(),
    });

    saveError = result.error;
  }

  if (saveError) {
    return NextResponse.json(
      { error: saveError.message },
      { status: 500 }
    );
  }

  // Recalculate the participant's completion status.
  const offeringId = session.offering_id;

  const [
    { data: offeringSessions, error: sessionsError },
    { data: enrollmentDetails, error: enrollmentDetailsError },
  ] = await Promise.all([
    supabase
      .from("course_sessions")
      .select("id, session_date")
      .eq("offering_id", offeringId)
      .order("session_number", { ascending: true }),

    supabase
      .from("course_participants")
      .select("id, completion_status")
      .eq("offering_id", offeringId)
      .eq("participant_id", participantId)
      .single(),
  ]);

  if (sessionsError || enrollmentDetailsError || !enrollmentDetails) {
    return NextResponse.json(
      {
        error:
          sessionsError?.message ??
          enrollmentDetailsError?.message ??
          "Kunne ikke hente påmeldingen.",
      },
      { status: 500 }
    );
  }

  const courseSessions = offeringSessions ?? [];
  const today = getOsloDate();

  const allSessionsHavePassed =
    courseSessions.length === 5 &&
    courseSessions.every(
      (item) => item.session_date && item.session_date < today
    );

  if (allSessionsHavePassed) {
    const { data: participantAttendance, error: participantAttendanceError } =
      await supabase
        .from("attendance")
        .select("session_id, present")
        .eq("participant_id", participantId)
        .in(
          "session_id",
          courseSessions.map((item) => item.id)
        );

    if (participantAttendanceError) {
      return NextResponse.json(
        { error: participantAttendanceError.message },
        { status: 500 }
      );
    }

    const records = participantAttendance ?? [];

    const attendanceIsComplete =
      records.length === 5 &&
      courseSessions.every((courseSession) =>
        records.some(
          (record) =>
            String(record.session_id) === String(courseSession.id) &&
            typeof record.present === "boolean"
        )
      );

    if (attendanceIsComplete) {
      const absences = records.filter(
        (record) => record.present === false
      ).length;

      const currentStatus =
        enrollmentDetails.completion_status as CompletionStatus;

      // Never overwrite a teacher's existing final decision.
      const isManuallyDecided =
        currentStatus === "completed" ||
        currentStatus === "not_completed";

      if (!isManuallyDecided) {
        const nextStatus: CompletionStatus =
          absences <= 1 ? "completed" : "pending_review";

        const { error: completionError } = await supabase
          .from("course_participants")
          .update({
            completion_status: nextStatus,
            completion_reviewed_at: null,
            completion_reviewed_by: null,
          })
          .eq("id", enrollmentDetails.id);

        if (completionError) {
          return NextResponse.json(
            { error: completionError.message },
            { status: 500 }
          );
        }
      }
    }
  } else if (
    enrollmentDetails.completion_status === "pending_review"
  ) {
    // A course that is not yet finished cannot remain awaiting final review.
    const { error: resetError } = await supabase
      .from("course_participants")
      .update({
        completion_status: "enrolled",
        completion_reviewed_at: null,
        completion_reviewed_by: null,
      })
      .eq("id", enrollmentDetails.id);

    if (resetError) {
      return NextResponse.json(
        { error: resetError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}