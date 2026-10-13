
import { NextResponse } from "next/server";
import { supabase } from "../../supabaseClient";

export async function GET() {
  try {

    type RegistrationOptionRow = {
    id: number;
    course_id: number;
    created_at: string;
    courses:
        | { id: number; name: string }
        | { id: number; name: string }[]
        | null;
    course_sessions: {
        session_number: number;
        session_date: string;
    }[] | null;
    };

    const { data, error } = await supabase
    .from("course_offerings")
    .select(`
        id,
        course_id,
        created_at,
        courses (
        id,
        name
        ),
        course_sessions (
        session_number,
        session_date
        )
    `)
    .order("id", { ascending: false });

    if (error) {
    console.error(error);

    return NextResponse.json(
        {
        success: false,
        error: "Kunne ikke hente tilgjengelige kurs.",
        },
        { status: 500 }
    );
    }

    const rows = (data ?? []) as unknown as RegistrationOptionRow[];

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          success: false,
          error: "Kunne ikke hente tilgjengelige kurs.",
        },
        { status: 500 }
      );
    }

    const offerings = rows
      .map((offering) => {
        const sessions = [...(offering.course_sessions ?? [])].sort(
          (a, b) => a.session_number - b.session_number
        );

        return {
          id: offering.id,
          course_id: offering.course_id,
          course_name: Array.isArray(offering.courses)
            ? offering.courses[0]?.name ?? "Ukjent fag"
            : offering.courses?.name ?? "Ukjent fag",
          start_date: sessions[0]?.session_date ?? null,
          session_count: sessions.length,
        };
      })
      // Only show offerings with a scheduled first session in the future.
      .filter(
        (offering) =>
          offering.start_date &&
          offering.start_date >=
            new Date().toLocaleDateString("en-CA", {
              timeZone: "Europe/Oslo",
            })
      );

    return NextResponse.json({
      success: true,
      offerings,
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