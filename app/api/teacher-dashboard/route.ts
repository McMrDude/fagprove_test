import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { supabase } from "../supabaseClient";

function getOsloDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Oslo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

const emptyStats = {
    participants: 0,
    completedSessions: 0,
    totalSessions: 0,
    absences: 0,
};

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
                courseStatus: null,
                nextSession: null,
                sessions: [],
                participants: [],
                stats: emptyStats,
            });
        }

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
                courseStatus: null,
                nextSession: null,
                sessions: [],
                participants: [],
                stats: emptyStats,
            });
        }

        const offeringIds = offerings.map((item) => item.id);

        const { data: allSessions, error: sessionsError } = await supabase
            .from("course_sessions")
            .select("id, offering_id, session_number, session_date")
            .in("offering_id", offeringIds)
            .order("session_date", { ascending: true });

        if (sessionsError) throw sessionsError;

        const sessions = allSessions ?? [];
        const today = getOsloDate();

        // Classify each offering using its scheduled session dates.
        const offeringStates = offerings.map((item) => {
            const offeringSessions = sessions.filter(
                (session) => session.offering_id === item.id
            );

            const firstDate = offeringSessions[0]?.session_date ?? null;
            const lastDate =
                offeringSessions[offeringSessions.length - 1]?.session_date ??
                null;

            let status: "planned" | "active" | "completed" | "unscheduled";

            if (offeringSessions.length === 0) {
                status = "unscheduled";
            } else if (firstDate! > today) {
                status = "planned";
            } else if (lastDate! < today) {
                status = "completed";
            } else {
                status = "active";
            }

            return {
                offering: item,
                sessions: offeringSessions,
                status,
            };
        });

        // Prefer an active offering, otherwise the nearest planned one.
        // Never fall back to an old, completed offering.
        const selected =
            offeringStates.find((item) => item.status === "active") ??
            offeringStates
                .filter((item) => item.status === "planned")
                .sort((a, b) => {
                    const aDate = a.sessions[0]?.session_date ?? "";
                    const bDate = b.sessions[0]?.session_date ?? "";
                    return aDate.localeCompare(bDate);
                })[0] ??
            null;

        if (!selected) {
            return NextResponse.json({
                success: true,
                teacher,
                course,
                offering: null,
                courseStatus: null,
                nextSession: null,
                sessions: [],
                participants: [],
                stats: emptyStats,
                previousOfferings: offeringStates
                    .filter((item) => item.status === "completed")
                    .map((item) => ({
                        id: item.offering.id,
                        status: item.status,
                    })),
            });
        }

        const activeOffering = selected.offering;
        const activeSessions = selected.sessions;
        const sessionIds = activeSessions.map((session) => session.id);

        const { data: enrollments, error: enrollmentsError } =
            await supabase
                .from("course_participants")
                .select("participant_id, completion_status")
                .eq("offering_id", activeOffering.id);

        if (enrollmentsError) throw enrollmentsError;

        const participantIds = [
            ...new Set((enrollments ?? []).map((item) => item.participant_id)),
        ];

        let participants: {
            id: number;
            name: string;
            phone_number: string;
            completion_status: string | null;
        }[] = [];

        if (participantIds.length > 0) {
            const { data: participantRows, error: participantsError } =
                await supabase
                    .from("participants")
                    .select("id, name, phone_number")
                    .in("id", participantIds)
                    .order("name", { ascending: true });

            if (participantsError) throw participantsError;

            participants = (participantRows ?? []).map((participant) => ({
                ...participant,
                completion_status:
                    enrollments?.find(
                        (item) => item.participant_id === participant.id
                    )?.completion_status ?? null,
            }));
        }

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

        const nextSession =
            activeSessions.find(
                (session) => session.session_date >= today
            ) ?? null;

        return NextResponse.json({
            success: true,
            teacher,
            course,
            offering: activeOffering,
            courseStatus: selected.status,
            nextSession,
            sessions: activeSessions,
            participants,
            stats: {
                participants: participants.length,
                completedSessions: activeSessions.filter(
                    (session) => session.session_date < today
                ).length,
                totalSessions: activeSessions.length,
                absences,
            },
            previousOfferings: offeringStates
                .filter((item) => item.status === "completed")
                .map((item) => ({
                    id: item.offering.id,
                    status: item.status,
                })),
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
