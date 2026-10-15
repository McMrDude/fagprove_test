"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Participant = {
    id: number | string;
    name: string;
    phone_number: string;
    completion_status: string | null;
};

type Session = {
    id: number | string;
    offering_id: number | string;
    session_number: number;
    session_date: string;
};

type TeacherDashboardData = {
    success: boolean;
    teacher: {
        id: number | string;
        name: string;
        email: string;
    };
    course: {
        id: number | string;
        name: string;
    } | null;
    offering: {
        id: number | string;
        course_id: number | string;
        created_at: string;
    } | null;
    courseStatus: "planned" | "active" | null;
    nextSession: Session | null;
    sessions: Session[];
    participants: Participant[];
    previousOfferings?: {
        id: number | string;
        status: string;
    }[];
    stats: {
        participants: number;
        completedSessions: number;
        totalSessions: number;
        absences: number;
    };
};

export default function TeacherDashboardPage() {
    const [dashboard, setDashboard] =
        useState<TeacherDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadDashboard() {
            try {
                const response = await fetch("/api/teacher-dashboard");
                const result = await response.json();

                if (!response.ok || !result.success) {
                    setError(
                        result.error || "Kunne ikke hente læreroversikten."
                    );
                    return;
                }

                setDashboard(result);
            } catch {
                setError("Kunne ikke kontakte serveren.");
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, []);

    const formatDate = (date: string) =>
        new Intl.DateTimeFormat("nb-NO", {
            dateStyle: "long",
            timeZone: "UTC",
        }).format(new Date(`${date}T12:00:00Z`));

    const hasCourse = Boolean(dashboard?.offering);
    const isPlanned = dashboard?.courseStatus === "planned";
    const isActive = dashboard?.courseStatus === "active";

    const progress = dashboard?.stats.totalSessions
        ? Math.round(
              (dashboard.stats.completedSessions /
                  dashboard.stats.totalSessions) *
                  100
          )
        : 0;

    const completionLabel = (status: string | null) => {
        switch (status) {
            case "completed":
                return "Bestått";
            case "not_completed":
                return "Ikke bestått";
            case "pending_review":
                return "Venter på vurdering";
            case "enrolled":
                return "Pågår";
            default:
                return "Pågår";
        }
    };

    return (
        <main className="min-h-screen bg-[#F7F7F2] px-5 py-8 text-slate-900 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-7xl space-y-8">
                {/* Header */}
                <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                    <div>
                        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
                            KURSBEDRIFTEN · LÆRERPORTAL
                        </p>

                        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                            {loading
                                ? "Laster oversikten..."
                                : `Hei, ${dashboard?.teacher.name ?? "lærer"}`}
                            <span className="text-indigo-600">.</span>
                        </h1>

                        <p className="mt-3 max-w-2xl text-slate-500">
                            {dashboard?.course
                                ? `Du underviser i ${dashboard.course.name}. Her finner du deltakerne, oppmøtet og kursrapportene dine.`
                                : "Her finner du verktøyene du trenger for å planlegge og følge opp undervisningen."}
                        </p>
                    </div>

                    <div className="w-fit rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                            Din arbeidsflate
                        </p>
                        <p className="mt-1 font-bold">Læreroversikt</p>
                    </div>
                </header>

                {error && (
                    <div
                        role="alert"
                        className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}

                {loading ? (
                    <section className="rounded-[2rem] border border-slate-200 bg-white p-10">
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 w-32 rounded bg-slate-200" />
                            <div className="h-8 w-2/3 rounded bg-slate-200" />
                            <div className="h-4 w-1/2 rounded bg-slate-100" />
                            <div className="h-24 rounded-2xl bg-slate-100" />
                        </div>
                    </section>
                ) : !error && !hasCourse ? (
                    /* EMPTY STATE: No planned or active offering */
                    <section className="relative overflow-hidden rounded-[2rem] bg-indigo-950 p-7 text-white sm:p-12">
                        <div className="relative z-10 max-w-2xl">
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-indigo-100">
                                <span className="h-2 w-2 rounded-full bg-amber-300" />
                                Klar for neste kurs
                            </span>

                            <h2 className="mt-6 text-3xl font-black leading-tight sm:text-5xl">
                                Tid for å planlegge neste kurs.
                            </h2>

                            <p className="mt-4 max-w-xl text-base leading-7 text-indigo-100/75">
                                {dashboard?.course
                                    ? `Det er ingen planlagte eller aktive kursoppsett i ${dashboard.course.name} akkurat nå. Opprett neste kursoppsett for å komme i gang.`
                                    : "Du har ikke fått tildelt et fag ennå. Når faget ditt er satt opp, kan du planlegge kurs og følge opp deltakerne her."}
                            </p>

                            {dashboard?.course && (
                                <Link
                                    href="/course-planning"
                                    className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-4 font-bold text-indigo-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-100"
                                >
                                    <span className="text-xl">＋</span>
                                    Planlegg et nytt kurs
                                    <span aria-hidden="true">↗</span>
                                </Link>
                            )}

                            <div className="mt-8 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-sm text-indigo-200">
                                        Ditt fag
                                    </p>
                                    <p className="mt-1 font-bold">
                                        {dashboard?.course?.name ??
                                            "Ikke tildelt"}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-sm text-indigo-200">
                                        Kursstatus
                                    </p>
                                    <p className="mt-1 font-bold">
                                        Ingen aktivt kurs
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-sm text-indigo-200">
                                        Neste steg
                                    </p>
                                    <p className="mt-1 font-bold">
                                        Lag en kursplan
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full border-[45px] border-indigo-400/10"
                        />
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-24 right-1/4 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl"
                        />
                    </section>
                ) : !error && dashboard ? (
                    /* ACTIVE OR PLANNED COURSE */
                    <>
                        {/* Current course hero */}
                        <section className="relative overflow-hidden rounded-[2rem] bg-indigo-950 p-7 text-white sm:p-10">
                            <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
                                <div className="max-w-2xl">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium">
                                        <span
                                            className={`h-2 w-2 rounded-full ${
                                                isActive
                                                    ? "bg-emerald-400"
                                                    : "bg-sky-300"
                                            }`}
                                        />
                                        {isActive
                                            ? "Kurs pågår"
                                            : "Kurs planlagt"}
                                    </span>

                                    <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">
                                        DITT FAGOMRÅDE
                                    </p>

                                    <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                                        {dashboard.course?.name}
                                    </h2>

                                    <p className="mt-4 max-w-xl leading-7 text-indigo-100/75">
                                        {isActive
                                            ? "Deltakerne og oppfølgingen står i fokus. Hold oppmøtet oppdatert og følg med på kursprogresjonen."
                                            : "Kurset er planlagt. Sjekk deltakerlisten og gjør klart før første undervisningsøkt."}
                                    </p>

                                    {dashboard.nextSession && (
                                        <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                                            <span className="text-2xl">
                                                📅
                                            </span>
                                            <div>
                                                <p className="text-xs text-indigo-200">
                                                    {isActive
                                                        ? "Neste kursøkt"
                                                        : "Første kommende økt"}
                                                </p>
                                                <p className="mt-0.5 font-bold">
                                                    {formatDate(
                                                        dashboard.nextSession
                                                            .session_date
                                                    )}
                                                    <span className="font-normal text-indigo-200">
                                                        {" "}
                                                        · Økt{" "}
                                                        {
                                                            dashboard
                                                                .nextSession
                                                                .session_number
                                                        }
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Link
                                    href="/course-planning"
                                    className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-indigo-950 transition hover:bg-indigo-100"
                                >
                                    Kursplanlegging
                                    <span aria-hidden="true">↗</span>
                                </Link>
                            </div>

                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full border-[45px] border-indigo-400/10"
                            />
                        </section>

                        {/* Participants: front and center */}
                        <section id="deltakere">
                            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                                <div>
                                    <p className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-600">
                                        KURSET DITT
                                    </p>
                                    <h2 className="mt-1 text-2xl font-black">
                                        Deltakerne dine
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Alle deltakerne som er påmeldt dette
                                        kursoppsettet.
                                    </p>
                                </div>

                                <Link
                                    href="/teachers/attendance"
                                    className="inline-flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                                >
                                    Registrer oppmøte
                                    <span aria-hidden="true">↗</span>
                                </Link>
                            </div>

                            <div className="mb-5 grid gap-4 sm:grid-cols-3">
                                <div className="rounded-2xl border border-slate-200/70 bg-white p-5">
                                    <p className="text-sm text-slate-500">
                                        Påmeldte deltakere
                                    </p>
                                    <p className="mt-2 text-3xl font-black">
                                        {dashboard.stats.participants}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200/70 bg-white p-5">
                                    <p className="text-sm text-slate-500">
                                        Gjennomførte kursøkter
                                    </p>
                                    <p className="mt-2 text-3xl font-black">
                                        {dashboard.stats.completedSessions}
                                        <span className="text-lg font-semibold text-slate-400">
                                            {" "}
                                            / {dashboard.stats.totalSessions}
                                        </span>
                                    </p>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-indigo-600 transition-all"
                                            style={{
                                                width: `${progress}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                                    <p className="text-sm text-amber-800">
                                        Registrert fravær
                                    </p>
                                    <p className="mt-2 text-3xl font-black text-amber-950">
                                        {dashboard.stats.absences}
                                    </p>
                                    <p className="mt-1 text-xs text-amber-800/70">
                                        Fraværsregistreringer i dette kurset
                                    </p>
                                </div>
                            </div>

                            {dashboard.participants.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
                                        👥
                                    </div>
                                    <h3 className="mt-4 text-lg font-bold">
                                        Ingen påmeldte ennå
                                    </h3>
                                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                        Deltakerne vises her når de er meldt på
                                        kursoppsettet av kontoransatt.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    {dashboard.participants.map(
                                        (participant) => (
                                            <Link
                                                key={participant.id}
                                                href="/teachers/attendance"
                                                className="group rounded-3xl border border-slate-200/70 bg-white p-5 transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-950/5"
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-bold text-indigo-700">
                                                        {participant.name
                                                            .trim()
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="truncate font-bold">
                                                            {participant.name}
                                                        </h3>
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            Deltaker-ID:{" "}
                                                            {participant.id}
                                                        </p>
                                                    </div>

                                                    <span className="text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-600">
                                                        →
                                                    </span>
                                                </div>

                                                <div className="mt-5 border-t border-slate-100 pt-4">
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                        Telefon
                                                    </p>
                                                    <p className="mt-1 font-medium text-slate-700">
                                                        {participant.phone_number ||
                                                            "Ikke registrert"}
                                                    </p>
                                                </div>

                                                <div className="mt-4 flex items-center justify-between gap-2">
                                                    <span className="text-sm text-slate-500">
                                                        Kursstatus
                                                    </span>
                                                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                                        {completionLabel(
                                                            participant.completion_status
                                                        )}
                                                    </span>
                                                </div>
                                            </Link>
                                        )
                                    )}
                                </div>
                            )}
                        </section>

                        {/* Reports and shortcuts */}
                        <section>
                            <div className="mb-5">
                                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-600">
                                    OPPFØLGING
                                </p>
                                <h2 className="mt-1 text-2xl font-black">
                                    Rapporter og verktøy
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Snarveier til oppmøte og oppfølging av kurset.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                <Link
                                    href="/teachers/attendance"
                                    className="group rounded-3xl border border-slate-200/70 bg-white p-6 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                                            ✓
                                        </div>
                                        <span className="text-xl text-slate-300 group-hover:text-emerald-600">
                                            →
                                        </span>
                                    </div>
                                    <h3 className="mt-5 text-lg font-bold">
                                        Oppmøte
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Se deltakerne og registrer møtt eller fravær
                                        for hver kursøkt.
                                    </p>
                                </Link>

                                <Link
                                    href="/teachers/attendance-report"
                                    className="group rounded-3xl border border-slate-200/70 bg-white p-6 transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-2xl">
                                            📊
                                        </div>
                                        <span className="text-xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600">
                                            →
                                        </span>
                                    </div>

                                    <h3 className="mt-5 text-lg font-bold">
                                        Oppmøterapport
                                    </h3>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Søk etter deltakere og se oppmøte og fravær for alle kursøktene.
                                    </p>
                                </Link>

                                <Link
                                    href="/course-planning"
                                    className="group rounded-3xl border border-slate-200/70 bg-white p-6 transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
                                        📅
                                    </div>
                                    <h3 className="mt-5 text-lg font-bold">
                                        Kursplanlegging
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Se og planlegg datoene for de fem
                                        kursøktene.
                                    </p>
                                </Link>
                            </div>
                        </section>
                    </>
                ) : null}

                <footer className="border-t border-slate-200 pt-5 text-sm text-slate-400">
                    Kursbedriften AS · Lærerportal
                </footer>
            </div>
        </main>
    );
}
