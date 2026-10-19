import { NextResponse } from "next/server";

// Logging out clears the HTTP-only authentication cookie in the browser.
export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}