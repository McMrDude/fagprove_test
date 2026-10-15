
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface Course {
  id: number;
  name: string;
}

interface Enrollment {
  participantId: number;
  participantName: string;
  phoneNumber: string;
  courseId: number;
  courseName: string;
  offeringId: number | null;
  offeringCreatedAt: string | null;
  firstSessionDate: string | null;
  lastSessionDate: string | null;
  completionStatus: string;
}

interface ReportResponse {
  courses: Course[];
  enrollments: Enrollment[];
  error?: string;
}

function formatDate(date: string | null) {
  if (!date) return "Ingen dato registrert";

  return new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString(
    "nb-NO",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Gjennomført";
    case "not_completed":
      return "Ikke bestått";
    case "pending_review":
      return "Venter på vurdering";
    default:
      return "Påmeldt";
  }
}

function statusStyle(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "not_completed":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "pending_review":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    default:
      return "bg-blue-50 text-blue-700 ring-blue-200";
  }
}

export default function EnrollmentReportPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [expandedParticipants, setExpandedParticipants] = useState<number[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/admin/enrollments?courseId=${encodeURIComponent(selectedCourse)}`,
          { cache: "no-store" }
        );

        const data: ReportResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Kunne ikke hente påmeldingsrapporten.");
        }

        setCourses(data.courses ?? []);
        setEnrollments(data.enrollments ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Noe gikk galt da rapporten skulle hentes."
        );
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [selectedCourse]);

  const filteredEnrollments = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("no");

    if (!normalizedSearch) return enrollments;

    return enrollments.filter((enrollment) => {
      return (
        String(enrollment.participantId).includes(normalizedSearch) ||
        enrollment.participantName
          .toLocaleLowerCase("no")
          .includes(normalizedSearch) ||
        enrollment.phoneNumber
          .toLocaleLowerCase("no")
          .includes(normalizedSearch)
      );
    });
  }, [enrollments, search]);

  const participants = useMemo(() => {
    const participantMap = new Map<
      number,
      {
        id: number;
        name: string;
        phone: string;
        enrollments: Enrollment[];
      }
    >();

    for (const enrollment of filteredEnrollments) {
      const existing = participantMap.get(enrollment.participantId);

      if (existing) {
        existing.enrollments.push(enrollment);
      } else {
        participantMap.set(enrollment.participantId, {
          id: enrollment.participantId,
          name: enrollment.participantName,
          phone: enrollment.phoneNumber,
          enrollments: [enrollment],
        });
      }
    }

    return Array.from(participantMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "no")
    );
  }, [filteredEnrollments]);

  const totalEnrollments = enrollments.length;
  const uniqueParticipants = new Set(
    enrollments.map((enrollment) => enrollment.participantId)
  ).size;

  function toggleParticipant(id: number) {
    setExpandedParticipants((current) =>
      current.includes(id)
        ? current.filter((participantId) => participantId !== id)
        : [...current, id]
    );
  }

  function toggleAll() {
    if (expandedParticipants.length === participants.length) {
      setExpandedParticipants([]);
    } else {
      setExpandedParticipants(participants.map((participant) => participant.id));
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-4 py-8 text-slate-900 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-violet-700"
        >
          <span aria-hidden="true">←</span>
          Tilbake til oversikten
        </Link>

        <header className="mt-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-600">
              Kursbedriften · Administrasjon
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Påmeldingsrapport
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Finn deltakere, se hvilke kurs de er påmeldt til, og undersøk
              påmeldinger for bestemte kursrunder.
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
            📋
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Deltakere i resultatet
            </p>
            <p className="mt-2 text-3xl font-black">
              {loading ? "—" : participants.length}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Unike deltakere etter filtrering
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Påmeldinger i resultatet
            </p>
            <p className="mt-2 text-3xl font-black">
              {loading ? "—" : filteredEnrollments.length}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Én deltaker kan ha flere påmeldinger
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-5 md:grid-cols-[1fr_280px]">
            <div>
              <label
                htmlFor="participant-search"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Søk etter deltaker
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                  ⌕
                </span>

                <input
                  id="participant-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Navn, telefonnummer eller deltaker-ID..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="course-filter"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Filtrer på kurs
              </label>

              <select
                id="course-filter"
                value={selectedCourse}
                onChange={(event) => setSelectedCourse(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              >
                <option value="all">Alle kurs</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              {loading
                ? "Henter påmeldinger..."
                : `${participants.length} deltaker${participants.length === 1 ? "" : "e"} funnet`}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleAll}
                disabled={loading || participants.length === 0}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {participants.length > 0 &&
                expandedParticipants.length === participants.length
                  ? "Lukk alle"
                  : "Utvid alle"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedCourse("all");
                  setExpandedParticipants([]);
                }}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
              >
                Nullstill
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600" />
            <p className="mt-4 text-sm text-slate-500">
              Henter påmeldingsrapporten...
            </p>
          </div>
        ) : !error && participants.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="text-4xl">🔎</div>
            <h2 className="mt-4 text-lg font-bold">
              Ingen deltakere funnet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Prøv et annet søkeord eller velg et annet kurs. Det kan også
              hende at ingen deltakere er påmeldt til kurset ennå.
            </p>
          </div>
        ) : (
          <section className="mt-6 space-y-3">
            {participants.map((participant) => {
              const expanded = expandedParticipants.includes(participant.id);

              return (
                <article
                  key={participant.id}
                  className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:border-violet-200"
                >
                  <button
                    type="button"
                    onClick={() => toggleParticipant(participant.id)}
                    aria-expanded={expanded}
                    className="flex w-full items-center gap-4 p-5 text-left sm:p-6"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-lg font-black text-violet-700">
                      {participant.name.trim().charAt(0).toUpperCase() || "?"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-bold text-slate-900">
                        {participant.name}
                      </h2>

                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 sm:text-sm">
                        <span>ID: {participant.id}</span>
                        <span>·</span>
                        <span>{participant.phone || "Ingen telefon registrert"}</span>
                      </div>

                      <p className="mt-2 text-xs font-semibold text-violet-700">
                        {participant.enrollments.length} påmelding
                        {participant.enrollments.length === 1 ? "" : "er"}
                      </p>
                    </div>

                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition ${
                        expanded ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    >
                      ⌄
                    </span>
                  </button>

                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                        Påmeldte kurs
                      </h3>

                      <div className="space-y-3">
                        {participant.enrollments.map((enrollment, index) => (
                          <div
                            key={`${enrollment.courseId}-${enrollment.offeringId ?? "none"}-${index}`}
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                              <div>
                                <h4 className="font-bold text-slate-900">
                                  {enrollment.courseName}
                                </h4>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  {enrollment.offeringId !== null
                                    ? `Kursrunde #${enrollment.offeringId}`
                                    : "Ingen kursrunde knyttet til påmeldingen"}
                                </p>
                              </div>

                              <span
                                className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${statusStyle(enrollment.completionStatus)}`}
                              >
                                {statusLabel(enrollment.completionStatus)}
                              </span>
                            </div>

                            {enrollment.offeringId !== null && (
                              <div className="mt-4 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                                <div>
                                  <p className="text-xs text-slate-400">
                                    Første kursøkt
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-slate-700">
                                    {formatDate(enrollment.firstSessionDate)}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs text-slate-400">
                                    Siste kursøkt
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-slate-700">
                                    {formatDate(enrollment.lastSessionDate)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {!loading && !error && (
          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Rapporten viser påmeldinger fra databasen. Den endrer ikke
            deltakerinformasjon eller kursregistreringer.
          </p>
        )}
      </div>
    </main>
  );
}
