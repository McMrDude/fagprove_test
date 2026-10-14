
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
        <div className="flex min-h-screen flex-col items-center justify-center py-2">
            <h1 className="mb-4 text-4xl font-bold">Logg inn</h1>

            <form
                onSubmit={handleSubmit}
                className="flex w-full max-w-sm flex-col gap-4 px-4"
            >
                <input
                    type="email"
                    placeholder="E-post"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border border-gray-300 bg-gray-200 px-3 py-2 text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <input
                    type="password"
                    placeholder="Passord"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border border-gray-300 bg-gray-200 px-3 py-2 text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {error && (
                    <p className="text-sm text-red-600">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? "Logger inn..." : "Logg inn"}
                </button>
            </form>
        </div>
    );
}
