import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { supabase } from "../../supabaseClient";

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

    return Number(payload.id);
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

// GET: Load course offerings, sessions and participants
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

  const offeringIds = (offerings ?? []).map((o) => o.id);

  let sessions: any[] = [];

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

  // No session selected yet: return the available offerings and dates.
  if (!offeringId || !sessionId) {
    return NextResponse.json({ course, offerings, sessions });
  }

  // Verify that the selected offering belongs to this teacher.
  const offering = (offerings ?? []).find((o) => o.id === offeringId);

  if (!offering) {
    return NextResponse.json(
      { error: "Du har ikke tilgang til dette kurset." },
      { status: 403 }
    );
  }

  // Verify that the selected session belongs to that offering.
  const session = sessions.find(
    (s) => s.id === sessionId && s.offering_id === offeringId
  );

  if (!session) {
    return NextResponse.json(
      { error: "Fant ikke denne kursøkten." },
      { status: 404 }
    );
  }

  const { data: enrollments, error: enrollmentError } = await supabase
    .from("course_participants")
    .select("participant_id")
    .eq("offering_id", offeringId);

  if (enrollmentError) {
    return NextResponse.json(
      { error: enrollmentError.message },
      { status: 500 }
    );
  }

  const participantIds = [
    ...new Set((enrollments ?? []).map((e) => e.participant_id)),
  ];

  let participants: any[] = [];

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

  // Only return attendance for participants enrolled in this offering.
  const enrolledIds = new Set(participantIds);

  const attendanceByParticipant = Object.fromEntries(
    (attendance ?? [])
      .filter((a) => enrolledIds.has(a.participant_id))
      .map((a) => [a.participant_id, a.present])
  );

  return NextResponse.json({
    course,
    offerings,
    sessions,
    selectedSession: session,
    participants: participants.map((p) => ({
      ...p,
      present: attendanceByParticipant[p.id] ?? null,
    })),
  });
}

// POST: Save attendance for one participant and session
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

  const body = await request.json();
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

  // Confirm the session belongs to the teacher's course.
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

  // Confirm the participant is enrolled in this exact offering.
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

  // Update an existing record, or create one if it doesn't exist.
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
      .update({ present, marked_at: new Date().toISOString() })
      .eq("id", existing.id);

    saveError = result.error;
  } else {
    const result = await supabase
      .from("attendance")
      .insert({
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

  return NextResponse.json({ success: true });
}