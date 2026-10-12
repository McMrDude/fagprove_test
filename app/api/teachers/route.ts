import { NextResponse } from "next/server";
import { supabase } from "../supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("teachers")
      .select("*");
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching teachers:", error);
    return NextResponse.json({ error: "Failed to fetch teachers" }, { status: 500 });
  }
}