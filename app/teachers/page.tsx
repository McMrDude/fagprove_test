
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  role?: string;
}

interface Course {
  id: number;
  name: string;
  teacher_id: number | null;
}

interface AssignmentData {
  courses: Course[];
  teachers: {
    id: string | number;
    name: string;
    email: string;
  }[];
}


export default function TeachersPage() {
  const router = useRouter();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [teachersResponse, assignmentResponse] = await Promise.all([
        fetch("/api/teachers"),
        fetch("/api/admin/course-teachers"),
      ]);

      const teachersData = await teachersResponse.json();
      const assignmentData: AssignmentData & {
        success?: boolean;
        error?: string;
      } = await assignmentResponse.json();

      if (!teachersResponse.ok) {
        throw new Error("Kunne ikke hente lærerne.");
      }

      if (!assignmentResponse.ok || !assignmentData.success) {
        throw new Error(
          assignmentData.error || "Kunne ikke hente fagfordelingen."
        );
      }

      // Make sure every teacher ID is a string.
      setTeachers(
        Array.isArray(teachersData)
          ? teachersData.map((teacher: Teacher) => ({
              ...teacher,
              id: String(teacher.id),
            }))
          : []
      );

      setCourses(assignmentData.courses ?? []);

      // Build the dropdown selections from the saved database assignments.
      const selected: Record<string, string> = {};

      for (const course of assignmentData.courses ?? []) {
        if (course.teacher_id !== null) {
          selected[String(course.teacher_id)] = String(course.id);
        }
      }

      setAssignments(selected);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "En uventet feil oppstod."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateAssignment(teacherId: string, courseId: string) {
    setAssignments((current) => {
      const next = { ...current };

      // Remove this teacher's previous selection.
      delete next[teacherId];

      if (courseId) {
        // Keep a subject selected for only one teacher.
        for (const [otherTeacherId, selectedCourse] of Object.entries(next)) {
          if (selectedCourse === courseId) {
            delete next[otherTeacherId];
          }
        }

        next[teacherId] = courseId;
      }

      return next;
    });

    setMessage("");
    setError("");
  }

  async function sendAssignment(courseId: number, teacherId: number | null) {
    const response = await fetch("/api/admin/course-teachers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course_id: courseId,
        teacher_id: teacherId,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Kunne ikke lagre fagfordelingen.");
    }
  }

  async function saveAllAssignments() {
    setSavingAll(true);
    setError("");
    setMessage("");

    try {
      // Find which teacher is supposed to receive each subject.
      const desiredTeacherByCourse = new Map<string, string>();

      for (const [teacherId, courseId] of Object.entries(assignments)) {
        if (courseId) {
          desiredTeacherByCourse.set(courseId, teacherId);
        }
      }

      // First remove outdated assignments. This allows a teacher to change
      // subjects without being temporarily assigned to two subjects.
      for (const course of courses) {
        if (course.teacher_id === null) {
          continue;
        }

        const desiredTeacherId =
          desiredTeacherByCourse.get(String(course.id)) ?? null;

        if (String(course.teacher_id) !== String(desiredTeacherId ?? "")) {
          await sendAssignment(course.id, null);
        }
      }

      // Then save every selected teacher-subject assignment.
      for (const [teacherId, courseId] of Object.entries(assignments)) {
        if (!courseId) {
          continue;
        }

        await sendAssignment(Number(courseId), Number(teacherId));
      }

      await loadData();
      setMessage("Alle fagfordelingene ble lagret.");
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Noen endringer kan allerede være lagret. Oppdater siden for å kontrollere lagret status.`
          : "Kunne ikke lagre alle fagfordelingene."
      );
    } finally {
      setSavingAll(false);
    }
  }

  function getAssignedCourseName(teacherId: string) {
    const courseId = assignments[teacherId];

    return courses.find(
      (course) => String(course.id) === courseId
    )?.name;
  }

  function hasChanged(teacherId: string) {
    const savedCourse = courses.find(
      (course) => String(course.teacher_id) === String(teacherId)
    );

    const savedCourseId = savedCourse ? String(savedCourse.id) : "";
    const selectedCourseId = assignments[teacherId] ?? "";

    return savedCourseId !== selectedCourseId;
  }

  const hasChanges = teachers.some((teacher) => hasChanged(teacher.id));

  const assignedCount = Object.values(assignments).filter(Boolean).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-600"
        >
          <span className="transition group-hover:-translate-x-0.5">←</span>
          Tilbake til oversikten
        </button>
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
              Administrasjon
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Lærere
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
              Administrer læreroversikten og fordel fagene mellom lærerne.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading || savingAll}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <span aria-hidden="true">↻</span>
            Oppdater
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Registrerte lærere
            </p>
            <p className="mt-2 text-3xl font-bold">
              {loading ? "—" : teachers.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Fag med lærer
            </p>
            <p className="mt-2 text-3xl font-bold">
              {loading ? "—" : assignedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Fag uten lærer
            </p>
            <p className="mt-2 text-3xl font-bold">
              {loading
                ? "—"
                : Math.max(courses.length - assignedCount, 0)}
            </p>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            {message}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold">Læreroversikt</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Velg fag for hver lærer. Lagre alle endringene når du er ferdig.
              </p>
            </div>

            <button
              type="button"
              onClick={saveAllAssignments}
              disabled={loading || savingAll || !hasChanges}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {savingAll ? (
                <>
                  <span
                    className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden="true"
                  />
                  Lagrer alle ...
                </>
              ) : hasChanges ? (
                "Lagre alle endringer"
              ) : (
                "Alle endringer lagret"
              )}
            </button>
          </div>

          {loading ? (
            <div className="px-6 py-14 text-center text-sm text-slate-500">
              Henter lærere og fag ...
            </div>
          ) : teachers.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <span className="text-xl" aria-hidden="true">♙</span>
              </div>
              <p className="mt-4 font-semibold">Ingen lærere funnet</p>
              <p className="mt-1 text-sm text-slate-500">
                Lærerne vises her når de er registrert.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {teachers.map((teacher) => {
                const assignedCourse = getAssignedCourseName(teacher.id);
                const currentCourse = courses.find(
                  (course) =>
                    String(course.teacher_id) === String(teacher.id)
                );
                const changed = hasChanged(teacher.id);

                // Show status based on the current dropdown selection.
                const hasSelectedCourse = Boolean(assignments[teacher.id]);

                return (
                  <article
                    key={teacher.id}
                    className="grid gap-5 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)] lg:items-center"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {teacher.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">{teacher.name}</h3>
                        <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">
                          {teacher.email}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {teacher.phone_number || "Ikke oppgitt telefonnummer"}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {hasSelectedCourse ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              Har tildelt fag
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                              <span className="size-1.5 rounded-full bg-amber-500" />
                              Ikke tildelt fag
                            </span>
                          )}

                          {changed && (
                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                              Ikke lagret
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label
                        htmlFor={`course-${teacher.id}`}
                        className="block text-sm font-medium"
                      >
                        Ansvarlig fag
                      </label>

                      <select
                        id={`course-${teacher.id}`}
                        value={assignments[teacher.id] ?? ""}
                        disabled={savingAll}
                        onChange={(event) =>
                          updateAssignment(teacher.id, event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-950"
                      >
                        <option value="">Ikke tildelt</option>
                        {courses.map((course) => {
                          const assignedToAnother =
                            course.teacher_id !== null &&
                            String(course.teacher_id) !== String(teacher.id);

                          const selectedByAnother = Object.entries(
                            assignments
                          ).some(
                            ([otherTeacherId, selectedCourse]) =>
                              otherTeacherId !== String(teacher.id) &&
                              selectedCourse === String(course.id)
                          );

                          return (
                            <option
                              key={course.id}
                              value={String(course.id)}
                              disabled={assignedToAnother || selectedByAnother}
                            >
                              {course.name}
                              {assignedToAnother || selectedByAnother
                                ? " (allerede tildelt)"
                                : ""}
                            </option>
                          );
                        })}
                      </select>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {assignedCourse
                          ? `Valgt fag: ${assignedCourse}`
                          : "Velg et fag for denne læreren."}
                        {currentCourse && !hasSelectedCourse
                          ? " Det lagrede faget fjernes når du lagrer."
                          : ""}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}