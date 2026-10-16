"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Search,
  Users,
  UserRound,
  Phone,
} from "lucide-react";
import UserDetailOverlay from "../components/UserDetailOverlay";

type Participant = {
  id: number;
  name: string;
  phone_number: string;
};

export default function ParticipantsPage() {
  const router = useRouter();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/participants", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Kunne ikke hente deltakere.");
      }

      setParticipants(result.participants ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Noe gikk galt."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchParticipants();
  }, [fetchParticipants]);

  const filteredParticipants = participants.filter((participant) => {
    const query = search.trim().toLowerCase();

    return (
      participant.name.toLowerCase().includes(query) ||
      participant.phone_number.includes(query) ||
      String(participant.id).includes(query)
    );
  });

  function initials(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <main className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        {/* Back link — intentionally no sidebar */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="group mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-600"
        >
          <ArrowLeft
            size={17}
            className="transition group-hover:-translate-x-0.5"
          />
          Tilbake til oversikten
        </button>

        {/* Page heading */}
        <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-indigo-600">
              Administrasjon
            </p>

            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Deltakere
            </h1>

            <p className="mt-1.5 text-sm text-slate-500">
              Se kontaktinformasjon og administrer registrerte deltakere.
            </p>
          </div>

          <div className="flex w-fit items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Users size={20} />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Registrerte deltakere
              </p>
              <p className="text-xl font-black text-slate-900">
                {loading ? "—" : participants.length}
              </p>
            </div>
          </div>
        </section>

        {/* Participant list */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Deltakeroversikt
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Velg en deltaker for å se eller endre opplysningene.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Søk på navn, telefon eller ID..."
                aria-label="Søk etter deltakere"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50"
              />
            </div>
          </div>

          {/* List summary */}
          {!loading && !error && (
            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5">
              <p className="text-xs font-medium text-slate-500">
                Viser{" "}
                <span className="font-bold text-slate-700">
                  {filteredParticipants.length}
                </span>{" "}
                av {participants.length} deltakere
              </p>
            </div>
          )}

          {error ? (
            <div className="p-6 sm:p-10">
              <div className="mx-auto max-w-md text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <AlertCircle size={21} />
                </span>
                <h3 className="mt-3 text-sm font-extrabold text-slate-900">
                  Kunne ikke hente deltakerne
                </h3>
                <p className="mt-1 text-sm text-slate-500">{error}</p>
                <button
                  type="button"
                  onClick={() => void fetchParticipants()}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                  <RefreshCw size={15} />
                  Prøv igjen
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="flex animate-pulse items-center gap-3 px-4 py-4 sm:px-5"
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-100" />
                  <div className="flex-1">
                    <div className="h-3 w-36 rounded bg-slate-100" />
                    <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
                  </div>
                  <div className="h-3 w-16 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                {search ? <Search size={22} /> : <Users size={22} />}
              </span>
              <h3 className="mt-3 text-sm font-extrabold text-slate-800">
                {search
                  ? "Ingen deltakere funnet"
                  : "Ingen deltakere registrert"}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                {search
                  ? "Prøv et annet navn, telefonnummer eller deltaker-ID."
                  : "Registrerte deltakere vil vises her."}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-3 text-sm font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Nullstill søk
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredParticipants.map((participant) => (
                <button
                  key={participant.id}
                  type="button"
                  onClick={() => setSelectedParticipant(participant)}
                  className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-indigo-50/40 sm:gap-4 sm:px-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-extrabold text-indigo-700 transition group-hover:bg-indigo-100">
                    {initials(participant.name) || <UserRound size={17} />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-800">
                      {participant.name}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <Phone size={12} />
                      {participant.phone_number}
                    </span>
                  </span>

                  <span className="hidden text-xs text-slate-400 sm:block">
                    ID: {participant.id}
                  </span>

                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold text-slate-600 transition group-hover:border-indigo-200 group-hover:bg-white group-hover:text-indigo-700">
                    Administrer
                    <ArrowRight
                      size={14}
                      className="transition group-hover:translate-x-0.5"
                    />
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-400">
          Kursbedriften AS · Administrasjonssystem
        </footer>
      </main>

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
