
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { supabase } from "../supabaseClient";

export const dynamic = "force-dynamic";

function getTodayInNorway() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function GET(request: NextRequest) {
  try {
    // Require a valid login cookie.
    const token = request.cookies.get("auth_token")?.value;
    const secret = process.env.AUTH_SECRET;

    if (!token || !secret) {
      return NextResponse.json(
        { success: false, error: "Du må logge inn." },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    const today = getTodayInNorway();

    // Fetch each table separately to avoid relying on Supabase relationships.
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
        .select("id, course_id, participant_id, created_at, offering_id, completion_status"),
      supabase.from("participants").select("id, name, phone_number"),
      supabase.from("users").select("id, name, email, role"),
      supabase
        .from("attendance")
        .select("id, session_id, participant_id, present, marked_at"),
    ]);

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

    const courses = coursesResult.data ?? [];
    const offerings = offeringsResult.data ?? [];
    const sessions = sessionsResult.data ?? [];
    const enrollments = enrollmentsResult.data ?? [];
    const participants = participantsResult.data ?? [];
    const users = usersResult.data ?? [];
    const attendance = attendanceResult.data ?? [];

    const teacherUsers = users.filter(
      (user) => String(user.role).toLowerCase() === "teacher"
    );

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

    const sessionsByOffering = new Map<string, typeof sessions>();

    for (const session of sessions) {
      const key = String(session.offering_id);
      const existing = sessionsByOffering.get(key) ?? [];
      existing.push(session);
      sessionsByOffering.set(key, existing);
    }

    for (const offeringSessions of sessionsByOffering.values()) {
      offeringSessions.sort(
        (a, b) => a.session_number - b.session_number
      );
    }

    const offeringDates = (offeringId: number) => {
      const offeringSessions =
        sessionsByOffering.get(String(offeringId)) ?? [];

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

    const getTeacherForCourse = (courseId: number) => {
      const course = courseById.get(String(courseId));
      if (!course?.teacher_id) return null;

      return teacherById.get(String(course.teacher_id)) ?? null;
    };

    const todaySessions = sessions
      .filter((session) => session.session_date === today)
      .map((session) => {
        const course = courseById.get(String(session.course_id));
        const offering = offeringById.get(String(session.offering_id));
        const teacher = getTeacherForCourse(session.course_id);

        const enrolledCount = enrollments.filter(
          (enrollment) =>
            String(enrollment.offering_id) === String(session.offering_id)
        ).length;

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
      .sort((a, b) => a.course_name.localeCompare(b.course_name, "nb"));

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

    const plannedOfferings = offeringStats.filter(
      (item) => item.status === "planned"
    );
    const activeOfferings = offeringStats.filter(
      (item) => item.status === "active"
    );
    const completedOfferings = offeringStats.filter(
      (item) => item.status === "completed"
    );

    
    // Count confirmed course completions.
    const completedEnrollments = enrollments.filter(
      (enrollment) => enrollment.completion_status === "completed"
    );

    const completedParticipantIds = new Set(
      completedEnrollments.map((enrollment) =>
        String(enrollment.participant_id)
      )
    );

    const completedCourseReport = courses.map((course) => {
      const courseOfferingIds = new Set(
        offerings
          .filter((offering) => String(offering.course_id) === String(course.id))
          .map((offering) => String(offering.id))
      );

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

    const completionReport = {
      totalCompletedEnrollments: completedEnrollments.length,
      uniqueParticipants: completedParticipantIds.size,
      byCourse: completedCourseReport,
    };

    
    // Build participant reports for planned and active courses.
    const buildParticipantReport = (
      matchingOfferings: typeof offeringStats
    ) => {
      const matchingOfferingIds = new Set(
        matchingOfferings.map((item) => String(item.offering.id))
      );

      return enrollments.flatMap((enrollment) => {
        const offeringId = String(enrollment.offering_id);

        if (
          enrollment.offering_id === null ||
          !matchingOfferingIds.has(offeringId)
        ) {
          return [];
        }

        const participant = participantById.get(
          String(enrollment.participant_id)
        );

        const offering = offeringById.get(offeringId);

        if (!participant || !offering) {
          return [];
        }

        const course = courseById.get(String(offering.course_id));

        return [{
          participant_id: participant.id,
          participant_name: participant.name,
          phone_number: participant.phone_number,
          course_name: course?.name ?? "Ukjent fag",
          offering_id: offering.id,
        }];
      });
    };

    const plannedParticipantReport =
      buildParticipantReport(plannedOfferings);

    const activeParticipantReport =
      buildParticipantReport(activeOfferings);



    // A participant needs course placement if they have no valid offering enrollment.
    const participantsWithoutPlacement = participants.filter(
      (participant) =>
        !enrollments.some(
          (enrollment) =>
            String(enrollment.participant_id) === String(participant.id) &&
            enrollment.offering_id !== null
        )
    );

    const offeringsWithoutTeacher = offerings.filter((offering) => {
      const course = courseById.get(String(offering.course_id));
      return !course?.teacher_id ||
        !teacherById.has(String(course.teacher_id));
    });

    // Calculate absence rate using sessions where attendance has been marked.
    const markedAttendanceByParticipant = new Map<
      string,
      { marked: number; absent: number }
    >();

    for (const record of attendance) {
      if (record.present === null) continue;

      const key = String(record.participant_id);
      const current = markedAttendanceByParticipant.get(key) ?? {
        marked: 0,
        absent: 0,
      };

      current.marked += 1;
      if (record.present === false) current.absent += 1;

      markedAttendanceByParticipant.set(key, current);
    }

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
          absence_rate:
            stats.marked > 0 ? stats.absent / stats.marked : 0,
        };
      })
      .filter(
        (participant) =>
          participant.marked_sessions >= 2 &&
          participant.absence_rate >= 0.3
      )
      .sort((a, b) => b.absence_rate - a.absence_rate);

    // Recent registrations are determined from enrollment creation timestamps.
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

    const sortedEnrollments = [...enrollments].sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
    );

    for (const enrollment of sortedEnrollments) {
      const entry = recentParticipantMap.get(
        String(enrollment.participant_id)
      );
      if (!entry) continue;

      if (!entry.registered_at && enrollment.created_at) {
        entry.registered_at = enrollment.created_at;
      }

      const offering = enrollment.offering_id
        ? offeringById.get(String(enrollment.offering_id))
        : null;

      const course = courseById.get(
        String(offering?.course_id ?? enrollment.course_id)
      );

      if (course?.name && !entry.course_names.includes(course.name)) {
        entry.course_names.push(course.name);
      }
    }

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

    return NextResponse.json({
      success: true,
      today,
      user: {
        id: payload.id ?? null,
        name: payload.name ?? "Ansatt",
        role: payload.role ?? null,
      },
      todayCourses: todaySessions,
      recentParticipants,
      attention: {
        missingPlacement: participantsWithoutPlacement.length,
        missingTeacher: offeringsWithoutTeacher.length,
        highAbsence: highAbsenceParticipants.length,
      },
      highAbsenceParticipants,
      stats: {
        participants: participants.length,
        teachers: teacherUsers.length,
        courses: courses.length,
        activeOfferings: activeOfferings.length,
        plannedOfferings: plannedOfferings.length,
        completedOfferings: completedOfferings.length,
      },
      participantReports: {
        planned: plannedParticipantReport,
        active: activeParticipantReport,
      },
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
        completionReport,
      })),
    });
  } catch (error) {
    console.error("Dashboard GET error:", error);

    return NextResponse.json(
      { success: false, error: "Noe gikk galt da oversikten skulle lastes." },
      { status: 500 }
    );
  }
}