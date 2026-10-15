"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AttendanceStatus = "present" | "absent" | "unmarked" | "upcoming";

type SessionAttendance = {
    sessionId: number | string;
    sessionNumber: number;
    sessionDate: string;
    status: AttendanceStatus;
};

type Participant = {
    id: number | string;
    name: string;
    phone_number: string | null;
    completion_status: string | null;
    attendance: SessionAttendance[];
    presentCount: number;
    absenceCount: number;
};

type ReportData = {
    success: boolean;
    course: {
        id: number | string;
        name: string;
    } | null;
    offering: {
        id: number | string;
        course_id: number | string;
        created_at: string;
    } | null;
    courseStatus?: "planned" | "active" | null;
    sessions: {
        id: number | string;
        offering_id: number | string;
        session_number: number;
        session_date: string;
    }[];
    participants: Participant[];
    message?: string;
};

function formatDate(date: string) {
    return new Intl.DateTimeFormat("nb-NO", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`));
}

function statusDetails(status: AttendanceStatus) {
    switch (status) {
        case "present":
            return {
                label: "Møtt",
                className: "border-emerald-200 bg-emerald-50 text-emerald-700",
                symbol: "✓",
            };
        case "absent":
            return {
                label: "Fravær",
                className: "border-red-200 bg-red-50 text-red-700",
                symbol: "×",
            };
        case "upcoming":
            return {
                label: "Kommende",
                className: "border-sky-200 bg-sky-50 text-sky-700",
                symbol: "↗",
            };
        default:
            return {
                label: "Ikke registrert",
                className: "border-slate-200 bg-slate-50 text-slate-600",
                symbol: "—",
            };
    }
}

export default function AttendanceReportPage() {
    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [expandedIds, setExpandedIds] = useState<string[]>([]);

    useEffect(() => {
        async function loadReport() {
            try {
                const response = await fetch(
                    "/api/teachers/attendance-report"
                );
                const result = await response.json();

                if (!response.ok || !result.success) {
                    setError(
                        result.error || "Kunne ikke hente oppmøterapporten."
                    );
                    return;
                }

                setReport(result);
            } catch {
                setError("Kunne ikke kontakte serveren.");
            } finally {
                setLoading(false);
            }
        }

        loadReport();
    }, []);

    const filteredParticipants = useMemo(() => {
        const participants = report?.participants ?? [];
        const query = search.trim().toLocaleLowerCase("nb-NO");

        if (!query) return participants;

        return participants.filter((participant) => {
            return (
                participant.name.toLocaleLowerCase("nb-NO").includes(query) ||
                String(participant.phone_number ?? "")
                    .toLocaleLowerCase("nb-NO")
                    .includes(query) ||
                String(participant.id).includes(query)
            );
        });
    }, [report, search]);

    function toggleParticipant(id: number | string) {
        const key = String(id);

        setExpandedIds((current) =>
            current.includes(key)
                ? current.filter((item) => item !== key)
                : [...current, key]
        );
    }

    function toggleAll() {
        if (filteredParticipants.length === 0) return;

        const visibleIds = filteredParticipants.map((item) =>
            String(item.id)
        );

        const allExpanded = visibleIds.every((id) =>
            expandedIds.includes(id)
        );

        if (allExpanded) {
            setExpandedIds((current) =>
                current.filter((id) => !visibleIds.includes(id))
            );
        } else {
            setExpandedIds((current) => [
                ...new Set([...current, ...visibleIds]),
            ]);
        }
    }

    const allVisibleExpanded =
        filteredParticipants.length > 0 &&
        filteredParticipants.every((participant) =>
            expandedIds.includes(String(participant.id))
        );

    const totalAbsences = filteredParticipants.reduce(
        (total, participant) => total + participant.absenceCount,
        0
    );

    const totalPresent = filteredParticipants.reduce(
        (total, participant) => total + participant.presentCount,
        0
    );

    return (
        <main className="min-h-screen bg-[#F7F7F2] px-5 py-8 text-slate-900 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-7xl space-y-8">
                {/* Header */}
                <header>
                    <Link
                        href="/teachers"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-700"
                    >
                        <span aria-hidden="true">←</span>
                        Tilbake til læreroversikten
                    </Link>

                    <p className="mb-3 mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
                        KURSBEDRIFTEN · RAPPORTER
                    </p>

                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                                Oppmøterapport
                                <span className="text-indigo-600">.</span>
                            </h1>

                            <p className="mt-3 max-w-2xl leading-7 text-slate-500">
                                Finn en deltaker og åpne kortet for å se
                                oppmøtet for hver kursøkt.
                            </p>
                        </div>

                        {report?.course && (
                            <div className="w-fit rounded-2xl border border-white bg-white px-5 py-3 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Ditt fag
                                </p>
                                <p className="mt-1 font-bold">
                                    {report.course.name}
                                </p>
                            </div>
                        )}
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
                    <div className="rounded-3xl border border-slate-200 bg-white p-8">
                        <p className="animate-pulse text-slate-500">
                            Henter deltakere og oppmøte...
                        </p>
                    </div>
                ) : !error && !report?.course ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
                        <div className="text-4xl">📚</div>
                        <h2 className="mt-4 text-xl font-bold">
                            Ingen fag er tildelt
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Det finnes ikke noe fag knyttet til lærerkontoen din.
                        </p>
                    </div>
                ) : !error && !report?.offering ? (
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 sm:p-12">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
                            📅
                        </div>
                        <h2 className="mt-5 text-2xl font-black">
                            Ingen aktivt eller planlagt kurs
                        </h2>
                        <p className="mt-3 max-w-xl leading-7 text-slate-500">
                            Når et kursoppsett med kursøkter er planlagt,
                            vises deltakerne og oppmøtehistorikken deres her.
                        </p>
                        <Link
                            href="/course-planning"
                            className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white transition hover:bg-indigo-700"
                        >
                            Gå til kursplanlegging ↗
                        </Link>
                    </div>
                ) : !error && report ? (
                    <>
                        {/* Summary */}
                        <section className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-3xl border border-slate-200/70 bg-white p-5">
                                <p className="text-sm text-slate-500">
                                    Deltakere funnet
                                </p>
                                <p className="mt-2 text-3xl font-black">
                                    {filteredParticipants.length}
                                    <span className="ml-2 text-base font-medium text-slate-400">
                                        / {report.participants.length}
                                    </span>
                                </p>
                            </div>

                            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                                <p className="text-sm text-emerald-800">
                                    Registrerte oppmøter
                                </p>
                                <p className="mt-2 text-3xl font-black text-emerald-950">
                                    {totalPresent}
                                </p>
                            </div>

                            <div className="rounded-3xl border border-red-100 bg-red-50 p-5">
                                <p className="text-sm text-red-800">
                                    Registrerte fravær
                                </p>
                                <p className="mt-2 text-3xl font-black text-red-950">
                                    {totalAbsences}
                                </p>
                            </div>
                        </section>

                        {/* Search and participant list */}
                        <section>
                            <div className="rounded-3xl border border-slate-200/70 bg-white p-5 sm:p-6">
                                <label
                                    htmlFor="participant-search"
                                    className="mb-2 block text-sm font-bold"
                                >
                                    Søk etter deltaker
                                </label>

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <div className="relative flex-1">
                                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                                            ⌕
                                        </span>
                                        <input
                                            id="participant-search"
                                            type="search"
                                            value={search}
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                            placeholder="Navn, telefonnummer eller deltaker-ID..."
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={toggleAll}
                                        disabled={
                                            filteredParticipants.length === 0
                                        }
                                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {allVisibleExpanded
                                            ? "Lukk alle"
                                            : "Åpne alle"}
                                    </button>
                                </div>

                                <p className="mt-3 text-xs leading-5 text-slate-400">
                                    Søket filtrerer på navn, telefonnummer og
                                    deltaker-ID.
                                </p>
                            </div>

                            <div className="mb-4 mt-7 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                                <div>
                                    <h2 className="text-2xl font-black">
                                        Deltakerliste
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Trykk på en deltaker for å se alle
                                        kursøktene.
                                    </p>
                                </div>

                                <span className="text-sm text-slate-400">
                                    {report.sessions.length} planlagte økter
                                </span>
                            </div>

                            {filteredParticipants.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                                    <div className="text-3xl">🔎</div>
                                    <h3 className="mt-3 font-bold">
                                        Ingen deltakere funnet
                                    </h3>
                                    <p className="mt-2 text-sm text-slate-500">
                                        {report.participants.length === 0
                                            ? "Ingen deltakere er meldt på dette kurset ennå."
                                            : "Prøv et annet navn, telefonnummer eller deltaker-ID."}
                                    </p>
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => setSearch("")}
                                            className="mt-4 font-bold text-indigo-600 hover:text-indigo-800"
                                        >
                                            Nullstill søket
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredParticipants.map((participant) => {
                                        const expanded = expandedIds.includes(
                                            String(participant.id)
                                        );

                                        return (
                                            <article
                                                key={participant.id}
                                                className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm transition hover:border-indigo-100"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleParticipant(
                                                            participant.id
                                                        )
                                                    }
                                                    aria-expanded={expanded}
                                                    className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                                                >
                                                    <div className="flex min-w-0 items-center gap-4">
                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-black text-indigo-700">
                                                            {participant.name
                                                                .trim()
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <h3 className="truncate font-bold">
                                                                {participant.name}
                                                            </h3>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {participant.phone_number ||
                                                                    "Telefonnummer ikke registrert"}
                                                            </p>
                                                            <p className="mt-1 text-xs text-slate-400">
                                                                Deltaker-ID:{" "}
                                                                {participant.id}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                                        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                                            {participant.presentCount} møtt
                                                        </span>
                                                        <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                                                            {participant.absenceCount} fravær
                                                        </span>
                                                        <span
                                                            aria-hidden="true"
                                                            className={`ml-1 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition ${
                                                                expanded
                                                                    ? "rotate-180"
                                                                    : ""
                                                            }`}
                                                        >
                                                            ↓
                                                        </span>
                                                    </div>
                                                </button>

                                                {expanded && (
                                                    <div className="border-t border-slate-100 bg-[#FCFCFA] p-5 sm:p-6">
                                                        <div className="mb-4">
                                                            <h4 className="font-bold">
                                                                Oppmøtehistorikk
                                                            </h4>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                Status for hver
                                                                kursøkt i dette
                                                                kursoppsettet.
                                                            </p>
                                                        </div>

                                                        {participant.attendance.length ===
                                                        0 ? (
                                                            <p className="rounded-xl bg-white p-4 text-sm text-slate-500">
                                                                Ingen kursøkter
                                                                er registrert.
                                                            </p>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {participant.attendance.map(
                                                                    (session) => {
                                                                        const details =
                                                                            statusDetails(
                                                                                session.status
                                                                            );

                                                                        return (
                                                                            <div
                                                                                key={
                                                                                    session.sessionId
                                                                                }
                                                                                className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                                                                            >
                                                                                <div>
                                                                                    <p className="font-semibold">
                                                                                        Økt{" "}
                                                                                        {
                                                                                            session.sessionNumber
                                                                                        }
                                                                                    </p>
                                                                                    <p className="mt-1 text-sm text-slate-500">
                                                                                        {formatDate(
                                                                                            session.sessionDate
                                                                                        )}
                                                                                    </p>
                                                                                </div>

                                                                                <span
                                                                                    className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${details.className}`}
                                                                                >
                                                                                    <span>
                                                                                        {
                                                                                            details.symbol
                                                                                        }
                                                                                    </span>
                                                                                    {
                                                                                        details.label
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    }
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </>
                ) : null}

                <footer className="border-t border-slate-200 pt-5 text-sm text-slate-400">
                    Kursbedriften AS · Oppmøterapport
                </footer>
            </div>
        </main>
    );
}
