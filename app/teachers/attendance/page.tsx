"use client";

import { useEffect, useState } from "react";

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

type Participant = {
id: number;
name: string;
phone_number: string;
present: boolean | null;
};

export default function TeacherAttendancePage() {
    const [course, setCourse] = useState<Course | null>(null);
    const [offerings, setOfferings] = useState<Offering[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);

    const [selectedOfferingId, setSelectedOfferingId] = useState("");
    const [selectedSessionId, setSelectedSessionId] = useState("");

    const [loadingOverview, setLoadingOverview] = useState(true);
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    const [savingParticipantId, setSavingParticipantId] = useState<number | null>(
    null
    );

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Load the teacher's course, offerings, and sessions.
    useEffect(() => {
    async function loadOverview() {
    try {
    setLoadingOverview(true);
    setError("");

    const response = await fetch("/api/teachers/attendance");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Kunne ikke hente kursinformasjon.");
    }

    setCourse(data.course ?? null);
    setOfferings(data.offerings ?? []);
    setSessions(data.sessions ?? []);

    const availableOfferings: Offering[] = data.offerings ?? [];
    const availableSessions: Session[] = data.sessions ?? [];

    if (availableOfferings.length > 0) {
      const firstOffering = availableOfferings[0];
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
        : "Noe gikk galt under lasting."
    );
  } finally {
    setLoadingOverview(false);
  }
}

loadOverview();

}, []);

// Load the participants and their attendance for the selected session.
useEffect(() => {
if (!selectedOfferingId || !selectedSessionId) {
setParticipants([]);
return;
}

let cancelled = false;

async function loadParticipants() {
  try {
    setLoadingParticipants(true);
    setError("");
    setSuccess("");

    const params = new URLSearchParams({
      offering_id: selectedOfferingId,
      session_id: selectedSessionId,
    });

    const response = await fetch(
      `/api/teachers/attendance?${params.toString()}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Kunne ikke hente deltakerne.");
    }

    if (!cancelled) {
      setParticipants(data.participants ?? []);
    }
  } catch (err) {
    if (!cancelled) {
      setError(
        err instanceof Error
          ? err.message
          : "Kunne ikke hente deltakerne."
      );
      setParticipants([]);
    }
  } finally {
    if (!cancelled) {
      setLoadingParticipants(false);
    }
  }
}

loadParticipants();

return () => {
  cancelled = true;
};


}, [selectedOfferingId, selectedSessionId]);

// When the teacher chooses another course offering, select its first session.
function handleOfferingChange(offeringId: string) {
setSelectedOfferingId(offeringId);


const firstSession = sessions.find(
  (session) => session.offering_id === Number(offeringId)
);

setSelectedSessionId(
  firstSession ? String(firstSession.id) : ""
);


}

// Save attendance immediately when the teacher marks a participant.
async function saveAttendance(
participantId: number,
present: boolean
) {
if (!selectedSessionId) return;


try {
  setSavingParticipantId(participantId);
  setError("");
  setSuccess("");

  const response = await fetch("/api/teachers/attendance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: Number(selectedSessionId),
      participant_id: participantId,
      present,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Kunne ikke lagre oppmøtet.");
  }

  setParticipants((current) =>
    current.map((participant) =>
      participant.id === participantId
        ? { ...participant, present }
        : participant
    )
  );

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

const selectedOffering = offerings.find(
(offering) => offering.id === Number(selectedOfferingId)
);

const selectedSession = sessions.find(
(session) => session.id === Number(selectedSessionId)
);

const offeringSessions = sessions.filter(
(session) => session.offering_id === Number(selectedOfferingId)
);

const presentCount = participants.filter(
(participant) => participant.present === true
).length;

const absentCount = participants.filter(
(participant) => participant.present === false
).length;

const unmarkedCount = participants.filter(
(participant) => participant.present === null
).length;

function formatDate(date: string) {
return new Date(`${date}T12:00:00`).toLocaleDateString("nb-NO", {
day: "numeric",
month: "long",
year: "numeric",
});
}

if (loadingOverview) {
return ( <main className="min-h-screen bg-slate-950 p-8 text-slate-100"> <div className="mx-auto max-w-6xl animate-pulse"> <div className="mb-4 h-4 w-32 rounded bg-slate-800" /> <div className="mb-8 h-10 w-72 rounded bg-slate-800" /> <div className="h-64 rounded-3xl border border-slate-800 bg-slate-900" /> </div> </main>
);
}

return ( 
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8"> <div className="mx-auto max-w-6xl">
    {/* Page heading */} 
    <header className="mb-8"> 
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-400">
            Lærerområde / Oppmøte 
        </p>


      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Oppmøte
            <span className="text-teal-400">.</span>
          </h1>

          <p className="mt-2 text-slate-400">
            {course
              ? `Registrer oppmøte for ${course.name}.`
              : "Registrer oppmøte for kursene dine."}
          </p>
        </div>

        {course && (
          <div className="w-fit rounded-2xl border border-teal-500/20 bg-teal-500/10 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-teal-300">
              Ditt fag
            </p>
            <p className="mt-1 font-semibold text-white">
              {course.name}
            </p>
          </div>
        )}
      </div>
    </header>

    {/* Errors and save feedback */}
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
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-2xl">
          !
        </div>
        <h2 className="text-xl font-semibold">Ingen fag tilordnet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
          Kontoen din har ikke et fag tilordnet ennå. Be kontoransvarlig
          om å tilordne faget ditt før du registrerer oppmøte.
        </p>
      </section>
    )}

    {course && offerings.length === 0 && (
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
        <h2 className="text-xl font-semibold">Ingen kursplaner ennå</h2>
        <p className="mt-2 text-slate-400">
          Du må opprette en kursplan før du kan registrere oppmøte.
        </p>
        <a
          href="/course-planning"
          className="mt-5 inline-flex rounded-xl bg-teal-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-teal-300"
        >
          Gå til kursplanlegging →
        </a>
      </section>
    )}

    {course && offerings.length > 0 && (
      <>
        {/* Select course offering and session */}
        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Velg undervisning</h2>
            <p className="mt-1 text-sm text-slate-400">
              Velg kursrunde og hvilken av de fem øktene du skal føre oppmøte for.
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
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
                onChange={(event) =>
                  setSelectedSessionId(event.target.value)
                }
                disabled={offeringSessions.length === 0}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 disabled:cursor-not-allowed disabled:opacity-50"
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
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300">
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
              </span>
              <div>
                <p className="font-semibold">
                  Økt {selectedSession.session_number} av 5
                </p>
                <p className="text-sm text-slate-400">
                  {formatDate(selectedSession.session_date)}
                </p>
              </div>
              <div className="ml-auto rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
                {participants.length}{" "}
                {participants.length === 1 ? "deltaker" : "deltakere"}
              </div>
            </div>
          )}
        </section>

        {/* Attendance statistics */}
        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
            <p className="text-sm text-emerald-300">Til stede</p>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-3xl font-bold">{presentCount}</span>
              <span className="text-xs text-emerald-300/70">Møtt opp</span>
            </div>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4">
            <p className="text-sm text-red-300">Fraværende</p>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-3xl font-bold">{absentCount}</span>
              <span className="text-xs text-red-300/70">Ikke møtt</span>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
            <p className="text-sm text-amber-300">Ikke registrert</p>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-3xl font-bold">{unmarkedCount}</span>
              <span className="text-xs text-amber-300/70">Venter</span>
            </div>
          </div>
        </section>

        {/* Participant list */}
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/10">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="text-lg font-semibold">Deltakerliste</h2>
              <p className="mt-1 text-sm text-slate-400">
                Marker hver deltaker. Endringene lagres automatisk.
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300">
              {participants.length > 0
                ? `${presentCount + absentCount} av ${participants.length} registrert`
                : "Ingen deltakere"}
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
            <div className="p-10 text-center">
              <p className="font-medium">Ingen undervisningsdag valgt</p>
              <p className="mt-2 text-sm text-slate-400">
                Velg en undervisningsdag for å se deltakerlisten.
              </p>
            </div>
          ) : participants.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-xl">
                —
              </div>
              <p className="font-medium">Ingen deltakere på denne kursrunden</p>
              <p className="mt-2 text-sm text-slate-400">
                Når deltakere blir registrert på kursrunden, vises de her.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {participants.map((participant, index) => {
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
                      {participant.present === null ? (
                        <span className="mr-1 text-xs text-amber-300">
                          Ikke registrert
                        </span>
                      ) : participant.present ? (
                        <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Til stede
                        </span>
                      ) : (
                        <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-red-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                          Fravær
                        </span>
                      )}

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() =>
                          saveAttendance(participant.id, true)
                        }
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-50 ${
                          participant.present === true
                            ? "bg-emerald-400 text-slate-950"
                            : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-400/50 hover:bg-emerald-400/10 hover:text-emerald-300"
                        }`}
                      >
                        {isSaving && participant.present !== true
                          ? "Lagrer..."
                          : "✓ Møtt"}
                      </button>

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() =>
                          saveAttendance(participant.id, false)
                        }
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-50 ${
                          participant.present === false
                            ? "bg-red-400 text-slate-950"
                            : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-red-400/50 hover:bg-red-400/10 hover:text-red-300"
                        }`}
                      >
                        {isSaving && participant.present !== false
                          ? "Lagrer..."
                          : "✕ Fravær"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {participants.length > 0 && !loadingParticipants && (
            <div className="border-t border-slate-800 bg-slate-950/50 px-5 py-4 sm:px-6">
              <p className="text-xs leading-5 text-slate-500">
                Oppmøte lagres for den valgte undervisningsdagen. Kontroller
                at alle deltakerne er registrert før du går videre.
              </p>
            </div>
          )}
        </section>
      </>
    )}
  </div>
</main>
    );
}
