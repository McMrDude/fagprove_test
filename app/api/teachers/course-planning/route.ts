
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { supabase } from "../../supabaseClient";

async function getTeacherId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const secret = process.env.AUTH_SECRET;

  if (!token || !secret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    if (payload.role !== "teacher" || !payload.id) {
      return null;
    }

    return String(payload.id);
  } catch {
    return null;
  }
}

export async function GET() {
  const teacherId = await getTeacherId();

  if (!teacherId) {
    return NextResponse.json(
      { error: "Du må være innlogget som lærer." },
      { status: 401 }
    );
  }

  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, name")
    .eq("teacher_id", teacherId);

  if (error) {
    console.error("Kunne ikke hente lærerens fag:", error);

    return NextResponse.json(
      { error: "Kunne ikke hente faget ditt." },
      { status: 500 }
    );
  }

  if (!courses || courses.length !== 1) {
    return NextResponse.json(
      {
        error:
          "Kontoen din må være knyttet til nøyaktig ett fag. Kontakt kontoransvarlig.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ course: courses[0] });
}

export async function POST(request: NextRequest) {
  const teacherId = await getTeacherId();

  if (!teacherId) {
    return NextResponse.json(
      { error: "Du må være innlogget som lærer." },
      { status: 401 }
    );
  }

  let body: { course_id?: number; session_dates?: string[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ugyldig forespørsel." },
      { status: 400 }
    );
  }

  const courseId = Number(body.course_id);
  const sessionDates = body.session_dates;

  if (
    !Number.isSafeInteger(courseId) ||
    courseId <= 0 ||
    !Array.isArray(sessionDates) ||
    sessionDates.length !== 5 ||
    !sessionDates.every(
      (date) =>
        typeof date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) &&
        new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date
    ) ||
    new Set(sessionDates).size !== 5
  ) {
    return NextResponse.json(
      { error: "Velg fem gyldige, forskjellige kursdatoer." },
      { status: 400 }
    );
  }

  // Verify that this course actually belongs to the logged-in teacher.
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, name")
    .eq("id", courseId)
    .eq("teacher_id", teacherId)
    .single();

  if (courseError || !course) {
    return NextResponse.json(
      { error: "Du har ikke tilgang til å opprette kurs i dette faget." },
      { status: 403 }
    );
  }

  // Create one course offering.
  const { data: offering, error: offeringError } = await supabase
    .from("course_offerings")
    .insert({ course_id: course.id })
    .select("id")
    .single();

  if (offeringError || !offering) {
    console.error("Kunne ikke opprette kurs:", offeringError);

    return NextResponse.json(
      { error: "Kunne ikke opprette kurset." },
      { status: 500 }
    );
  }

  // Create the five lessons belonging to this offering.
  const sessions = sessionDates.map((sessionDate, index) => ({
    course_id: course.id,
    offering_id: offering.id,
    session_number: index + 1,
    session_date: sessionDate,
  }));

  const { error: sessionsError } = await supabase
    .from("course_sessions")
    .insert(sessions);

  if (sessionsError) {
    console.error("Kunne ikke opprette kursdatoer:", sessionsError);

    // Clean up the incomplete offering if session creation failed.
    await supabase
      .from("course_sessions")
      .delete()
      .eq("offering_id", offering.id);

    await supabase
      .from("course_offerings")
      .delete()
      .eq("id", offering.id);

    return NextResponse.json(
      { error: "Kunne ikke lagre alle kursdatoene." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: `Kurset i ${course.name} ble opprettet.`,
      offering_id: offering.id,
    },
    { status: 201 }
  );
}