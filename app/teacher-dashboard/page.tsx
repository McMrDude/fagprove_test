
"use client";

import Link from "next/link";

export default function TeacherDashboardPage() {
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
                            Ditt klasserom<span className="text-indigo-600">.</span>
                        </h1>

                        <p className="mt-3 max-w-xl text-slate-500">
                            Alt du trenger for å holde oversikt over kursene,
                            deltakerne og oppmøtet ditt.
                        </p>
                    </div>

                    <div className="w-fit rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                            Din arbeidsflate
                        </p>
                        <p className="mt-1 font-bold">Læreroversikt</p>
                    </div>
                </header>

                {/* Welcome banner */}
                <section className="relative overflow-hidden rounded-[2rem] bg-indigo-950 p-7 text-white sm:p-10">
                    <div className="relative z-10 max-w-2xl">
                        <p className="text-sm font-semibold text-indigo-300">
                            KLAR FOR NESTE KURS?
                        </p>

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
