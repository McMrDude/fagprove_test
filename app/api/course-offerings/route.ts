import { NextResponse } from "next/server";
import { supabase } from "../supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("course_offerings")
      .select(`
        id,
        course_id,
        created_at,
        courses (
          id,
          name,
          teacher_id
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching course offerings:", error);
      return NextResponse.json(
        { success: false, error: "Kunne ikke hente planlagte kurs." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      offerings: data,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "En uventet feil oppstod." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const courseId = Number(body.course_id);
    const dates = body.session_dates;

    if (
      !Number.isInteger(courseId) ||
      courseId <= 0 ||
      !Array.isArray(dates) ||
      dates.length !== 5 ||
      dates.some(
        (date: unknown) =>
          typeof date !== "string" ||
          !/^\\d{4}-\\d{2}-\\d{2}$/.test(date)
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Velg et fag og oppgi nøyaktig fem leksjonsdatoer.",
        },
        { status: 400 }
      );
    }

    const sortedDates = [...dates].sort();

    if (new Set(sortedDates).size !== 5) {
      return NextResponse.json(
        {
          success: false,
          error: "Alle fem leksjonene må ha forskjellige datoer.",
        },
        { status: 400 }
      );
    }

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { success: false, error: "Fant ikke det valgte faget." },
        { status: 404 }
      );
    }

    const { data: offering, error: offeringError } = await supabase
      .from("course_offerings")
      .insert({ course_id: courseId })
      .select("id")
      .single();

    if (offeringError || !offering) {
      console.error("Error creating course offering:", offeringError);
      return NextResponse.json(
        { success: false, error: "Kunne ikke opprette kurset." },
        { status: 500 }
      );
    }

    const sessions = sortedDates.map(
      (sessionDate: string, index: number) => ({
        course_id: courseId,
        offering_id: offering.id,
        session_number: index + 1,
        session_date: sessionDate,
      })
    );

    const { error: sessionsError } = await supabase
      .from("course_sessions")
      .insert(sessions);

    if (sessionsError) {
      console.error("Error creating course sessions:", sessionsError);

      // Remove the offering if its lessons could not be created.
      await supabase
        .from("course_offerings")
        .delete()
        .eq("id", offering.id);

      return NextResponse.json(
        {
          success: false,
          error: "Kurset ble opprettet, men leksjonene kunne ikke lagres.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        offering_id: offering.id,
        message: "Kurset ble planlagt med fem leksjoner.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "En uventet feil oppstod." },
      { status: 500 }
    );
  }
}