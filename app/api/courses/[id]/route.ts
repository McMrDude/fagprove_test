import { NextResponse } from "next/server";
import { supabase } from "../../supabaseClient";
import {useParams} from "next/navigation";

const { id } = useParams();

export async function GET() {
  try {
    const thing = await supabase
      .from("courses_participants")
      .select("course_id")
      .eq("participant_id", id)
      .order("name");
    
    const { data, error } = await supabase
      .from("courses")
      .select("name, id")
      .eq("id", thing)
      .maybeSingle();

    if (error) {
      console.error(error);
    }
  } catch (error) {
    console.error(error);
  }
}