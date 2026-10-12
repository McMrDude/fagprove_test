
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { supabase } from "../../supabaseClient";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET
);

async function isAdmin(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;

  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

// Get all subjects and teacher accounts.
export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json(
      { success: false, error: "Du har ikke tilgang." },
      { status: 403 }
    );
  }

  const [coursesResult, teachersResult] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name, teacher_id")
      .order("name"),
    supabase
      .from("users")
      .select("id, name, email")
      .eq("role", "teacher")
      .order("name"),
  ]);

  if (coursesResult.error || teachersResult.error) {
    console.error(
      coursesResult.error,
      teachersResult.error
    );

    return NextResponse.json(
      { success: false, error: "Kunne ikke hente fag og lærere." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    courses: coursesResult.data,
    teachers: teachersResult.data,
  });
}

// Assign a teacher to a subject.
export async function PATCH(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json(
      { success: false, error: "Du har ikke tilgang." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const courseId = Number(body.course_id);
    const teacherId =
      body.teacher_id === null ? null : Number(body.teacher_id);

    if (
      !Number.isInteger(courseId) ||
      courseId <= 0 ||
      (teacherId !== null &&
        (!Number.isInteger(teacherId) || teacherId <= 0))
    ) {
      return NextResponse.json(
        { success: false, error: "Ugyldig fag eller lærer." },
        { status: 400 }
      );
    }

    // Make sure the subject exists.
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError || !course) {
      return NextResponse.json(
        { success: false, error: "Fant ikke faget." },
        { status: 404 }
      );
    }

    if (teacherId !== null) {
      // Only teacher accounts can be assigned.
      const { data: teacher, error: teacherError } = await supabase
        .from("users")
        .select("id")
        .eq("id", teacherId)
        .eq("role", "teacher")
        .maybeSingle();

      if (teacherError || !teacher) {
        return NextResponse.json(
          { success: false, error: "Fant ikke lærerkontoen." },
          { status: 400 }
        );
      }

      // A teacher can only be responsible for one subject.
      const { data: otherCourses, error: assignmentError } =
        await supabase
          .from("courses")
          .select("id")
          .eq("teacher_id", teacherId)
          .neq("id", courseId)
          .limit(1);

      if (assignmentError) {
        console.error(assignmentError);

        return NextResponse.json(
          { success: false, error: "Kunne ikke kontrollere lærerens fag." },
          { status: 500 }
        );
      }

      if (otherCourses && otherCourses.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Denne læreren er allerede ansvarlig for et annet fag.",
          },
          { status: 409 }
        );
      }
    }

    const { error: updateError } = await supabase
      .from("courses")
      .update({ teacher_id: teacherId })
      .eq("id", courseId);

    if (updateError) {
      console.error(updateError);

      return NextResponse.json(
        { success: false, error: "Kunne ikke lagre lærerens fag." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Lærerens fag ble oppdatert.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, error: "En uventet feil oppstod." },
      { status: 500 }
    );
  }
}