"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                setError(result.error || "Kunne ikke logge inn.");
                return;
            }

            // Send the user to the correct homepage based on their role.
            if (result.user.role === "teacher") {
                router.push("/teacher-dashboard");
            } else {
                router.push("/");
            }
        } catch {
            setError("Kunne ikke kontakte serveren.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-white">
            {/* Soft background decoration */}
            <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />

            <section className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl shadow-black/30 sm:p-10">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-400/10 text-teal-300 ring-1 ring-teal-300/20">
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            className="h-7 w-7"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5V6.8A2.8 2.8 0 0 1 6.8 4H20" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 20h13V4" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 9h7M10 13h7M10 17h4" />
                        </svg>
                    </div>

                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-teal-300">
                        Kursbedriften AS
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        Logg inn
                    </h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Logg inn for å fortsette til kontrollpanelet ditt.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div>
                        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
                            E-post
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="navn@eksempel.no"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">
                            Passord
                        </label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Skriv inn passord"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                        />
                    </div>

                    {error && (
                        <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-1 rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Logger inn..." : "Logg inn"}
                    </button>
                </form>

                <div className="my-7 flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-700" />
                    <span className="text-xs uppercase tracking-wider text-slate-500">Ny bruker?</span>
                    <div className="h-px flex-1 bg-slate-700" />
                </div>

                <button
                    type="button"
                    onClick={() => router.push("/register")}
                    className="w-full rounded-xl border border-slate-600 bg-white/5 px-4 py-3 font-semibold text-slate-100 transition hover:border-teal-300/60 hover:bg-teal-300/10 focus:outline-none focus:ring-2 focus:ring-teal-300/50"
                >
                    Opprett konto
                    <span aria-hidden="true" className="ml-2 text-teal-300">→</span>
                </button>

                <p className="mt-6 text-center text-xs leading-5 text-slate-500">
                    Sikker innlogging for Kursbedriften AS
                </p>
            </section>
        </main>
    );
}
