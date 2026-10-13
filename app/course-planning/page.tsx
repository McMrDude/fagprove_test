
"use client";

import { useEffect, useState } from "react";

type Course = {
  id: number;
  name: string;
};

export default function CoursePlanningPage() {
  const [course, setCourse] = useState<Course | null>(null);
  const [sessionDates, setSessionDates] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadCourse() {
      try {
        const response = await fetch("/api/teachers/course-planning");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Kunne ikke hente faget ditt.");
        }

        setCourse(data.course);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Noe gikk galt ved lasting."
        );
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, []);

  // Generate five weekly dates from the first selected date.
  function handleFirstDateChange(firstDate: string) {
    setMessage("");
    setError("");

    if (!firstDate) {
      setSessionDates(["", "", "", "", ""]);
      return;
    }

    // Use UTC date arithmetic to avoid daylight-saving date shifts.
    const [year, month, day] = firstDate.split("-").map(Number);
    const first = new Date(Date.UTC(year, month - 1, day));

    const generatedDates = Array.from({ length: 5 }, (_, index) => {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + index * 7);
      return date.toISOString().slice(0, 10);
    });

    setSessionDates(generatedDates);
  }

  function handleDateChange(index: number, value: string) {
    setSessionDates((current) =>
      current.map((date, i) => (i === index ? value : date))
    );

    setMessage("");
    setError("");
  }

  function formatDate(date: string) {
    if (!date) return "Velg dato";

    return new Date(`${date}T12:00:00`).toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!course) {
      setError("Fant ikke faget ditt.");
      return;
    }

    if (sessionDates.some((date) => !date)) {
      setError("Du må velge dato for alle fem kursdagene.");
      return;
    }

    if (new Set(sessionDates).size !== 5) {
      setError("Hver kursdag må ha sin egen dato.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/teachers/course-planning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_id: course.id,
          session_dates: sessionDates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke opprette kurset.");
      }

      setMessage(data.message || "Kurset ble opprettet.");
      setSessionDates(["", "", "", "", ""]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Noe gikk galt ved lagring."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-600">
        Laster faget ditt...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
            Lærerportal
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Planlegg et nytt kurs
          </h1>

          <p className="mt-3 max-w-2xl text-slate-600">
            Sett opp fem kursdager for faget ditt. Velg den første datoen,
            så planlegger vi resten automatisk.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {message}
          </div>
        )}

        {!course ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">
              Ingen fag er tilknyttet kontoen din
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Be kontoransvarlig om å tildele deg faget du underviser i.
            </p>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Ditt fag
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">{course.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Faget er bestemt av kontoransvarlig og kan ikke endres her.
                  </p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-700">
                  <span aria-hidden="true">✦</span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold">Kursplan</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Kurset består av fem kursdager, én dag per uke.
                  Du kan endre hver dato etter at planen er generert.
                </p>
              </div>

              <div className="mb-8 rounded-xl bg-indigo-50 p-5">
                <label
                  htmlFor="first-date"
                  className="mb-2 block text-sm font-semibold text-indigo-950"
                >
                  Første kursdag
                </label>

                <input
                  id="first-date"
                  type="date"
                  value={sessionDates[0]}
                  onChange={(event) =>
                    handleFirstDateChange(event.target.value)
                  }
                  required
                  className="w-full rounded-lg border border-indigo-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:max-w-xs"
                />

                <p className="mt-3 text-xs text-indigo-800">
                  De fire neste datoene blir automatisk satt til én uke
                  etter den forrige.
                </p>
              </div>

              <div className="space-y-3">
                {sessionDates.map((date, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700">
                        {index + 1}
                      </div>

                      <div>
                        <p className="font-semibold">
                          Kursdag {index + 1}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatDate(date)}
                        </p>
                      </div>
                    </div>

                    <div className="sm:w-56">
                      <label
                        htmlFor={`session-${index}`}
                        className="mb-1 block text-xs font-medium text-slate-500"
                      >
                        Dato
                      </label>

                      <input
                        id={`session-${index}`}
                        type="date"
                        value={date}
                        onChange={(event) =>
                          handleDateChange(index, event.target.value)
                        }
                        required
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <span>Totalt antall kursdager</span>
                <span className="font-semibold text-slate-900">
                  5 dager · 15 timer
                </span>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setSessionDates(["", "", "", "", ""]);
                  setError("");
                  setMessage("");
                }}
                disabled={saving}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Nullstill datoer
              </button>

              <button
                type="submit"
                disabled={saving || !course}
                className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Lagrer kursplan..." : "Opprett kurs"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}