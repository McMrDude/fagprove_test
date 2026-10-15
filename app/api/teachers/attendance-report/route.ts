import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { supabase } from "../../supabaseClient";

function getOsloDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Oslo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get("auth_token")?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Du er ikke logget inn." },
                { status: 401 }
            );
        }

        const secret = process.env.AUTH_SECRET;

        if (!secret) {
            return NextResponse.json(
                { success: false, error: "Serveren er ikke riktig konfigurert." },
                { status: 500 }
            );
        }

        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(secret)
        );

        if (payload.role !== "teacher" || !payload.id) {
            return NextResponse.json(
                { success: false, error: "Du har ikke tilgang." },
                { status: 403 }
            );
        }

        const { data: teacher, error: teacherError } = await supabase
            .from("users")
            .select("id")
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
                course: null,
                offering: null,
                sessions: [],
                participants: [],
            });
        }

        const { data: offerings, error: offeringsError } = await supabase
            .from("course_offerings")
            .select("id, course_id, created_at")
            .eq("course_id", course.id)
            .order("created_at", { ascending: false });

        if (offeringsError) throw offeringsError;

        if (!offerings?.length) {
            return NextResponse.json({
                success: true,
                course,
                offering: null,
                sessions: [],
                participants: [],
            });
        }

        const offeringIds = offerings.map((offering) => offering.id);

        const { data: allSessions, error: sessionsError } = await supabase
            .from("course_sessions")
            .select("id, offering_id, session_number, session_date")
            .in("offering_id", offeringIds)
            .order("session_date", { ascending: true });

        if (sessionsError) throw sessionsError;

        const sessionsByOffering = offerings.map((offering) => {
            const sessions = (allSessions ?? [])
                .filter((session) => session.offering_id === offering.id)
                .sort((a, b) => a.session_number - b.session_number);

            const today = getOsloDate();
            const firstDate = sessions[0]?.session_date;
            const lastDate = sessions[sessions.length - 1]?.session_date;

            let status: "planned" | "active" | "completed" | "unscheduled";

            if (sessions.length === 0) {
                status = "unscheduled";
            } else if (firstDate > today) {
                status = "planned";
            } else if (lastDate < today) {
                status = "completed";
            } else {
                status = "active";
            }

            return { offering, sessions, status };
        });

        // Prefer a course happening now, otherwise the nearest upcoming one.
        const selected =
            sessionsByOffering.find((item) => item.status === "active") ??
            sessionsByOffering
                .filter((item) => item.status === "planned")
                .sort((a, b) =>
                    (a.sessions[0]?.session_date ?? "").localeCompare(
                        b.sessions[0]?.session_date ?? ""
                    )
                )[0] ??
            null;

        if (!selected) {
            return NextResponse.json({
                success: true,
                course,
                offering: null,
                sessions: [],
                participants: [],
                message:
                    "Det finnes ingen aktive eller planlagte kurs med kursøkter.",
            });
        }

        const { data: enrollments, error: enrollmentsError } =
            await supabase
                .from("course_participants")
                .select("participant_id, completion_status")
                .eq("offering_id", selected.offering.id);

        if (enrollmentsError) throw enrollmentsError;

        const participantIds = [
            ...new Set(
                (enrollments ?? []).map((enrollment) =>
                    String(enrollment.participant_id)
                )
            ),
        ];

        let participantRows: {
            id: number | string;
            name: string;
            phone_number: string | null;
        }[] = [];

        if (participantIds.length > 0) {
            const { data, error: participantsError } = await supabase
                .from("participants")
                .select("id, name, phone_number")
                .in("id", participantIds);

            if (participantsError) throw participantsError;
            participantRows = data ?? [];
        }

        const sessionIds = selected.sessions.map((session) => session.id);

        let attendanceRows: {
            session_id: number | string;
            participant_id: number | string;
            present: boolean;
        }[] = [];

        if (sessionIds.length > 0 && participantIds.length > 0) {
            const { data, error: attendanceError } = await supabase
                .from("attendance")
                .select("session_id, participant_id, present")
                .in("session_id", sessionIds)
                .in("participant_id", participantIds);

            if (attendanceError) throw attendanceError;
            attendanceRows = data ?? [];
        }

        const today = getOsloDate();

        const participants = participantRows
            .map((participant) => {
                const enrollment = enrollments?.find(
                    (item) =>
                        String(item.participant_id) === String(participant.id)
                );

                const attendance = selected.sessions.map((session) => {
                    const record = attendanceRows.find(
                        (row) =>
                            String(row.session_id) === String(session.id) &&
                            String(row.participant_id) ===
                                String(participant.id)
                    );

                    let status:
                        | "present"
                        | "absent"
                        | "unmarked"
                        | "upcoming";

                    if (session.session_date > today) {
                        status = "upcoming";
                    } else if (!record) {
                        status = "unmarked";
                    } else {
                        status = record.present ? "present" : "absent";
                    }

                    return {
                        sessionId: session.id,
                        sessionNumber: session.session_number,
                        sessionDate: session.session_date,
                        status,
                    };
                });

                return {
                    id: participant.id,
                    name: participant.name,
                    phone_number: participant.phone_number,
                    completion_status: enrollment?.completion_status ?? null,
                    attendance,
                    presentCount: attendance.filter(
                        (item) => item.status === "present"
                    ).length,
                    absenceCount: attendance.filter(
                        (item) => item.status === "absent"
                    ).length,
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name, "nb"));

        return NextResponse.json({
            success: true,
            course,
            offering: selected.offering,
            courseStatus: selected.status,
            sessions: selected.sessions,
            participants,
        });
    } catch (error) {
        console.error("Teacher attendance report error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Kunne ikke hente oppmøterapporten.",
            },
            { status: 500 }
        );
    }
}
