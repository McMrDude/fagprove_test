import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { supabase } from "../../supabaseClient";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "E-post og passord må fylles ut.",
        },
        { status: 400 }
      );
    }

    // Find user
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, password_hash, role")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          success: false,
          error: "Kunne ikke logge inn.",
        },
        { status: 500 }
      );
    }

    // Don't reveal whether the email exists
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Feil e-post eller passord.",
        },
        { status: 401 }
      );
    }

    // Check password
    const passwordCorrect = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordCorrect) {
      return NextResponse.json(
        {
          success: false,
          error: "Feil e-post eller passord.",
        },
        { status: 401 }
      );
    }

    // Create login token
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
      .setProtectedHeader({
        alg: "HS256",
      })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Store token in secure HTTP-only cookie
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
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