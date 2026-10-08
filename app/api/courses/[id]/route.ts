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
        const { id } = await params;

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