import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { supabase } from "../../supabaseClient";

export const dynamic = "force-dynamic";

function getTodayInNorway() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    const secret = process.env.AUTH_SECRET;

    if (!token || !secret) {
      return NextResponse.json(
        { success: false, error: "Du må logge inn for å se kursoversikten." },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (!payload.id) {
      return NextResponse.json(
        { success: false, error: "Ugyldig innlogging." },
        { status: 401 }
      );
    }

    const [
      coursesResult,
      offeringsResult,
      sessionsResult,
      enrollmentsResult,
      participantsResult,
      usersResult,
    ] = await Promise.all([
      supabase.from("courses").select("id, name, teacher_id").order("name"),
      supabase.from("course_offerings").select("id, course_id, created_at"),
      supabase
        .from("course_sessions")
        .select("id, course_id, session_number, session_date, offering_id")
        .order("session_number"),
      supabase
        .from("course_participants")
        .select("id, course_id, participant_id, offering_id"),
      supabase.from("participants").select("id, name, phone_number"),
      supabase.from("users").select("id, name, role"),
    ]);

    const results = [
      coursesResult,
      offeringsResult,
      sessionsResult,
      enrollmentsResult,
      participantsResult,
      usersResult,
    ];
    const failedResult = results.find((result) => result.error);

    if (failedResult?.error) {
      console.error("Course overview query failed:", failedResult.error);
      return NextResponse.json(
        {
          success: false,
          error: "Kunne ikke hente kursinformasjon. Kontroller at API-rollen har lesetilgang til kurs-, deltaker- og brukertabellene.",
        },
        { status: 500 }
      );
    }

    const courses = coursesResult.data ?? [];
    const offerings = offeringsResult.data ?? [];
    const sessions = sessionsResult.data ?? [];
    const enrollments = enrollmentsResult.data ?? [];
    const participants = participantsResult.data ?? [];
    const users = usersResult.data ?? [];

    const today = getTodayInNorway();
    const userById = new Map(users.map((user) => [String(user.id), user]));
    const participantById = new Map(
      participants.map((participant) => [String(participant.id), participant])
    );

    const courseDetails = courses.map((course) => {
      const teacher = course.teacher_id
        ? userById.get(String(course.teacher_id))
        : undefined;

      const courseOfferings = offerings
        .filter((offering) => String(offering.course_id) === String(course.id))
        .map((offering) => {
          const offeringSessions = sessions
            .filter((session) => String(session.offering_id) === String(offering.id))
            .sort((a, b) => a.session_number - b.session_number);

          const dates = offeringSessions
            .map((session) => session.session_date)
            .filter(Boolean)
            .sort();

          const firstDate = dates[0] ?? null;
          const lastDate = dates[dates.length - 1] ?? null;

          let status: "planned" | "active" | "completed" = "planned";
          if (lastDate && lastDate < today) {
            status = "completed";
          } else if (firstDate && firstDate <= today) {
            status = "active";
          }

          const offeringEnrollments = enrollments.filter(
            (enrollment) =>
              String(enrollment.offering_id) === String(offering.id)
          );

          const offeringParticipants = offeringEnrollments
            .map((enrollment) => participantById.get(String(enrollment.participant_id)))
            .filter((participant): participant is NonNullable<typeof participant> =>
              Boolean(participant)
            )
            // A duplicate join row should not show a participant twice in one offering.
            .filter(
              (participant, index, list) =>
                list.findIndex((other) => String(other.id) === String(participant.id)) === index
            )
            .map((participant) => ({
              id: participant.id,
              name: participant.name,
              phone_number: participant.phone_number ?? "",
            }));

          return {
            id: offering.id,
            course_id: offering.course_id,
            teacher_name: teacher?.name ?? null,
            first_date: firstDate,
            last_date: lastDate,
            session_count: offeringSessions.length,
            status,
            participants: offeringParticipants,
            sessions: offeringSessions.map((session) => ({
              id: session.id,
              session_number: session.session_number,
              session_date: session.session_date,
            })),
          };
        })
        .sort((a, b) => {
          const dateA = a.first_date ?? "9999-12-31";
          const dateB = b.first_date ?? "9999-12-31";
          return dateA.localeCompare(dateB);
        });

      return {
        id: course.id,
        name: course.name,
        teacher_name: teacher?.name ?? null,
        offerings: courseOfferings,
      };
    });

    const allOfferings = courseDetails.flatMap((course) => course.offerings);
    const participantCount = allOfferings.reduce(
      (total, offering) => total + offering.participants.length,
      0
    );

    return NextResponse.json({
      success: true,
      courses: courseDetails,
      stats: {
        courses: courseDetails.length,
        offerings: allOfferings.length,
        participants: participantCount,
        planned: allOfferings.filter((offering) => offering.status === "planned").length,
        active: allOfferings.filter((offering) => offering.status === "active").length,
        completed: allOfferings.filter((offering) => offering.status === "completed").length,
      },
    });
  } catch (error) {
    console.error("Course overview API error:", error);
    return NextResponse.json(
      { success: false, error: "En uventet feil oppstod da kursene skulle hentes." },
      { status: 500 }
    );
  }
}
