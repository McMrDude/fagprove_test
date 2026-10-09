
"use client";

import { useEffect, useState } from "react";
import UserDetailOverlay from "../components/UserDetailOverlay";

type Participant = {
    id: number;
    name: string;
    phone_number: string;
};

export default function ParticipantsPage() {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [selectedParticipant, setSelectedParticipant] =
        useState<Participant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function fetchParticipants() {
        try {
            const response = await fetch("/api/participants");
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Kunne ikke hente deltakere.");
            }

            setParticipants(result.participants);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Noe gikk galt."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchParticipants();
    }, []);

    return (
        <div className="p-4 sm:p-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Deltakere
            </h1>

            <p className="mt-1 text-slate-600 dark:text-slate-400">
                Her kan du se og administrere alle registrerte deltakere.
            </p>

            {error && (
                <p className="mt-4 rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </p>
            )}

            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                {loading ? (
                    <p className="p-4 text-slate-500">
                        Henter deltakere...
                    </p>
                ) : participants.length === 0 ? (
                    <p className="p-4 text-slate-500">
                        Ingen deltakere er registrert ennå.
                    </p>
                ) : (
                    participants.map((participant) => (
                        <button
                            key={participant.id}
                            type="button"
                            onClick={() =>
                                setSelectedParticipant(participant)
                            }
                            className="flex w-full items-center justify-between gap-4 border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 last:border-b-0 dark:border-slate-800 dark:hover:bg-slate-900"
                        >
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">
                                    {participant.name}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    {participant.phone_number}
                                </p>
                            </div>

                            <span className="text-sm text-blue-600 dark:text-blue-400">
                                Administrer →
                            </span>
                        </button>
                    ))
                )}
            </div>

            {selectedParticipant && (
                <UserDetailOverlay
                    key={selectedParticipant.id}
                    id={selectedParticipant.id}
                    name={selectedParticipant.name}
                    phone={selectedParticipant.phone_number}
                    onClose={() => setSelectedParticipant(null)}
                    onSaved={async () => {
                        await fetchParticipants();
                        setSelectedParticipant(null);
                    }}
                />
            )}
        </div>
    );
}