"use client";

import { useEffect, useState } from "react";

type Participant = {
    id: number;
    name: string;
    phone_number: string;
};

export default function ParticipantsPage() {
    const [participants, setParticipants] = useState<Participant[]>([]);

    useEffect(() => {
        async function fetchParticipants() {
            const response = await fetch("/api/participants");
            const result = await response.json();
            if (result.success) {
                setParticipants(result.participants);
            }
        }
        fetchParticipants();
    }, []);

    return (
        <div>
            <h1>Deltakere</h1>
            <p>Her kan du se en liste over alle registrerte deltakere.</p>
            <div className="bg-border-200 border p-4 rounded-lg shadow-md mt-4">
                {participants.map((participant) => (
                    <div key={participant.id}>
                        {participant.name} - {participant.phone_number}
                    </div>
                ))}
            </div>
        </div>
    );
}
