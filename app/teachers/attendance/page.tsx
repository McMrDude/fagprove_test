"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Course = {
  id: number;
  name: string;
};

type Offering = {
  id: number;
  course_id: number;
  created_at: string;
};

type Session = {
  id: number;
  offering_id: number;
  session_number: number;
  session_date: string;
};

type CompletionStatus =
  | "enrolled"
  | "pending_review"
  | "completed"
  | "not_completed";

type Participant = {
  id: number;
  name: string;
  phone_number: string;
  present: boolean | null;
  completion_status: CompletionStatus;
  completion_reviewed_at: string | null;
};

type Overview = {
  course: Course;
  offerings: Offering[];
  sessions: Session[];
};

async function readResponse(response: Response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Noe gikk galt.");
  }

  return data;
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function completionLabel(status: CompletionStatus) {
  switch (status) {
    case "completed":
      return "Bestått";
    case "not_completed":
      return "Ikke bestått";
    case "pending_review":
      return "Trenger vurdering";
    default:
      return "Under gjennomføring";
  }
}

function completionStyle(status: CompletionStatus) {
  switch (status) {
    case "completed":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "not_completed":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "pending_review":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    default:
      return "border-slate-700 bg-slate-800/70 text-slate-400";
  }
}

export default function TeacherAttendancePage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [selectedOfferingId, setSelectedOfferingId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const [savingParticipantId, setSavingParticipantId] = useState<number | null>(
    null
  );
  const [reviewingParticipantId, setReviewingParticipantId] = useState<number | null>(
    null
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load the teacher's assigned course, course rounds and sessions.
  useEffect(() => {
    async function loadOverview() {
      setLoadingOverview(true);
      setError("");

      try {
        const response = await fetch("/api/teachers/attendance");
        const data = await readResponse(response);

        const availableOfferings: Offering[] = data.offerings ?? [];
        const availableSessions: Session[] = data.sessions ?? [];

        setOverview({
          course: data.course,
          offerings: availableOfferings,
          sessions: availableSessions,
        });

        const firstOffering = availableOfferings[0];

        if (firstOffering) {
          setSelectedOfferingId(String(firstOffering.id));

          const firstSession = availableSessions.find(
            (session) => session.offering_id === firstOffering.id
          );

          setSelectedSessionId(
            firstSession ? String(firstSession.id) : ""
          );
        } else {
          setSelectedOfferingId("");
          setSelectedSessionId("");
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Kunne ikke hente kursinformasjon."
        );
      } finally {
        setLoadingOverview(false);
      }
    }

    void loadOverview();
  }, []);

  const course = overview?.course ?? null;
  const offerings = overview?.offerings ?? [];
  const sessions = overview?.sessions ?? [];

  const offeringSessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          String(session.offering_id) === selectedOfferingId
      ),
    [sessions, selectedOfferingId]
  );

  const selectedSession = offeringSessions.find(
    (session) => String(session.id) === selectedSessionId
  );

  // Load participants and attendance for the selected session.
  const loadParticipants = useCallback(async () => {
    if (!selectedOfferingId || !selectedSessionId) {
      setParticipants([]);
      return;
    }

    setLoadingParticipants(true);
    setError("");

    try {
      const params = new URLSearchParams({
        offering_id: selectedOfferingId,
        session_id: selectedSessionId,
      });

      const response = await fetch(
        `/api/teachers/attendance?${params.toString()}`
      );

      const data = await readResponse(response);

      setParticipants(data.participants ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kunne ikke hente deltakerne."
      );
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  }, [selectedOfferingId, selectedSessionId]);

  useEffect(() => {
    void loadParticipants();
  }, [loadParticipants]);

  const presentCount = participants.filter(
    (participant) => participant.present === true
  ).length;

  const absentCount = participants.filter(
    (participant) => participant.present === false
  ).length;

  const unmarkedCount = participants.filter(
    (participant) => participant.present === null
  ).length;

  const pendingCount = participants.filter(
    (participant) => participant.completion_status === "pending_review"
  ).length;

  const completedCount = participants.filter(
    (participant) => participant.completion_status === "completed"
  ).length;

  const failedCount = participants.filter(
    (participant) => participant.completion_status === "not_completed"
  ).length;

  function handleOfferingChange(offeringId: string) {
    setSelectedOfferingId(offeringId);

    const firstSession = sessions.find(
      (session) => String(session.offering_id) === offeringId
    );

    setSelectedSessionId(firstSession ? String(firstSession.id) : "");
    setSuccess("");
    setError("");
  }

  // Save attendance for one participant and session.
  async function saveAttendance(
    participantId: number,
    present: boolean
  ) {
    if (!selectedSessionId || savingParticipantId !== null) return;

    setSavingParticipantId(participantId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/teachers/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: Number(selectedSessionId),
          participant_id: participantId,
          present,
        }),
      });

      await readResponse(response);

      // Refresh from the database so the displayed completion status
      // reflects the API's automatic recalculation as well.
      await loadParticipants();

      setSuccess("Oppmøtet er lagret.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kunne ikke lagre oppmøtet."
      );
    } finally {
      setSavingParticipantId(null);
    }
  }

  // Save the teacher's final pass/fail decision.
  async function reviewCompletion(
    participantId: number,
    status: "completed" | "not_completed"
  ) {
    if (!selectedOfferingId || reviewingParticipantId !== null) return;

    const participant = participants.find(
      (item) => item.id === participantId
    );

    if (
      !participant ||
      participant.completion_status !== "pending_review"
    ) {
      setError("Denne deltakeren er ikke klar for sluttvurdering.");
      return;
    }

    const decision = status === "completed" ? "bestått" : "ikke bestått";

    if (
      !window.confirm(
        `Vil du registrere ${participant.name} som ${decision}?`
      )
    ) {
      return;
    }

    setReviewingParticipantId(participantId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/teachers/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review_completion",
          offering_id: Number(selectedOfferingId),
          participant_id: participantId,
          status,
        }),
      });

      const data = await readResponse(response);

      setParticipants((current) =>
        current.map((item) =>
          item.id === participantId
            ? {
                ...item,
                completion_status: data.completion_status as CompletionStatus,
                completion_reviewed_at: new Date().toISOString(),
              }
            : item
        )
      );

      setSuccess(`${participant.name} er registrert som ${decision}.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kunne ikke lagre sluttvurderingen."
      );
    } finally {
      setReviewingParticipantId(null);
    }
  }

  if (loadingOverview) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <div className="mx-auto max-w-6xl animate-pulse space-y-5">
          <div className="h-4 w-32 rounded bg-slate-800" />
          <div className="h-10 w-72 rounded bg-slate-800" />
          <div className="h-52 rounded-3xl bg-slate-900" />
          <div className="h-72 rounded-3xl bg-slate-900" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-400">
            Lærerområde / Kursoppfølging
          </p>

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Kursoppfølging<span className="text-teal-400">.</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                Registrer oppmøte for hver undervisningsdag, og følg
                deltakernes endelige kursresultat.
              </p>
            </div>

            {course && (
              <div className="w-fit rounded-2xl border border-teal-500/20 bg-teal-500/10 px-5 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-teal-300">
                  Ditt fag
                </p>
                <p className="mt-1 font-semibold text-white">{course.name}</p>
              </div>
            )}
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {success && !error && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-300"
          >
            ✓ {success}
          </div>
        )}

        {!course && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
            <h2 className="text-xl font-semibold">Ingen fag tilordnet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              Kontoen din har ikke et fag tilordnet ennå. Be
              kontoransvarlig om å tilordne faget ditt.
            </p>
          </section>
        )}

        {course && offerings.length === 0 && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <h2 className="text-xl font-semibold">Ingen kursplaner ennå</h2>
            <p className="mt-2 text-sm text-slate-400">
              En kursplan må opprettes før du kan registrere oppmøte.
            </p>
          </section>
        )}

        {course && offerings.length > 0 && (
          <>
            {/* Course and session selectors */}
            <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10 sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  Velg kurs og undervisningsdag
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Velg hvilken kursrunde og dag du vil arbeide med.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="offering"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Kursrunde
                  </label>
                  <select
                    id="offering"
                    value={selectedOfferingId}
                    onChange={(event) =>
                      handleOfferingChange(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                  >
                    {offerings.map((offering, index) => (
                      <option key={offering.id} value={offering.id}>
                        Kursrunde {index + 1} · #{offering.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="session"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Undervisningsdag
                  </label>
                  <select
                    id="session"
                    value={selectedSessionId}
                    onChange={(event) => {
                      setSelectedSessionId(event.target.value);
                      setSuccess("");
                      setError("");
                    }}
                    disabled={offeringSessions.length === 0}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 disabled:opacity-50"
                  >
                    {offeringSessions.length === 0 && (
                      <option value="">Ingen undervisningsdager</option>
                    )}

                    {offeringSessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        Økt {session.session_number} ·{" "}
                        {formatDate(session.session_date)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedSession && (
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-5 w-5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M16 3v4M8 3v4M3 10h18" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold">
                      Økt {selectedSession.session_number} av 5
                    </p>
                    <p className="text-sm text-slate-400">
                      {formatDate(selectedSession.session_date)}
                    </p>
                  </div>
                  <span className="ml-auto rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-400">
                    {participants.length} deltakere
                  </span>
                </div>
              )}
            </section>

            {/* Attendance summary */}
            <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
                <p className="text-sm text-emerald-300">Til stede</p>
                <p className="mt-2 text-3xl font-bold">{presentCount}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Registrert som møtt
                </p>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4">
                <p className="text-sm text-red-300">Fraværende</p>
                <p className="mt-2 text-3xl font-bold">{absentCount}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Registrert som fravær
                </p>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
                <p className="text-sm text-amber-300">Ikke registrert</p>
                <p className="mt-2 text-3xl font-bold">{unmarkedCount}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Venter på oppmøte
                </p>
              </div>
            </section>

            {/* Attendance list */}
            <section className="mb-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/10">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:px-6">
                <div>
                  <h2 className="text-lg font-semibold">Oppmøteliste</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Velg Møtt eller Fravær. Endringene lagres automatisk.
                  </p>
                </div>
                <span className="w-fit rounded-full bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300">
                  {presentCount + absentCount} av {participants.length} registrert
                </span>
              </div>

              {loadingParticipants ? (
                <div className="space-y-3 p-5">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-20 animate-pulse rounded-2xl bg-slate-800/70"
                    />
                  ))}
                </div>
              ) : !selectedSessionId ? (
                <div className="p-10 text-center text-slate-400">
                  Velg en undervisningsdag for å se deltakerlisten.
                </div>
              ) : participants.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="font-medium">Ingen deltakere ennå</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Påmeldte deltakere vises her.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {participants.map((participant) => {
                    const isSaving =
                      savingParticipantId === participant.id;

                    return (
                      <div
                        key={participant.id}
                        className="flex flex-col gap-4 px-5 py-5 transition hover:bg-slate-800/20 sm:flex-row sm:items-center sm:px-6"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 font-semibold text-teal-300">
                            {participant.name
                              .trim()
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">
                              {participant.name}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              {participant.phone_number}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`mr-1 text-xs font-medium ${
                              participant.present === null
                                ? "text-amber-300"
                                : participant.present
                                  ? "text-emerald-300"
                                  : "text-red-300"
                            }`}
                          >
                            {participant.present === null
                              ? "Ikke registrert"
                              : participant.present
                                ? "Til stede"
                                : "Fravær"}
                          </span>

                          <button
                            type="button"
                            disabled={savingParticipantId !== null}
                            onClick={() =>
                              saveAttendance(participant.id, true)
                            }
                            className={`rounded-xl px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                              participant.present === true
                                ? "bg-emerald-400 text-slate-950"
                                : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-400/50 hover:text-emerald-300"
                            }`}
                          >
                            {isSaving ? "Lagrer..." : "✓ Møtt"}
                          </button>

                          <button
                            type="button"
                            disabled={savingParticipantId !== null}
                            onClick={() =>
                              saveAttendance(participant.id, false)
                            }
                            className={`rounded-xl px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                              participant.present === false
                                ? "bg-red-400 text-slate-950"
                                : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-red-400/50 hover:text-red-300"
                            }`}
                          >
                            {isSaving ? "Lagrer..." : "✕ Fravær"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-slate-800 bg-slate-950/50 px-5 py-4 sm:px-6">
                <p className="text-xs leading-5 text-slate-500">
                  Oppmøte gjelder bare den valgte undervisningsdagen.
                  Sluttresultatet for kurset registreres separat nedenfor.
                </p>
              </div>
            </section>

            {/* Final course assessment */}
            <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/10">
              <div className="border-b border-slate-800 p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">
                  Kursresultater
                </p>
                <h2 className="mt-2 text-xl font-bold">Sluttvurdering</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Her ser du hvem som har bestått, hvem som ikke har bestått,
                  og hvem som trenger en endelig vurdering fra deg.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
                    <p className="text-xs text-emerald-300">Bestått</p>
                    <p className="mt-1 text-2xl font-bold">
                      {completedCount}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-3">
                    <p className="text-xs text-red-300">Ikke bestått</p>
                    <p className="mt-1 text-2xl font-bold">{failedCount}</p>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
                    <p className="text-xs text-amber-300">
                      Trenger vurdering
                    </p>
                    <p className="mt-1 text-2xl font-bold">{pendingCount}</p>
                  </div>
                </div>
              </div>

              {participants.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  Ingen deltakere å vise for denne kursrunden.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {participants.map((participant) => {
                    const isReviewing =
                      reviewingParticipantId === participant.id;
                    const isPending =
                      participant.completion_status === "pending_review";

                    return (
                      <div
                        key={participant.id}
                        className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white">
                            {participant.name}
                          </p>
                          <div className="mt-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${completionStyle(
                                participant.completion_status
                              )}`}
                            >
                              {completionLabel(
                                participant.completion_status
                              )}
                            </span>
                          </div>
                        </div>

                        {isPending ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={reviewingParticipantId !== null}
                              onClick={() =>
                                reviewCompletion(
                                  participant.id,
                                  "completed"
                                )
                              }
                              className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-50"
                            >
                              {isReviewing ? "Lagrer..." : "✓ Bestått"}
                            </button>

                            <button
                              type="button"
                              disabled={reviewingParticipantId !== null}
                              onClick={() =>
                                reviewCompletion(
                                  participant.id,
                                  "not_completed"
                                )
                              }
                              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-50"
                            >
                              {isReviewing
                                ? "Lagrer..."
                                : "✕ Ikke bestått"}
                            </button>
                          </div>
                        ) : (
                          <p className="max-w-xs text-sm leading-5 text-slate-500 sm:text-right">
                            {participant.completion_status === "enrolled"
                              ? "Venter på at kurset fullføres."
                              : participant.completion_status === "completed" &&
                                  !participant.completion_reviewed_at
                                ? "Bestått automatisk basert på registrert oppmøte."
                                : "Sluttresultatet er registrert."}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-slate-800 bg-slate-950/50 px-5 py-4 sm:px-6">
                <p className="text-xs leading-5 text-slate-500">
                  Sluttvurdering er tilgjengelig for deltakere som trenger
                  lærerens vurdering etter at alle fem øktene er gjennomført
                  og oppmøte er registrert. Endelige resultater lagres i
                  systemet.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}