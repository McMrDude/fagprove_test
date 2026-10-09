
import { NextResponse } from "next/server";
import { supabase } from "../../supabaseClient";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data: enrollments, error: enrollmentError } = await supabase
            .from("course_participants")
            .select("course_id")
            .eq("participant_id", id);

        if (enrollmentError) {
            console.error(enrollmentError);
            return NextResponse.json(
                { success: false, error: "Kunne ikke hente kurs." },
                { status: 500 }
            );
        }

        const courseIds = enrollments?.map((item) => item.course_id) ?? [];

        if (courseIds.length === 0) {
            return NextResponse.json({ success: true, courses: [] });
        }

        const { data: courses, error } = await supabase
            .from("courses")
            .select("id, name")
            .in("id", courseIds);

        if (error) {
            console.error(error);
            return NextResponse.json(
                { success: false, error: "Kunne ikke hente kurs." },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            courses: courses ?? [],
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { success: false, error: "En uventet feil oppstod." },
            { status: 500 }
        );
    }
}