
"use client";

// "use client" tells Next.js this component needs to run in the browser.
// We need it because this page uses state, effects, button clicks, and search input.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Icons used throughout the participant page.
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

// This is another component in our project.
// It displays a selected participant's details and allows them to be managed.
import UserDetailOverlay from "../components/UserDetailOverlay";

// A TypeScript type describes what information each participant should have.
// Each participant returned by our API should contain these three properties.
type Participant = {
  id: number;
  name: string;
  phone_number: string;
};

export default function ParticipantsPage() {
  // useRouter lets us navigate between pages.
  // For example, router.push("/") takes the user back to the dashboard.
  const router = useRouter();

  // useState stores information that can change while the page is open.
  // When we update state with its setter function, React updates the UI.

  // Stores all participants fetched from the API.
  // Participant[] means this state is an array of Participant objects.
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Stores the participant currently selected by the user.
  // null means no participant is selected.
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);

  // Stores whatever the user types into the search field.
  const [search, setSearch] = useState("");

  // Tracks whether the participant list is currently loading.
  // It starts as true because the page has not fetched the data yet.
  const [loading, setLoading] = useState(true);

  // Stores an error message if fetching participants fails.
  const [error, setError] = useState("");

  // This function fetches the participant list from our API.
  // async allows us to use await when waiting for the server's response.
  const fetchParticipants = useCallback(async () => {
    // Start the loading state and clear any previous error.
    setLoading(true);
    setError("");

    try {
      // Send a GET request to our participant API.
      // cache: "no-store" asks Next.js not to reuse a cached response.
      const response = await fetch("/api/participants", {
        cache: "no-store",
      });

      // Convert the response body from JSON into a JavaScript object.
      const result = await response.json();

      // response.ok checks the HTTP status.
      // result.success checks the success flag returned by our own API.
      // If either check fails, throw an error to enter the catch block.
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Kunne ikke hente deltakere.");
      }

      // Save the participants from the API response in React state.
      // The page will re-render and display the fetched participants.
      // ?? [] means use an empty array if result.participants is null or undefined.
      setParticipants(result.participants ?? []);
    } catch (err) {
      // If the request fails, store a readable error message.
      // instanceof Error checks whether err is a normal JavaScript Error.
      setError(
        err instanceof Error ? err.message : "Noe gikk galt."
      );
    } finally {
      // finally runs whether the request succeeded or failed.
      // Stop showing the loading state when the request has finished.
      setLoading(false);
    }
  }, []);
  // The empty dependency array means this callback does not rely on
  // changing values from the component, so React can reuse the function.

  // useEffect runs after React renders the component.
  // This effect fetches participants when the page first opens.
  useEffect(() => {
    // fetchParticipants is async and returns a Promise.
    // void indicates that we intentionally do not await that Promise here.
    void fetchParticipants();
  }, [fetchParticipants]);
  // The effect runs when fetchParticipants changes.
  // Because useCallback keeps it stable here, it normally runs on initial load.

  // FILTERING THE PARTICIPANTS
  //
  // filter() creates a new array containing only participants that match
  // the search. It does not delete or modify the original participants array.
  const filteredParticipants = participants.filter((participant) => {
    // trim() removes spaces at the beginning and end.
    // toLowerCase() makes name searching case-insensitive.
    const query = search.trim().toLowerCase();

    // Keep a participant if the search matches any of these:
    // 1. Their name.
    // 2. Their phone number.
    // 3. Their participant ID.
    return (
      participant.name.toLowerCase().includes(query) ||
      participant.phone_number.includes(query) ||
      String(participant.id).includes(query)
    );
    // String() converts the numeric ID to text so includes() can search it.
    // An empty query matches every participant, so all participants are shown.
  });

  // Turns a person's name into initials for the small avatar.
  // Example: "Kari Nordmann" becomes "KN".
  function initials(name: string) {
    return name
      .trim() // Remove spaces from the beginning and end.
      .split(/\s+/) // Split the name wherever one or more spaces occur.
      .slice(0, 2) // Keep only the first two name parts.
      .map((part) => part[0]?.toUpperCase() ?? "")
      // Take the first character of each part and make it uppercase.
      // ?. avoids an error if the character does not exist.
      // ?? "" supplies an empty string if the result is null or undefined.
      .join(""); // Combine the initials into one string.
  }

  // Everything below is JSX, which describes what the user sees on the page.
  // JavaScript expressions can be inserted into JSX using curly braces {}.
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <main className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">

        {/* BACK LINK: takes the user back to the main dashboard. */}
        {/* There is intentionally no sidebar on this page. */}
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

        {/* PAGE HEADING: the title, description, and participant total. */}
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

          {/* This card shows the total number of registered participants. */}
          <div className="flex w-fit items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Users size={20} />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Registrerte deltakere
              </p>
              <p className="text-xl font-black text-slate-900">
                {/* Show a dash until the participant request finishes. */}
                {loading ? "—" : participants.length}
              </p>
            </div>
          </div>
        </section>

        {/* PARTICIPANT LIST: contains search, loading, error, and result states. */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* LIST HEADER: heading on the left and search field on the right. */}
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Deltakeroversikt
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Velg en deltaker for å se eller endre opplysningene.
              </p>
            </div>

            {/* SEARCH FIELD */}
            <div className="relative w-full sm:max-w-xs">
              {/* The search icon is positioned inside the input visually. */}
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                // Update the search state whenever the user types.
                // filteredParticipants is recalculated using the new value.
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Søk på navn, telefon eller ID..."
                aria-label="Søk etter deltakere"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50"
              />
            </div>
          </div>

          {/* LIST SUMMARY: shows how many results match the current search. */}
          {/* Do not display this summary while loading or when an error exists. */}
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

          {/* CONDITIONAL RENDERING
              The page chooses which content to show based on the current state:
              1. An error message.
              2. Loading placeholders.
              3. An empty-state message.
              4. The filtered participant list. */}

          {error ? (
            // CASE 1: the API request failed.
            <div className="p-6 sm:p-10">
              <div className="mx-auto max-w-md text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <AlertCircle size={21} />
                </span>
                <h3 className="mt-3 text-sm font-extrabold text-slate-900">
                  Kunne ikke hente deltakerne
                </h3>
                <p className="mt-1 text-sm text-slate-500">{error}</p>

                {/* Let the user retry the failed API request. */}
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
            // CASE 2: data is still being fetched.
            // Display placeholder rows instead of an empty-looking page.
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
            // CASE 3: loading finished, but no participants match the search.
            <div className="px-5 py-12 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                {/* Use a search icon when searching, otherwise use a users icon. */}
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

              {/* Only offer to reset the search if a search was entered. */}
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
            // CASE 4: there are participants to display.
            // map() creates one clickable row for each filtered participant.
            <div className="divide-y divide-slate-100">
              {filteredParticipants.map((participant) => (
                <button
                  key={participant.id}
                  type="button"
                  // Store the clicked participant in state.
                  // This causes the detail overlay to appear below.
                  onClick={() => setSelectedParticipant(participant)}
                  className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-indigo-50/40 sm:gap-4 sm:px-5"
                >
                  {/* AVATAR: show initials or a fallback person icon. */}
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-extrabold text-indigo-700 transition group-hover:bg-indigo-100">
                    {initials(participant.name) || <UserRound size={17} />}
                  </span>

                  {/* PARTICIPANT DETAILS: name and phone number. */}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-800">
                      {participant.name}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <Phone size={12} />
                      {participant.phone_number}
                    </span>
                  </span>

                  {/* Show the participant ID on larger screens. */}
                  <span className="hidden text-xs text-slate-400 sm:block">
                    ID: {participant.id}
                  </span>

                  {/* This label indicates that the row can be clicked. */}
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

        {/* FOOTER: small text at the bottom of the page. */}
        <footer className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-400">
          Kursbedriften AS · Administrasjonssystem
        </footer>
      </main>

      {/* PARTICIPANT DETAIL OVERLAY
          Only render this component when selectedParticipant is not null.
          The selected participant's information is passed in as props. */}
      {selectedParticipant && (
        <UserDetailOverlay
          // Using the participant ID as the key tells React which participant
          // this overlay belongs to if the selected participant changes.
          key={selectedParticipant.id}

          // Props pass information and functions from this page to the overlay.
          id={selectedParticipant.id}
          name={selectedParticipant.name}
          phone={selectedParticipant.phone_number}

          // The overlay can call onClose to close itself.
          // Setting the selected participant to null hides the overlay.
          onClose={() => setSelectedParticipant(null)}

          // onSaved runs after changes have been saved in the overlay.
          onSaved={async () => {
            // Reload the list so it displays the latest participant information.
            await fetchParticipants();

            // Close the overlay after refreshing the list.
            setSelectedParticipant(null);
          }}
        />
      )}
    </div>
  );
}
