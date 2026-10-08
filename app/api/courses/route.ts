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