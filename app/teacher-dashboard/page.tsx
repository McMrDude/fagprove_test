
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";


type TeacherDashboardData = {
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
    nextSession: {
        id: number | string;
        offering_id: number | string;
        session_number: number;
        session_date: string;
    } | null;
    sessions: {
        id: number | string;
        offering_id: number | string;
        session_number: number;
        session_date: string;
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
                    setError(result.error || "Kunne ikke hente læreroversikten.");
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

    const progress = dashboard?.stats.totalSessions
        ? Math.round(
            (dashboard.stats.completedSessions /
                dashboard.stats.totalSessions) * 100
        )
        : 0;


    return (
        <main className="min-h-screen bg-[#F7F7F2] px-5 py-8 text-slate-900 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-7xl space-y-8">

                {/* Welcome header */}
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

                        <p className="mt-3 max-w-xl text-slate-500">
                            {dashboard?.course
                                ? `Du har ansvar for ${dashboard.course.name}. Her finner du kursene, deltakerne og oppmøtet ditt.`
                                : "Her finner du oversikten over kursene, deltakerne og oppmøtet ditt."}
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

                {/* Welcome banner */}
                <section className="relative overflow-hidden rounded-[2rem] bg-indigo-950 p-7 text-white sm:p-10">
                    <div className="relative z-10 max-w-2xl">
                        <p className="text-sm font-semibold text-indigo-300">
                            DITT FAGOMRÅDE
                        </p>

                        <h3 className="mt-2 text-xl font-bold">
                            {loading
                                ? "Henter faget ditt..."
                                : dashboard?.course?.name ?? "Ingen fag tildelt"}
                        </h3>

                        <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
                            God undervisning starter med god oversikt.
                        </h2>

                        <p className="mt-4 leading-7 text-indigo-100/70">
                            Planlegg kursøktene dine, følg opp deltakerne
                            og hold kontroll på hvem som møter opp.
                        </p>

                        <Link
                            href="/course-planning"
                            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-indigo-950 transition hover:bg-indigo-100"
                        >
                            Planlegg kurs
                            <span aria-hidden="true">↗</span>
                        </Link>
                    </div>

                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-12 -top-20 h-72 w-72 rounded-full border-[40px] border-indigo-400/10 sm:right-10"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-24 right-24 h-52 w-52 rounded-full bg-violet-500/20 blur-3xl"
                    />
                </section>

                {/* Live teacher statistics */}
                <section>
                    <div className="mb-4">
                        <h2 className="text-xl font-bold">Kurs akkurat nå</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Oppdatert fra kursdatabasen din.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {/* Participants */}
                        <div className="rounded-3xl border border-slate-200/70 bg-white p-5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-500">
                                    Deltakere
                                </span>
                                <span className="text-xl">👥</span>
                            </div>

                            <p className="mt-4 text-3xl font-black">
                                {loading ? "—" : dashboard?.stats.participants ?? 0}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                                På valgt kurs
                            </p>
                        </div>

                        {/* Sessions */}
                        <div className="rounded-3xl border border-slate-200/70 bg-white p-5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-500">
                                    Kursøkter
                                </span>
                                <span className="text-xl">📚</span>
                            </div>

                            <p className="mt-4 text-3xl font-black">
                                {loading
                                    ? "—"
                                    : `${dashboard?.stats.completedSessions ?? 0}/${dashboard?.stats.totalSessions ?? 0}`}
                            </p>

                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-indigo-600 transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <p className="mt-2 text-xs text-slate-400">
                                Økter med dato som har passert
                            </p>
                        </div>

                        {/* Absences */}
                        <div className="rounded-3xl border border-slate-200/70 bg-white p-5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-500">
                                    Registrert fravær
                                </span>
                                <span className="text-xl">◷</span>
                            </div>

                            <p className="mt-4 text-3xl font-black">
                                {loading ? "—" : dashboard?.stats.absences ?? 0}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                                Fraværsregistreringer på kurset
                            </p>
                        </div>

                        {/* Next session */}
                        <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-indigo-700">
                                    Neste kursøkt
                                </span>
                                <span className="text-xl">📅</span>
                            </div>

                            {loading ? (
                                <p className="mt-4 text-sm text-indigo-800">
                                    Henter dato...
                                </p>
                            ) : dashboard?.nextSession ? (
                                <>
                                    <p className="mt-4 text-lg font-bold text-indigo-950">
                                        {formatDate(dashboard.nextSession.session_date)}
                                    </p>
                                    <p className="mt-1 text-xs text-indigo-700">
                                        Økt {dashboard.nextSession.session_number}
                                    </p>
                                </>
                            ) : (
                                <p className="mt-4 text-sm text-indigo-800">
                                    Ingen kommende økter
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* Overview cards */}
                <section>
                    <div className="mb-4">
                        <h2 className="text-xl font-bold">Din oversikt</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Snarveier til de viktigste læreroppgavene.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <Link
                            href="/course-planning"
                            className="group rounded-3xl border border-slate-200/70 bg-white p-6 transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-950/5"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
                                    📅
                                </div>
                                <span className="text-xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-600">
                                    →
                                </span>
                            </div>

                            <h3 className="mt-5 text-lg font-bold">
                                Kursplanlegging
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Sett opp kurs og planlegg de fem ukentlige øktene.
                            </p>
                        </Link>

                        <Link
                            href="/teachers/attendance"
                            className="group rounded-3xl border border-slate-200/70 bg-white p-6 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-950/5"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                                    ✓
                                </div>
                                <span className="text-xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600">
                                    →
                                </span>
                            </div>

                            <h3 className="mt-5 text-lg font-bold">
                                Oppmøteregistrering
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Se deltakerlisten og registrer hvem som møter opp.
                            </p>
                        </Link>

                        <div className="rounded-3xl border border-slate-200/70 bg-white p-6">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl">
                                👥
                            </div>

                            <h3 className="mt-5 text-lg font-bold">
                                Deltakeroppfølging
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Følg med på deltakernes oppmøte gjennom kursperioden.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Bottom information panel */}
                <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                    <div className="rounded-3xl border border-slate-200/70 bg-white p-6 sm:p-8">
                        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                            Arbeidsflyt
                        </p>

                        <h2 className="mt-2 text-2xl font-bold">
                            Fra plan til oppmøte.
                        </h2>

                        <div className="mt-6 space-y-5">
                            <div className="flex gap-4">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-700">
                                    01
                                </span>
                                <div>
                                    <h3 className="font-semibold">Planlegg</h3>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Opprett kurset og sett datoene for undervisningen.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 font-bold text-emerald-700">
                                    02
                                </span>
                                <div>
                                    <h3 className="font-semibold">Registrer oppmøte</h3>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Marker hvem som deltok på hver kursøkt.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 font-bold text-amber-700">
                                    03
                                </span>
                                <div>
                                    <h3 className="font-semibold">Følg opp</h3>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Bruk oppmøteinformasjonen til å holde oversikt over fravær.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col justify-between rounded-3xl bg-[#E8E7FF] p-6 sm:p-8">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-700">
                                Husk
                            </p>

                            <h2 className="mt-3 text-2xl font-bold">
                                Hver kursøkt teller.
                            </h2>

                            <p className="mt-3 text-sm leading-7 text-indigo-950/70">
                                Registrer oppmøtet etter hver undervisningsdag
                                for å holde fraværsoversikten oppdatert.
                            </p>
                        </div>

                        <Link
                            href="/teachers/attendance"
                            className="mt-8 inline-flex w-fit items-center gap-2 font-bold text-indigo-800 hover:text-indigo-950"
                        >
                            Gå til oppmøte
                            <span aria-hidden="true">↗</span>
                        </Link>
                    </div>
                </section>

                <footer className="border-t border-slate-200 pt-5 text-sm text-slate-400">
                    Kursbedriften AS · Lærerportal
                </footer>
            </div>
        </main>
    );
}
