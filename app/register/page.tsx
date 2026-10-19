"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passordene er ikke like.");
            return;
        }

        if (!/^\d{8}$/.test(phoneNumber)) {
            setError("Telefonnummeret må være nøyaktig 8 sifre.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    email,
                    phone: phoneNumber,
                    password,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                setError(result.error || "Kunne ikke opprette konto.");
                return;
            }

            router.push("/login");
        } catch {
            setError("Kunne ikke kontakte serveren.");
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20";

    const labelClass =
        "mb-2 block text-sm font-medium text-slate-200";

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#071b24] px-4 py-10 text-white">
            {/* Background decoration */}
            <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

            <section className="relative w-full max-w-lg">
                {/* Brand heading */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-300/20 bg-teal-400/10 shadow-lg shadow-teal-950/30">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            className="h-7 w-7 text-teal-300"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <path
                                d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <circle cx="10" cy="7" r="4" />
                            <path
                                d="M20 8v6m3-3h-6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        Opprett konto
                    </h1>
                    <p className="mt-3 text-sm text-slate-400">
                        Fyll inn opplysningene dine for å komme i gang.
                    </p>
                </div>

                {/* Registration card */}
                <div className="rounded-2xl border border-white/10 bg-[#102832]/90 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="name" className={labelClass}>
                                Fullt navn
                            </label>
                            <input
                                type="text"
                                id="name"
                                placeholder="Skriv inn navnet ditt"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoComplete="name"
                                required
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className={labelClass}>
                                E-post
                            </label>
                            <input
                                type="email"
                                id="email"
                                placeholder="navn@eksempel.no"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label htmlFor="phoneNumber" className={labelClass}>
                                Telefonnummer
                            </label>
                            <input
                                type="tel"
                                id="phoneNumber"
                                placeholder="8 sifre"
                                value={phoneNumber}
                                onChange={(e) =>
                                    setPhoneNumber(
                                        e.target.value.replace(/\D/g, "").slice(0, 8)
                                    )
                                }
                                autoComplete="tel"
                                inputMode="numeric"
                                maxLength={8}
                                required
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className={labelClass}>
                                Passord
                            </label>
                            <input
                                type="password"
                                id="password"
                                placeholder="Velg et passord"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                required
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className={labelClass}>
                                Bekreft passord
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                placeholder="Skriv passordet på nytt"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                                required
                                className={inputClass}
                            />
                        </div>

                        {error && (
                            <div
                                role="alert"
                                className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
                            >
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl bg-teal-400 px-4 py-3 font-semibold text-[#06232b] shadow-lg shadow-teal-950/20 transition hover:bg-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-[#102832] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Oppretter konto..." : "Opprett konto"}
                        </button>
                    </form>

                    <div className="my-6 flex items-center gap-4">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-xs text-slate-500">HAR DU ALLEREDE EN KONTO?</span>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <button
                        type="button"
                        onClick={() => router.push("/login")}
                        className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 font-medium text-slate-200 transition hover:border-teal-300/40 hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                    >
                        Tilbake til innlogging
                    </button>
                </div>

                <p className="mt-6 text-center text-xs text-slate-500">
                    Kursbedriften AS
                </p>
            </section>
        </main>
    );
}