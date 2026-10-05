import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "../../supabaseClient";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim();
    const password = body.password;

    // Basic validation
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Alle feltene må fylles ut.",
        },
        { status: 400 }
      );
    }

    if (phone.length !== 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Telefonnummeret må være nøyaktig 8 sifre.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Passordet må være minst 8 tegn.",
        },
        { status: 400 }
      );
    }

    // Check whether email already exists
    const { data: existingUser, error: lookupError } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) {
      console.error(lookupError);

      return NextResponse.json(
        {
          success: false,
          error: "Kunne ikke kontrollere brukeren.",
        },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Det finnes allerede en bruker med denne e-postadressen.",
        },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          name,
          email,
          phone_number: body.phone?.trim() || null,
          password_hash: passwordHash,
        },
      ])
      .select("name, email")
      .single();

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          success: false,
          error: "Kunne ikke opprette brukeren.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: data,
      },
      { status: 201 }
    );
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