"use client";

import { useEffect, useState } from "react";

type Course = {
  id: number;
  name: string;
  teacher_id: number | null;
};

type Offering = {
  id: number;
  course_id: number;
  created_at: string;
  courses: Course | Course[] | null;
};

export default function CoursePlanningPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [courseId, setCourseId] = useState("");
  const [dates, setDates] = useState(["", "", "", "", ""]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [coursesResponse, offeringsResponse] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/course-offerings"),
      ]);

      const coursesData = await coursesResponse.json();
      const offeringsData = await offeringsResponse.json();

      if (!coursesResponse.ok || !coursesData.success) {
        throw new Error(coursesData.error || "Kunne ikke hente fag.");
      }

      if (!offeringsResponse.ok || !offeringsData.success) {
        throw new Error(
          offeringsData.error || "Kunne ikke hente planlagte kurs."
        );
      }

      setCourses(coursesData.courses ?? []);
      setOfferings(offeringsData.offerings ?? []);
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

  function updateDate(index: number, value: string) {
    setDates((current) =>
      current.map((date, i) => (i === index ? value : date))
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!courseId) {
      setError("Velg et fag først.");
      return;
    }

    if (dates.some((date) => !date)) {
      setError("Fyll inn datoen for alle fem leksjonene.");
      return;
    }

    const timestamps = dates.map((date) => new Date(date).getTime());

    if (timestamps.some(Number.isNaN)) {
      setError("En eller flere datoer er ugyldige.");
      return;
    }

    if (new Set(dates).size !== 5) {
      setError("Alle fem leksjonene må ha forskjellige datoer.");
      return;
    }

    if (timestamps.some((date, index) => index > 0 && date <= timestamps[index - 1])) {
      setError("Datoene må være i kronologisk rekkefølge.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/course-offerings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_id: Number(courseId),
          session_dates: dates,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Kunne ikke planlegge kurset.");
      }

      setMessage("Kurset ble planlagt!");
      setDates(["", "", "", "", ""]);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "En uventet feil oppstod."
      );
    } finally {
      setSaving(false);
    }
  }

  function getCourseName(offering: Offering) {
    const course = Array.isArray(offering.courses)
      ? offering.courses[0]
      : offering.courses;

    return course?.name ?? "Ukjent fag";
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
            Kursadministrasjon
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Planlegg kurs
          </h1>
          <p className="mt-2 text-slate-600">
            Opprett et kurs og legg inn datoene for alle fem leksjonene.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold">Nytt kurs</h2>
          <p className="mt-1 text-sm text-slate-500">
            Hvert kurs består av fem leksjoner fordelt over fem uker.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div>
              <label
                htmlFor="course"
                className="mb-2 block text-sm font-medium"
              >
                Fag
              </label>
              <select
                id="course"
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                required
              >
                <option value="">Velg fag</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Dato for leksjonene</h3>
              <p className="mt-1 text-sm text-slate-500">
                Velg fem datoer i riktig rekkefølge, én per uke.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {dates.map((date, index) => (
                  <div key={index}>
                    <label
                      htmlFor={`session-${index + 1}`}
                      className="mb-2 block text-sm font-medium"
                    >
                      Leksjon {index + 1}
                    </label>
                    <input
                      id={`session-${index + 1}`}
                      type="date"
                      value={date}
                      onChange={(event) =>
                        updateDate(index, event.target.value)
                      }
                      min={index > 0 ? dates[index - 1] || undefined : undefined}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      required
                    />
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || loading}
              className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Lagrer..." : "Planlegg kurs"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Planlagte kurs</h2>
              <p className="mt-1 text-sm text-slate-500">
                Kurs som allerede er opprettet.
              </p>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
              {offerings.length} kurs
            </span>
          </div>

          {loading ? (
            <p className="py-8 text-sm text-slate-500">Henter kurs...</p>
          ) : offerings.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
              <p className="font-medium">Ingen planlagte kurs ennå</p>
              <p className="mt-1 text-sm text-slate-500">
                Opprett ditt første kurs i skjemaet over.
              </p>
            </div>
          ) : (
            <div className="mt-5 divide-y divide-slate-100">
              {offerings.map((offering) => (
                <div
                  key={offering.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div>
                    <p className="font-semibold">{getCourseName(offering)}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Kurs #{offering.id}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Planlagt
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}