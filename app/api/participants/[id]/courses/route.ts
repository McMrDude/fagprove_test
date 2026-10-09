
import { NextResponse } from "next/server";
import { supabase } from "../../../supabaseClient";

type Context = {
    params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Context) {
    try {
        const { id } = await params;
        const body = await request.json();
        const courseId = Number(body.course_id);

        if (!Number.isInteger(courseId) || courseId <= 0) {
            return NextResponse.json(
                { success: false, error: "Ugyldig kurs." },
                { status: 400 }
            );
        }

        // Check that the participant and course exist.
        const { data: participant, error: participantError } = await supabase
            .from("participants")
            .select("id")
            .eq("id", id)
            .maybeSingle();

        if (participantError || !participant) {
            return NextResponse.json(
                { success: false, error: "Fant ikke deltakeren." },
                { status: 404 }
            );
        }

        const { data: course, error: courseError } = await supabase
            .from("courses")
            .select("id")
            .eq("id", courseId)
            .maybeSingle();

        if (courseError || !course) {
            return NextResponse.json(
                { success: false, error: "Fant ikke kurset." },
                { status: 404 }
            );
        }

        // Prevent duplicate enrollments.
        const { data: existing, error: existingError } = await supabase
            .from("course_participants")
            .select("id")
            .eq("participant_id", id)
            .eq("course_id", courseId)
            .maybeSingle();

        if (existingError) {
            console.error(existingError);
            return NextResponse.json(
                { success: false, error: "Kunne ikke kontrollere påmeldingen." },
                { status: 500 }
            );
        }

        if (existing) {
            return NextResponse.json(
                { success: false, error: "Deltakeren er allerede meldt på kurset." },
                { status: 409 }
            );
        }

        const { error } = await supabase
            .from("course_participants")
            .insert({
                participant_id: Number(id),
                course_id: courseId,
            });

        if (error) {
            console.error(error);
            return NextResponse.json(
                { success: false, error: "Kunne ikke melde på deltakeren." },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { success: false, error: "En uventet feil oppstod." },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request, { params }: Context) {
    try {
        const { id } = await params;
        const url = new URL(request.url);
        const courseId = Number(url.searchParams.get("course_id"));

        if (!Number.isInteger(courseId) || courseId <= 0) {
            return NextResponse.json(
                { success: false, error: "Ugyldig kurs." },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("course_participants")
            .delete()
            .eq("participant_id", id)
            .eq("course_id", courseId)
            .select("id");

        if (error) {
            console.error(error);
            return NextResponse.json(
                { success: false, error: "Kunne ikke fjerne kurset." },
                { status: 500 }
            );
        }

        if (!data || data.length === 0) {
            return NextResponse.json(
                { success: false, error: "Påmeldingen ble ikke funnet." },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { success: false, error: "En uventet feil oppstod." },
            { status: 500 }
        );
    }
}