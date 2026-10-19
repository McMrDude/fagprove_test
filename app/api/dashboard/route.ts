import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { supabase } from "../supabaseClient";

// Force Next.js to run this route dynamically instead of caching its response.
export const dynamic = "force-dynamic";

// Get today's date in Norway's time zone.
// This prevents the server's own time zone from affecting the date.
function getTodayInNorway() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  // Convert the date parts into an object so we can access year, month and day.
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  // Return the date in YYYY-MM-DD format.
  return `${values.year}-${values.month}-${values.day}`;
}

// GET endpoint used to retrieve the information needed for the dashboard.
export async function GET(request: NextRequest) {
  try {
    // Read the login token from the user's authentication cookie.
    const token = request.cookies.get("auth_token")?.value;
    const secret = process.env.AUTH_SECRET;

    // A token and secret are both required to verify the user's login.
    if (!token || !secret) {
      return NextResponse.json(
        { success: false, error: "Du må logge inn." },
        { status: 401 }
      );
    }

    // Verify the JWT token using the secret from the environment variables.
    // The decoded payload contains information stored when the user logged in.
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    // Get today's date using the Norwegian time zone.
    const today = getTodayInNorway();

    // Fetch data from each table separately.
    // Promise.all runs these database requests concurrently instead of waiting
    // for each request to finish before starting the next one.
    // Selecting the needed columns also avoids fetching unnecessary data.
    const [
      coursesResult,
      offeringsResult,
      sessionsResult,
      enrollmentsResult,
      participantsResult,
      usersResult,
      attendanceResult,
    ] = await Promise.all([
      supabase.from("courses").select("*"),
      supabase.from("course_offerings").select("id, course_id, created_at"),
      supabase
        .from("course_sessions")
        .select("id, course_id, session_number, session_date, offering_id"),
      supabase
        .from("course_participants")
        .select(
          "id, course_id, participant_id, created_at, offering_id, completion_status"
        ),
      supabase.from("participants").select("id, name, phone_number"),
      supabase.from("users").select("id, name, email, role"),
      supabase
        .from("attendance")
        .select("id, session_id, participant_id, present, marked_at"),
    ]);

    // Put all results in one array so we can check whether any request failed.
    const results = [
      coursesResult,
      offeringsResult,
      sessionsResult,
      enrollmentsResult,
      participantsResult,
      usersResult,
      attendanceResult,
    ];

    const failedResult = results.find((result) => result.error);

    // Stop if any database request failed and return an error to the frontend.
    if (failedResult?.error) {
      console.error("Dashboard data error:", failedResult.error);

      return NextResponse.json(
        {
          success: false,
          error: "Kunne ikke hente all informasjon til oversikten.",
        },
        { status: 500 }
      );
    }

    // Use the returned data, or an empty array if a result contains no data.
    const courses = coursesResult.data ?? [];
    const offerings = offeringsResult.data ?? [];
    const sessions = sessionsResult.data ?? [];
    const enrollments = enrollmentsResult.data ?? [];
    const participants = participantsResult.data ?? [];
    const users = usersResult.data ?? [];
    const attendance = attendanceResult.data ?? [];

    // Keep only users whose role is teacher.
    // String() and toLowerCase() make the comparison more tolerant of
    // differences in how the role is stored.
    const teacherUsers = users.filter(
      (user) => String(user.role).toLowerCase() === "teacher"
    );

    // Create Maps so we can find records by ID without repeatedly searching
    // through the full arrays.
    // Each Map uses the record's ID as its key.
    const teacherById = new Map(
      teacherUsers.map((teacher) => [String(teacher.id), teacher])
    );

    const courseById = new Map(
      courses.map((course) => [String(course.id), course])
    );

    const offeringById = new Map(
      offerings.map((offering) => [String(offering.id), offering])
    );

    const participantById = new Map(
      participants.map((participant) => [
        String(participant.id),
        participant,
      ])
    );

    // Group all sessions by their course offering ID.
    // This lets us quickly find the five sessions belonging to an offering.
    const sessionsByOffering = new Map<string, typeof sessions>();

    for (const session of sessions) {
      const key = String(session.offering_id);

      // Get the sessions already stored for this offering, or start an empty
      // array if this is the first session we've encountered for it.
      const existing = sessionsByOffering.get(key) ?? [];

      existing.push(session);
      sessionsByOffering.set(key, existing);
    }

    // Sort each offering's sessions by session number (1, 2, 3, 4, 5).
    for (const offeringSessions of sessionsByOffering.values()) {
      offeringSessions.sort(
        (a, b) => a.session_number - b.session_number
      );
    }

    // Find the date range and number of sessions for a specific offering.
    const offeringDates = (offeringId: number) => {
      const offeringSessions =
        sessionsByOffering.get(String(offeringId)) ?? [];

      // Extract the dates, remove empty values and sort them chronologically.
      // YYYY-MM-DD date strings sort correctly in chronological order.
      const dates = offeringSessions
        .map((session) => session.session_date)
        .filter(Boolean)
        .sort();

      return {
        firstDate: dates[0] ?? null,
        lastDate: dates[dates.length - 1] ?? null,
        sessionCount: offeringSessions.length,
      };
    };

    // Find the teacher assigned to a course.
    // Return null if the course has no teacher or the teacher cannot be found.
    const getTeacherForCourse = (courseId: number) => {
      const course = courseById.get(String(courseId));

      if (!course?.teacher_id) return null;

      return teacherById.get(String(course.teacher_id)) ?? null;
    };

    // Find all sessions scheduled for today and prepare their dashboard data.
    const todaySessions = sessions
      .filter((session) => session.session_date === today)
      .map((session) => {
        const course = courseById.get(String(session.course_id));
        const offering = offeringById.get(String(session.offering_id));
        const teacher = getTeacherForCourse(session.course_id);

        // Count how many participants are enrolled in this specific offering.
        const enrolledCount = enrollments.filter(
          (enrollment) =>
            String(enrollment.offering_id) === String(session.offering_id)
        ).length;

        // Return the information the frontend needs to display today's session.
        return {
          id: session.id,
          session_id: session.id,
          offering_id: session.offering_id,
          session_number: session.session_number,
          course_name: course?.name ?? "Ukjent fag",
          teacher_name: teacher?.name ?? "Ingen lærer tildelt",
          teacher_assigned: Boolean(teacher),
          participant_count: enrolledCount,
          course_id: offering?.course_id ?? session.course_id,
        };
      })
      // Sort today's sessions alphabetically by course name.
      .sort((a, b) => a.course_name.localeCompare(b.course_name, "nb"));

    // Determine the status of every course offering from its session dates.
    // An offering is:
    // - planned if its first session has not started yet
    // - active if it has started but its last session has not passed
    // - completed if its last session was before today
    const offeringStats = offerings.map((offering) => {
      const dates = offeringDates(offering.id);

      let status: "planned" | "active" | "completed" = "planned";

      if (dates.lastDate && dates.lastDate < today) {
        status = "completed";
      } else if (dates.firstDate && dates.firstDate <= today) {
        status = "active";
      }

      return { offering, dates, status };
    });

    // Separate offerings into groups based on their calculated status.
    const plannedOfferings = offeringStats.filter(
      (item) => item.status === "planned"
    );

    const activeOfferings = offeringStats.filter(
      (item) => item.status === "active"
    );

    const completedOfferings = offeringStats.filter(
      (item) => item.status === "completed"
    );

    // Find enrollments where the participant has been marked as having
    // completed the course.
    const completedEnrollments = enrollments.filter(
      (enrollment) => enrollment.completion_status === "completed"
    );

    // A Set stores only unique values.
    // This counts each participant once, even if they completed multiple courses.
    const completedParticipantIds = new Set(
      completedEnrollments.map((enrollment) =>
        String(enrollment.participant_id)
      )
    );

    // Create a completion report for each course.
    const completedCourseReport = courses.map((course) => {
      // Find all offerings belonging to this course.
      const courseOfferingIds = new Set(
        offerings
          .filter(
            (offering) => String(offering.course_id) === String(course.id)
          )
          .map((offering) => String(offering.id))
      );

      // Count completed enrollments that belong to one of those offerings.
      // This counts completed course enrollments, not unique participants.
      const count = completedEnrollments.filter(
        (enrollment) =>
          enrollment.offering_id !== null &&
          courseOfferingIds.has(String(enrollment.offering_id))
      ).length;

      return {
        course_id: course.id,
        course_name: course.name,
        completed_enrollments: count,
      };
    });

    // Combine the overall completion figures and per-course report.
    const completionReport = {
      totalCompletedEnrollments: completedEnrollments.length,
      uniqueParticipants: completedParticipantIds.size,
      byCourse: completedCourseReport,
    };

    // Build a list of participants enrolled in a selected group of offerings.
    // We use this helper for both planned and active offerings.
    const buildParticipantReport = (
      matchingOfferings: typeof offeringStats
    ) => {
      // Create a Set of offering IDs to make checking membership efficient.
      const matchingOfferingIds = new Set(
        matchingOfferings.map((item) => String(item.offering.id))
      );

      // flatMap() lets us return one report entry for each valid enrollment,
      // or an empty array when an enrollment should be excluded.
      const participantReport = enrollments.flatMap((enrollment) => {
        const offeringId = String(enrollment.offering_id);

        // Ignore enrollments that have no offering or are outside our
        // selected group of offerings.
        if (
          enrollment.offering_id === null ||
          !matchingOfferingIds.has(offeringId)
        ) {
          return [];
        }

        // Find the participant and the offering connected to this enrollment.
        const participant = participantById.get(
          String(enrollment.participant_id)
        );

        const offering = offeringById.get(offeringId);

        // Skip this entry if either related record is missing.
        if (!participant || !offering) {
          return [];
        }

        // Find the subject belonging to this offering.
        const course = courseById.get(String(offering.course_id));

        // Return the information needed for the participant report.
        return [{
          participant_id: participant.id,
          participant_name: participant.name,
          phone_number: participant.phone_number,
          course_name: course?.name ?? "Ukjent fag",
          offering_id: offering.id,
        }];
      });

      return participantReport;
    };

    // Build separate participant lists for courses that have not started
    // and courses that are currently running.
    const plannedParticipantReport =
      buildParticipantReport(plannedOfferings);

    const activeParticipantReport =
      buildParticipantReport(activeOfferings);

    // Find participants who are not enrolled in any valid course offering.
    // These participants may need to be assigned to a course.
    const participantsWithoutPlacement = participants.filter(
      (participant) =>
        !enrollments.some(
          (enrollment) =>
            String(enrollment.participant_id) === String(participant.id) &&
            enrollment.offering_id !== null
        )
    );

    // Find offerings whose course has no assigned teacher, or whose assigned
    // teacher cannot be found among the teacher users.
    const offeringsWithoutTeacher = offerings.filter((offering) => {
      const course = courseById.get(String(offering.course_id));

      return !course?.teacher_id ||
        !teacherById.has(String(course.teacher_id));
    });

    // Calculate attendance statistics for each participant.
    // Only attendance records where present is true or false are counted.
    // Records with present === null have not been marked and are ignored.
    const markedAttendanceByParticipant = new Map<
      string,
      { marked: number; absent: number }
    >();

    for (const record of attendance) {
      if (record.present === null) continue;

      const key = String(record.participant_id);

      // Get the current statistics for this participant, or start at zero.
      const current = markedAttendanceByParticipant.get(key) ?? {
        marked: 0,
        absent: 0,
      };

      current.marked += 1;

      // Increase the absence count when the participant was marked absent.
      if (record.present === false) current.absent += 1;

      markedAttendanceByParticipant.set(key, current);
    }

    // Calculate the absence rate for every participant.
    const highAbsenceParticipants = participants
      .map((participant) => {
        const stats = markedAttendanceByParticipant.get(
          String(participant.id)
        ) ?? { marked: 0, absent: 0 };

        return {
          id: participant.id,
          name: participant.name,
          phone_number: participant.phone_number,
          absences: stats.absent,
          marked_sessions: stats.marked,

          // Avoid dividing by zero when no attendance has been recorded.
          absence_rate:
            stats.marked > 0 ? stats.absent / stats.marked : 0,
        };
      })
      // Only flag participants with at least two marked sessions and an
      // absence rate of 30% or higher.
      .filter(
        (participant) =>
          participant.marked_sessions >= 2 &&
          participant.absence_rate >= 0.3
      )
      // Put participants with the highest absence rate first.
      .sort((a, b) => b.absence_rate - a.absence_rate);

    // Prepare a Map containing every participant.
    // We will fill in the latest enrollment date and associated course names.
    const recentParticipantMap = new Map<
      string,
      {
        id: number;
        name: string;
        phone_number: string;
        registered_at: string | null;
        course_names: string[];
      }
    >();

    for (const participant of participants) {
      recentParticipantMap.set(String(participant.id), {
        id: participant.id,
        name: participant.name,
        phone_number: participant.phone_number,
        registered_at: null,
        course_names: [],
      });
    }

    // Sort a copy of the enrollments from newest to oldest.
    // The spread operator creates a copy so the original array is not changed.
    const sortedEnrollments = [...enrollments].sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
    );

    // Go through each enrollment to collect the latest registration date
    // and the course names associated with each participant.
    for (const enrollment of sortedEnrollments) {
      const entry = recentParticipantMap.get(
        String(enrollment.participant_id)
      );

      // Ignore enrollments belonging to a participant that was not found.
      if (!entry) continue;

      // Since enrollments are sorted newest first, the first date found for
      // each participant is their most recent enrollment date.
      if (!entry.registered_at && enrollment.created_at) {
        entry.registered_at = enrollment.created_at;
      }

      // Find the offering, if the enrollment has one.
      const offering = enrollment.offering_id
        ? offeringById.get(String(enrollment.offering_id))
        : null;

      // Find the course through the offering, falling back to course_id
      // stored directly on the enrollment if no offering was found.
      const course = courseById.get(
        String(offering?.course_id ?? enrollment.course_id)
      );

      // Add the course name only if it exists and has not already been added.
      if (course?.name && !entry.course_names.includes(course.name)) {
        entry.course_names.push(course.name);
      }
    }

    // Convert the Map into an array, sort participants by their most recent
    // enrollment date, and keep only the five most recent participants.
    const recentParticipants = [...recentParticipantMap.values()]
      .sort((a, b) =>
        String(b.registered_at ?? "").localeCompare(
          String(a.registered_at ?? "")
        )
      )
      .slice(0, 5)
      .map((participant) => ({
        ...participant,
        course_names: participant.course_names,
      }));

    // Return all dashboard data as JSON for the frontend to use.
    return NextResponse.json({
      completionReport,
      success: true,
      today,

      // Include basic information from the verified login token.
      user: {
        id: payload.id ?? null,
        name: payload.name ?? "Ansatt",
        role: payload.role ?? null,
      },

      // Sessions taking place today and the five most recent participants.
      todayCourses: todaySessions,
      recentParticipants,

      // Counts used to highlight issues that may need attention.
      attention: {
        missingPlacement: participantsWithoutPlacement.length,
        missingTeacher: offeringsWithoutTeacher.length,
        highAbsence: highAbsenceParticipants.length,
      },

      // Details about participants who meet the high-absence threshold.
      highAbsenceParticipants,

      // Overall dashboard statistics.
      stats: {
        participants: participants.length,
        teachers: teacherUsers.length,
        courses: courses.length,
        activeOfferings: activeOfferings.length,
        plannedOfferings: plannedOfferings.length,
        completedOfferings: completedOfferings.length,
      },

      // Participant lists grouped by planned and active offerings.
      participantReports: {
        planned: plannedParticipantReport,
        active: activeParticipantReport,
      },

      // Return offering information in the format expected by the frontend.
      offerings: offeringStats.map(({ offering, dates, status }) => ({
        id: offering.id,
        course_id: offering.course_id,
        course_name:
          courseById.get(String(offering.course_id))?.name ?? "Ukjent fag",
        teacher_name:
          getTeacherForCourse(offering.course_id)?.name ??
          "Ingen lærer tildelt",
        first_date: dates.firstDate,
        last_date: dates.lastDate,
        session_count: dates.sessionCount,
        status,
      })),
    });
  } catch (error) {
    // Log unexpected errors, such as an invalid token or an unexpected
    // failure while processing the dashboard data.
    console.error("Dashboard GET error:", error);

    // Return a generic error message to the frontend.
    return NextResponse.json(
      {
        success: false,
        error: "Noe gikk galt da oversikten skulle lastes.",
      },
      { status: 500 }
    );
  }
}
