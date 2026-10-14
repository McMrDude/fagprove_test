
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { supabase } from "../supabaseClient";

export async function GET(request: NextRequest) {
    try {
        // 1. Read the login token from the browser's cookie.
        const token = request.cookies.get("auth_token")?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Du er ikke logget inn." },
                { status: 401 }
            );
        }

        // 2. Verify that the token was signed with our secret.
        const secretValue = process.env.AUTH_SECRET;

        if (!secretValue) {
            console.error("AUTH_SECRET is missing.");

            return NextResponse.json(
                { success: false, error: "Serveren er ikke riktig konfigurert." },
                { status: 500 }
            );
        }

        const secret = new TextEncoder().encode(secretValue);
        const { payload } = await jwtVerify(token, secret);

        // 3. Only teachers may access this endpoint.
        if (payload.role !== "teacher" || !payload.id) {
            return NextResponse.json(
                { success: false, error: "Du har ikke tilgang." },
                { status: 403 }
            );
        }

        // 4. Find the teacher using the ID from the verified token.
        const { data: teacher, error: teacherError } = await supabase
            .from("users")
            .select("id, name, email")
            .eq("id", payload.id)
            .eq("role", "teacher")
            .maybeSingle();

        if (teacherError) {
            console.error("Could not fetch teacher:", teacherError);

            return NextResponse.json(
                { success: false, error: "Kunne ikke hente læreropplysninger." },
                { status: 500 }
            );
        }

        if (!teacher) {
            return NextResponse.json(
                { success: false, error: "Fant ikke lærerkontoen." },
                { status: 404 }
            );
        }

        // 5. Find the course assigned to this teacher.
        const { data: course, error: courseError } = await supabase
            .from("courses")
            .select("id, name")
            .eq("teacher_id", teacher.id)
            .maybeSingle();

        if (courseError) {
            console.error("Could not fetch teacher course:", courseError);

            return NextResponse.json(
                { success: false, error: "Kunne ikke hente faget ditt." },
                { status: 500 }
            );
        }

        // 6. Send the information to the dashboard.
        return NextResponse.json({
            success: true,
            teacher: {
                id: teacher.id,
                name: teacher.name,
                email: teacher.email,
            },
            course: course
                ? {
                    id: course.id,
                    name: course.name,
                }
                : null,
        });
    } catch (error) {
        // Invalid, expired, or otherwise unverifiable token.
        if (
            error instanceof Error &&
            (error.name === "JWTExpired" || error.name === "JWTClaimValidationFailed" ||
             error.name === "JWSSignatureVerificationFailed" || error.name === "JWSInvalid")
        ) {
            return NextResponse.json(
                { success: false, error: "Innloggingen har utløpt. Logg inn igjen." },
                { status: 401 }
            );
        }

        console.error("Teacher dashboard API error:", error);

        return NextResponse.json(
            { success: false, error: "Noe gikk galt da læreroversikten skulle hentes." },
            { status: 500 }
        );
    }
}
