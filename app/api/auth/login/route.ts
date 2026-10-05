import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json()
  } catch (error) {
    console.error("Error parsing request body:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Ugyldig forespørsel.",
      },
      { status: 400 }
    );
  }
};