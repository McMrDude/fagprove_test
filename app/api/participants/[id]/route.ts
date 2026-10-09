
import { NextResponse } from "next/server";
import { supabase } from "../../supabaseClient";

type Context = {
    params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Context) {
    try {
        const { id } = await params;
        const body = await request.json();

        const name =
            typeof body.name === "string" ? body.name.trim() : "";
        const phone_number =
            typeof body.phone_number === "string"
                ? body.phone_number.trim()
                : "";

        if (!name || !phone_number) {
            return NextResponse.json(
                { success: false, error: "Navn og telefonnummer må fylles ut." },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("participants")
            .update({ name, phone_number })
            .eq("id", id)
            .select("id, name, phone_number")
            .single();

        if (error) {
            console.error(error);
            return NextResponse.json(
                { success: false, error: "Kunne ikke oppdatere deltakeren." },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, participant: data });
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

        // Remove course enrollments first.
        const { error: enrollmentError } = await supabase
            .from("course_participants")
            .delete()
            .eq("participant_id", id);

        if (enrollmentError) {
            console.error(enrollmentError);
            return NextResponse.json(
                { success: false, error: "Kunne ikke fjerne deltakerens kurs." },
                { status: 500 }
            );
        }

        const { error } = await supabase
            .from("participants")
            .delete()
            .eq("id", id);

        if (error) {
            console.error(error);
            return NextResponse.json(
                {
                    success: false,
                    error: "Kunne ikke slette deltakeren. Kontroller om deltakeren har tilknyttet oppmøtehistorikk.",
                },
                { status: 500 }
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