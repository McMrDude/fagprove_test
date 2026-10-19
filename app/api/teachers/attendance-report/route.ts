import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { supabase } from "../../supabaseClient";

// Returns today's date in Oslo's timezone as YYYY-MM-DD.
// This is important because course dates should be compared with
// the local date in Norway, not the server's potentially different timezone.
function getOsloDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Oslo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

// GET runs when something requests data from this API route.
// It returns the teacher's course, sessions, participants and attendance.
export async function GET(request: NextRequest) {
    try {
        // Read the authentication token from the browser's auth_token cookie.
        // The optional chaining means we won't crash if the cookie is missing.
        const token = request.cookies.get("auth_token")?.value;

        // If there is no token, the user has not logged in.
        // HTTP 401 means the request is unauthenticated.
        if (!token) {
            return NextResponse.json(
                { success: false, error: "Du er ikke logget inn." },
                { status: 401 }
            );
        }

        // Read the secret used to verify JWT signatures.
        // This secret must be configured on the server.
        const secret = process.env.AUTH_SECRET;

        // Without the secret, the server cannot safely verify the token.
        // HTTP 500 means there is a server configuration problem.
        if (!secret) {
            return NextResponse.json(
                { success: false, error: "Serveren er ikke riktig konfigurert." },
                { status: 500 }
            );
        }

        // Verify that the token has a valid signature and has not expired.
        // If verification fails, jwtVerify throws an error and jumps to catch.
        // The payload contains the information stored inside the JWT.
        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(secret)
        );

        // Check that the token identifies a teacher and contains a user ID.
        // HTTP 403 means the user is not allowed to access this endpoint.
        if (payload.role !== "teacher" || !payload.id) {
            return NextResponse.json(
                { success: false, error: "Du har ikke tilgang." },
                { status: 403 }
            );
        }

        // Look up the teacher in the database using the ID from the JWT.
        // select("id") requests only the ID column.
        // Both eq() filters must match: the ID must match AND the role
        // in the database must be "teacher".
        // maybeSingle() allows zero or one matching row.
        const { data: teacher, error: teacherError } = await supabase
            .from("users")
            .select("id")
            .eq("id", payload.id)
            .eq("role", "teacher")
            .maybeSingle();

        // If Supabase reports a database error, send it to the catch block.
        if (teacherError) throw teacherError;

        // The account may no longer exist, even if the token contains its ID.
        if (!teacher) {
            return NextResponse.json(
                { success: false, error: "Fant ikke lærerkontoen." },
                { status: 404 }
            );
        }

        // Find the course assigned to this teacher.
        // teacher_id connects the course to the teacher's user ID.
        const { data: course, error: courseError } = await supabase
            .from("courses")
            .select("id, name")
            .eq("teacher_id", teacher.id)
            .maybeSingle();

        if (courseError) throw courseError;

        // A teacher might exist without having a course assigned yet.
        // Return a successful response with empty data instead of an error.
        if (!course) {
            return NextResponse.json({
                success: true,
                course: null,
                offering: null,
                sessions: [],
                participants: [],
            });
        }

        // Find all scheduled offerings for this course.
        // An offering represents a particular run of a course.
        // For example, English might be offered once in October and again in January.
        // Descending created_at order puts the newest-created offering first.
        const { data: offerings, error: offeringsError } = await supabase
            .from("course_offerings")
            .select("id, course_id, created_at")
            .eq("course_id", course.id)
            .order("created_at", { ascending: false });

        if (offeringsError) throw offeringsError;

        // If the course has no offerings, there are no sessions or participants
        // to return for an offering. Send empty arrays and stop here.
        // !offerings?.length is true if offerings is null/undefined or empty.
        if (!offerings?.length) {
            return NextResponse.json({
                success: true,
                course,
                offering: null,
                sessions: [],
                participants: [],
            });
        }

        // Build an array containing the IDs of all offerings.
        // map() takes each offering and returns just its ID.
        // These IDs let us retrieve sessions for all offerings in one query.
        const offeringIds = offerings.map((offering) => offering.id);

        // Fetch sessions belonging to any of those offerings.
        // in() means the column must match one of the supplied IDs.
        // The database initially sorts sessions by date, oldest first.
        const { data: allSessions, error: sessionsError } = await supabase
            .from("course_sessions")
            .select("id, offering_id, session_number, session_date")
            .in("offering_id", offeringIds)
            .order("session_date", { ascending: true });

        if (sessionsError) throw sessionsError;

        // Work out the sessions and current status of each offering.
        // map() creates a new array with one result for each offering.
        const sessionsByOffering = offerings.map((offering) => {
            // Keep only the sessions belonging to this specific offering.
            // allSessions ?? [] uses an empty array if allSessions is null.
            // sort() then orders these sessions by session number.
            const sessions = (allSessions ?? [])
                .filter((session) => session.offering_id === offering.id)
                .sort((a, b) => a.session_number - b.session_number);

            // Get today's date in Oslo so we can compare it with session dates.
            const today = getOsloDate();

            // The first and last sessions determine the overall date range.
            // ?. safely accesses the session date if the session exists.
            const firstDate = sessions[0]?.session_date;
            const lastDate = sessions[sessions.length - 1]?.session_date;

            // TypeScript restricts status to these four possible values.
            let status: "planned" | "active" | "completed" | "unscheduled";

            // No sessions means the offering hasn't been scheduled properly yet.
            if (sessions.length === 0) {
                status = "unscheduled";
            // If the first session is in the future, the course is planned.
            } else if (firstDate > today) {
                status = "planned";
            // If the final session is before today, the course is completed.
            } else if (lastDate < today) {
                status = "completed";
            // Otherwise, today falls within the course's date range.
            } else {
                status = "active";
            }

            // Return the offering together with its sessions and calculated status.
            return { offering, sessions, status };
        });

        // Choose which offering the teacher should see.
        // First preference: an offering that is active today.
        // If none is active, choose the planned offering with the nearest
        // upcoming first session. If neither exists, selected becomes null.
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

        // There may be offerings, but none with sessions that are active
        // or planned. For example, all offerings could be completed or unscheduled.
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

        // Fetch participants enrolled in the selected offering.
        // completion_status tells us whether each participant has completed
        // the course, depending on how that field is managed in the application.
        const { data: enrollments, error: enrollmentsError } =
            await supabase
                .from("course_participants")
                .select("participant_id, completion_status")
                .eq("offering_id", selected.offering.id);

        if (enrollmentsError) throw enrollmentsError;

        // Extract the participant IDs from the enrollment rows.
        // String() converts IDs to strings so values with different types,
        // such as 5 and "5", are treated as the same ID.
        // Set removes duplicate IDs, and ... converts the Set back into an array.
        const participantIds = [
            ...new Set(
                (enrollments ?? []).map((enrollment) =>
                    String(enrollment.participant_id)
                )
            ),
        ];

        // Create a typed array to hold the participant information.
        // phone_number can be null if no phone number is stored.
        let participantRows: {
            id: number | string;
            name: string;
            phone_number: string | null;
        }[] = [];

        // Only query the participants table if there are IDs to look up.
        // This avoids making a pointless database request with no IDs.
        if (participantIds.length > 0) {
            const { data, error: participantsError } = await supabase
                .from("participants")
                .select("id, name, phone_number")
                .in("id", participantIds);

            if (participantsError) throw participantsError;

            // Use the returned rows, or an empty array if data is null.
            participantRows = data ?? [];
        }

        // Extract the IDs of the sessions in the selected offering.
        // We only need attendance for these sessions, not every session
        // belonging to every offering.
        const sessionIds = selected.sessions.map((session) => session.id);

        // Create a typed array to hold the attendance records.
        let attendanceRows: {
            session_id: number | string;
            participant_id: number | string;
            present: boolean;
        }[] = [];

        // Fetch attendance only when we have both sessions and participants.
        // Both in() filters restrict the query to the relevant records.
        if (sessionIds.length > 0 && participantIds.length > 0) {
            const { data, error: attendanceError } = await supabase
                .from("attendance")
                .select("session_id, participant_id, present")
                .in("session_id", sessionIds)
                .in("participant_id", participantIds);

            if (attendanceError) throw attendanceError;

            attendanceRows = data ?? [];
        }

        // Get today's date once for the attendance-status calculations below.
        const today = getOsloDate();

        // Build the final participant objects for the API response.
        const participants = participantRows
            .map((participant) => {
                // Find this participant's enrollment row.
                // String comparisons handle IDs returned as numbers or strings.
                const enrollment = enrollments?.find(
                    (item) =>
                        String(item.participant_id) === String(participant.id)
                );

                // Create one attendance result for each session in the offering.
                const attendance = selected.sessions.map((session) => {
                    // Look for an attendance record matching both this session
                    // and this participant.
                    const record = attendanceRows.find(
                        (row) =>
                            String(row.session_id) === String(session.id) &&
                            String(row.participant_id) ===
                                String(participant.id)
                    );

                    // Restrict the status to these four possible values.
                    let status:
                        | "present"
                        | "absent"
                        | "unmarked"
                        | "upcoming";

                    // A future session is upcoming, even if no attendance
                    // record exists for it yet.
                    if (session.session_date > today) {
                        status = "upcoming";
                    // If the session is today or in the past but no record
                    // exists, attendance has not been marked.
                    } else if (!record) {
                        status = "unmarked";
                    // If a record exists, use its present boolean to determine
                    // whether the participant attended or was absent.
                    } else {
                        status = record.present ? "present" : "absent";
                    }

                    // Return a simplified attendance object for the frontend.
                    return {
                        sessionId: session.id,
                        sessionNumber: session.session_number,
                        sessionDate: session.session_date,
                        status,
                    };
                });

                // Return the participant's details, completion status and
                // attendance history. Count present and absent sessions separately.
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
            // Sort participants alphabetically by name.
            // "nb" tells the browser/runtime to use Norwegian sorting rules.
            .sort((a, b) => a.name.localeCompare(b.name, "nb"));

        // Send the completed report back to the frontend as JSON.
        return NextResponse.json({
            success: true,
            course,
            offering: selected.offering,
            courseStatus: selected.status,
            sessions: selected.sessions,
            participants,
        });
    } catch (error) {
        // Log the technical error on the server to help with debugging.
        // The client receives a more general message instead of raw error details.
        console.error("Teacher attendance report error:", error);

        // Return HTTP 500 to indicate that something went wrong on the server.
        return NextResponse.json(
            {
                success: false,
                error: "Kunne ikke hente oppmøterapporten.",
            },
            { status: 500 }
        );
    }
}
