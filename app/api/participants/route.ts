import { NextResponse } from "next/server";
import { supabase } from "../supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select("id, name")
      .order("name");

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          success: false,
          error: "Kunne ikke hente kurs.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      courses: data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "En uventet feil oppstod.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Get the data sent from the frontend
    const body = await request.json();

    const name = body.name?.trim();
    const phone = body.phone?.trim();
    const courses = body.courses;

    // -------------------------------
    // Basic validation
    // -------------------------------

    if (!name || !phone || !Array.isArray(courses) || courses.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Navn, telefonnummer og minst ett kurs må fylles ut.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{8}$/.test(phone)) {
      return NextResponse.json(
        {
          success: false,
          error: "Telefonnummeret må være nøyaktig 8 sifre.",
        },
        { status: 400 }
      );
    }

    // -------------------------------
    // Get the selected courses
    // -------------------------------

    const { data: selectedCourses, error: coursesError } = await supabase
      .from("courses")
      .select("id, name")
      .in("id", courses);

    if (coursesError) {
      console.error(coursesError);

      return NextResponse.json(
        {
          success: false,
          error: "Kunne ikke finne kursene.",
        },
        { status: 500 }
      );
    }

    if (!selectedCourses || selectedCourses.length !== courses.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Ett eller flere av de valgte kursene finnes ikke.",
        },
        { status: 400 }
      );
    }

    // -------------------------------
    // Create participant
    // -------------------------------

    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .insert({
        name,
        phone_number: phone,
      })
      .select("id, name, phone_number")
      .single();

    if (participantError) {
      console.error(participantError);

      return NextResponse.json(
        {
          success: false,
          error: "Kunne ikke registrere deltakeren.",
        },
        { status: 500 }
      );
    }

    // -------------------------------
    // Connect participant to courses
    // -------------------------------

    const courseConnections = selectedCourses.map((course) => ({
      participant_id: participant.id,
      course_id: course.id,
    }));

    const { error: connectionError } = await supabase
      .from("course_participants")
      .insert(courseConnections);

    if (connectionError) {
      console.error(connectionError);

      // Remove the participant if the course connection failed
      await supabase
        .from("participants")
        .delete()
        .eq("id", participant.id);

      return NextResponse.json(
        {
          success: false,
          error: "Deltakeren ble opprettet, men kursene kunne ikke registreres.",
        },
        { status: 500 }
      );
    }

    // -------------------------------
    // Success
    // -------------------------------

    return NextResponse.json(
      {
        success: true,
        participant,
        courses: selectedCourses,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "En uventet feil oppstod.",
      },
      { status: 500 }
    );
  }
}