
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { supabase } from "../supabaseClient";

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get("auth_token")?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Du er ikke logget inn." },
                { status: 401 }
            );
        }

        const secretValue = process.env.AUTH_SECRET;

        if (!secretValue) {
            return NextResponse.json(
                { success: false, error: "Serveren er ikke riktig konfigurert." },
                { status: 500 }
            );
        }

        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(secretValue)
        );

        if (payload.role !== "teacher" || !payload.id) {
            return NextResponse.json(
                { success: false, error: "Du har ikke tilgang." },
                { status: 403 }
            );
        }

        // Get the logged-in teacher.
        const { data: teacher, error: teacherError } = await supabase
            .from("users")
            .select("id, name, email")
            .eq("id", payload.id)
            .eq("role", "teacher")
            .maybeSingle();

        if (teacherError) throw teacherError;

        if (!teacher) {
            return NextResponse.json(
                { success: false, error: "Fant ikke lærerkontoen." },
                { status: 404 }
            );
        }

        // Find the subject assigned to this teacher.
        const { data: course, error: courseError } = await supabase
            .from("courses")
            .select("id, name")
            .eq("teacher_id", teacher.id)
            .maybeSingle();

        if (courseError) throw courseError;

        if (!course) {
            return NextResponse.json({
                success: true,
                teacher,
                course: null,
                offering: null,
                nextSession: null,
                sessions: [],
                stats: {
                    participants: 0,
                    completedSessions: 0,
                    totalSessions: 0,
                    absences: 0,
                },
            });
        }

        // Get all scheduled offerings for this subject.
        const { data: offerings, error: offeringsError } = await supabase
            .from("course_offerings")
            .select("id, course_id, created_at")
            .eq("course_id", course.id)
            .order("created_at", { ascending: false });

        if (offeringsError) throw offeringsError;

        if (!offerings || offerings.length === 0) {
            return NextResponse.json({
                success: true,
                teacher,
                course,
                offering: null,
                nextSession: null,
                sessions: [],
                stats: {
                    participants: 0,
                    completedSessions: 0,
                    totalSessions: 0,
                    absences: 0,
                },
            });
        }

        // Get the sessions belonging to these offerings.
        const offeringIds = offerings.map((item) => item.id);

        const { data: allSessions, error: sessionsError } = await supabase
            .from("course_sessions")
            .select("id, offering_id, session_number, session_date")
            .in("offering_id", offeringIds)
            .order("session_date", { ascending: true });

        if (sessionsError) throw sessionsError;

        const sessions = allSessions ?? [];

        // Use the Norwegian calendar date for date comparisons.
        const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Europe/Oslo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date());

        // Prefer the offering with the next upcoming session.
        const nextSession =
            sessions.find((session) => session.session_date >= today) ?? null;

        const activeOffering =
            offerings.find((item) => item.id === nextSession?.offering_id) ??
            offerings[0];

        const activeSessions = sessions.filter(
            (session) => session.offering_id === activeOffering.id
        );

        const sessionIds = activeSessions.map((session) => session.id);

        // Get participants registered for this specific offering.
        const { data: enrollments, error: enrollmentsError } =
            await supabase
                .from("course_participants")
                .select("participant_id")
                .eq("offering_id", activeOffering.id);

        if (enrollmentsError) throw enrollmentsError;

        // Get the recorded attendance for this offering.
        let absences = 0;

        if (sessionIds.length > 0) {
            const { data: attendanceRows, error: attendanceError } =
                await supabase
                    .from("attendance")
                    .select("present")
                    .in("session_id", sessionIds);

            if (attendanceError) throw attendanceError;

            absences = (attendanceRows ?? []).filter(
                (row) => row.present === false
            ).length;
        }

        return NextResponse.json({
            success: true,
            teacher,
            course,
            offering: activeOffering,
            nextSession,
            sessions: activeSessions,
            stats: {
                participants: enrollments?.length ?? 0,
                completedSessions: activeSessions.filter(
                    (session) => session.session_date < today
                ).length,
                totalSessions: activeSessions.length,
                absences,
            },
        });
    } catch (error) {
        console.error("Teacher dashboard API error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Kunne ikke hente læreroversikten.",
            },
            { status: 500 }
        );
    }
}
