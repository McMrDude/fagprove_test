import { NextResponse } from "next/server";
import { supabase } from "../../supabaseClient";

export async function GET(
    request: Request,
    {
        params,
    }: {
        params: Promise<{
        id: string;
        }>;
    }
) {
    try {
        console.log("Fetching courses for participant...");

        const { id } = await params;

        const participant_ids = await supabase
        .from("course_participants")
        .select("course_id")
        .eq("participant_id", id)
        .order("id");

        const thing = participant_ids.data?.map((item) => item.course_id) || [];

        const { data, error } = await supabase
        .from("courses")
        .select("name, id")
        .in("id", thing)

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