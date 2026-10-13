
import { NextResponse } from "next/server";
import { supabase } from "../supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("participants")
      .select("id, name, phone_number")
      .order("name");

    if (error) {
      console.error(error);

      return NextResponse.json(
        { success: false, error: "Kunne ikke hente deltakere." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      participants: data,
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
  let participantId: number | null = null;

  try {
    const body = await request.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const phone =
      typeof body.phone === "string" ? body.phone.trim() : "";
    const offeringIds: number[] = Array.isArray(body.offeringIds)
      ? body.offeringIds.map(Number)
      : [];

    // Validate the submitted information.
    if (!name || !phone || offeringIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Navn, telefonnummer og minst ett kurs må fylles ut.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{8}$/.test(phone)) {
      return NextResponse.json(
        {
          success: false,
          error: "Telefonnummeret må være nøyaktig 8 sifre.",
        },
        { status: 400 }
      );
    }

    if (
      offeringIds.some(
        (id) => !Number.isSafeInteger(id) || id <= 0
      ) ||
      new Set(offeringIds).size !== offeringIds.length
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Ugyldig eller duplisert kursvalg.",
        },
        { status: 400 }
      );
    }

    // Find the selected offerings and their associated subjects.
    const { data: offerings, error: offeringsError } = await supabase
      .from("course_offerings")
      .select("id, course_id")
      .in("id", offeringIds);

    if (offeringsError) {
      console.error(offeringsError);

      return NextResponse.json(
        {
          success: false,
          error: "Kunne ikke hente de valgte kursene.",
        },
        { status: 500 }
      );
    }

    if (!offerings || offerings.length !== offeringIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Ett eller flere valgte kurs finnes ikke.",
        },
        { status: 400 }
      );
    }

    // Create the participant.
    const { data: participant, error: participantError } =
      await supabase
        .from("participants")
        .insert({
          name,
          phone_number: phone,
        })
        .select("id, name, phone_number")
        .single();

    if (participantError || !participant) {
      console.error(participantError);

      return NextResponse.json(
        {
          success: false,
          error: "Kunne ikke registrere deltakeren.",
        },
        { status: 500 }
      );
    }

    participantId = participant.id;

    // Connect the participant to each selected offering.
    // course_id is derived from the offering, not trusted from the form.
    const connections = offerings.map((offering) => ({
      participant_id: participant.id,
      course_id: offering.course_id,
      offering_id: offering.id,
    }));

    const { error: connectionError } = await supabase
      .from("course_participants")
      .insert(connections);

    if (connectionError) {
      console.error(connectionError);

      // Roll back the participant if enrollment fails.
      const { error: cleanupError } = await supabase
        .from("participants")
        .delete()
        .eq("id", participant.id);

      if (cleanupError) {
        console.error("Could not clean up participant:", cleanupError);
      }

      return NextResponse.json(
        {
          success: false,
          error: "Deltakeren ble opprettet, men kursregistreringen feilet.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        participant,
        offerings,
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