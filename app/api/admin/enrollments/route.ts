
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { supabase } from "../../supabaseClient";

export async function GET(request: NextRequest) {
  try {
    // 1. Verify the login cookie
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Du må logge inn først." },
        { status: 401 }
      );
    }

    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      console.error("AUTH_SECRET is missing.");
      return NextResponse.json(
        { error: "Serveren mangler autentiseringsoppsett." },
        { status: 500 }
      );
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    if (!payload.id) {
      return NextResponse.json(
        { error: "Ugyldig innlogging." },
        { status: 401 }
      );
    }

    // 2. Check the user's role in the database
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", payload.id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Fant ikke brukeren." },
        { status: 401 }
      );
    }

    const role = String(user.role).toLowerCase();

    if (
      !["admin", "office_worker", "office-worker", "kontoransatt"].includes(
        role
      )
    ) {
      return NextResponse.json(
        { error: "Du har ikke tilgang til denne rapporten." },
        { status: 403 }
      );
    }

    // 3. Read the optional course filter
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    // 4. Load courses
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("id, name")
      .order("name");

    if (coursesError) {
      console.error("Could not load courses:", coursesError);
      return NextResponse.json(
        { error: "Kunne ikke hente kursene." },
        { status: 500 }
      );
    }

    // 5. Load enrollment records
    let enrollmentQuery = supabase
      .from("course_participants")
      .select("participant_id, course_id, offering_id, completion_status");

    if (courseId && courseId !== "all") {
      const parsedCourseId = Number(courseId);

      if (!Number.isInteger(parsedCourseId) || parsedCourseId <= 0) {
        return NextResponse.json(
          { error: "Ugyldig kursfilter." },
          { status: 400 }
        );
      }

      enrollmentQuery = enrollmentQuery.eq("course_id", parsedCourseId);
    }

    const { data: enrollments, error: enrollmentError } =
      await enrollmentQuery;

    if (enrollmentError) {
      console.error("Could not load enrollments:", enrollmentError);
      return NextResponse.json(
        { error: "Kunne ikke hente påmeldingene." },
        { status: 500 }
      );
    }

    const participantIds = [
      ...new Set((enrollments ?? []).map((item) => item.participant_id)),
    ];

    const offeringIds = [
      ...new Set(
        (enrollments ?? [])
          .map((item) => item.offering_id)
          .filter((id): id is number => id !== null && id !== undefined)
      ),
    ];

    // 6. Load the relevant participants
    let participants: {
      id: number;
      name: string;
      phone_number: string;
    }[] = [];

    if (participantIds.length > 0) {
      const { data, error } = await supabase
        .from("participants")
        .select("id, name, phone_number")
        .in("id", participantIds);

      if (error) {
        console.error("Could not load participants:", error);
        return NextResponse.json(
          { error: "Kunne ikke hente deltakerne." },
          { status: 500 }
        );
      }

      participants = data ?? [];
    }

    // 7. Load course offerings and their session dates
    let offerings: {
      id: number;
      course_id: number;
      created_at: string;
    }[] = [];

    let sessions: {
      offering_id: number;
      session_date: string;
    }[] = [];

    if (offeringIds.length > 0) {
      const { data, error } = await supabase
        .from("course_offerings")
        .select("id, course_id, created_at")
        .in("id", offeringIds);

      if (error) {
        console.error("Could not load offerings:", error);
        return NextResponse.json(
          { error: "Kunne ikke hente kursrundene." },
          { status: 500 }
        );
      }

      offerings = data ?? [];

      const { data: sessionData, error: sessionError } = await supabase
        .from("course_sessions")
        .select("offering_id, session_date")
        .in("offering_id", offeringIds)
        .order("session_date");

      if (sessionError) {
        console.error("Could not load sessions:", sessionError);
        return NextResponse.json(
          { error: "Kunne ikke hente kursdatoene." },
          { status: 500 }
        );
      }

      sessions = sessionData ?? [];
    }

    // 8. Combine the information into one response
    const result = (enrollments ?? []).map((enrollment) => {
      const participant = participants.find(
        (item) => item.id === enrollment.participant_id
      );

      const course = (courses ?? []).find(
        (item) => item.id === enrollment.course_id
      );

      const offering = offerings.find(
        (item) => item.id === enrollment.offering_id
      );

      const offeringSessions = sessions
        .filter((session) => session.offering_id === enrollment.offering_id)
        .map((session) => session.session_date)
        .sort();

      return {
        participantId: enrollment.participant_id,
        participantName: participant?.name ?? "Ukjent deltaker",
        phoneNumber: participant?.phone_number ?? "",
        courseId: enrollment.course_id,
        courseName: course?.name ?? "Ukjent kurs",
        offeringId: enrollment.offering_id,
        offeringCreatedAt: offering?.created_at ?? null,
        firstSessionDate: offeringSessions[0] ?? null,
        lastSessionDate:
          offeringSessions[offeringSessions.length - 1] ?? null,
        completionStatus: enrollment.completion_status ?? "enrolled",
      };
    });

    // Sort by participant name, then course name
    result.sort((a, b) => {
      const nameComparison = a.participantName.localeCompare(
        b.participantName,
        "no"
      );

      return nameComparison !== 0
        ? nameComparison
        : a.courseName.localeCompare(b.courseName, "no");
    });

    return NextResponse.json({
      courses: courses ?? [],
      enrollments: result,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "JWTExpired" || error.name === "JWTClaimValidationFailed")
    ) {
      return NextResponse.json(
        { error: "Innloggingen har utløpt. Logg inn igjen." },
        { status: 401 }
      );
    }

    console.error("Enrollment report error:", error);

    return NextResponse.json(
      { error: "En uventet feil oppstod." },
      { status: 500 }
    );
  }
}
