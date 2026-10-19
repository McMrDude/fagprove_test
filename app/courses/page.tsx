"use client";

// React hooks:
// useState stores information that can change.
// useEffect runs code when the component mounts or its dependencies change.
// useMemo avoids recalculating a value when its dependencies haven't changed.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// Icons used throughout the page.
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  LoaderCircle,
  Search,
  Users,
  UserRound,
  Phone,
  Clock3,
  BookMarked,
} from "lucide-react";

// Describes the information we expect for each participant.
// The ID can be either a number or a string.
type Participant = {
  id: number | string;
  name: string;
  phone_number: string;
};

// Describes one session within a course offering.
type Session = {
  id: number | string;
  session_number: number;
  session_date: string;
};

// An offering represents one particular run of a course.
// For example, English could have one offering in October and another in January.
type Offering = {
  id: number | string;
  course_id: number | string;
  teacher_name: string | null;
  first_date: string | null;
  last_date: string | null;
  session_count: number;

  // Only these three status values are allowed.
  status: "planned" | "active" | "completed";

  // Participants and sessions belonging to this offering.
  participants: Participant[];
  sessions: Session[];
};

// Describes a course subject, such as English or Mathematics.
// Each course can have multiple offerings.
type Course = {
  id: number | string;
  name: string;
  teacher_name: string | null;
  offerings: Offering[];
};

// Describes the data returned by the courses overview API.
type ApiResponse = {
  success: boolean;
  error?: string;
  courses?: Course[];

  // Optional summary numbers used by the dashboard's statistic cards.
  stats?: {
    courses: number;
    offerings: number;
    participants: number;
    planned: number;
    active: number;
    completed: number;
  };
};

// Converts the internal status values into Norwegian labels.
// "as const" preserves the exact string types.
const statusLabels = {
  planned: "Planlagt",
  active: "Pågår",
  completed: "Fullført",
} as const;

// Tailwind CSS classes for each status badge.
// This keeps the styling consistent wherever a status is displayed.
const statusStyles = {
  planned: "bg-amber-50 text-amber-700 ring-amber-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  completed: "bg-slate-100 text-slate-600 ring-slate-200",
} as const;

// Converts a date string into a readable Norwegian date.
// For example, "2026-10-16" becomes something like "16. okt. 2026".
function formatDate(value: string | null | undefined) {
  // If no date was provided, show a fallback message.
  if (!value) return "Ikke satt";

  // Use midday instead of midnight to reduce the risk of the date
  // appearing as the previous day due to timezone differences.
  // slice(0, 10) takes only the YYYY-MM-DD part of the value.
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);

  // Check whether JavaScript was able to create a valid date.
  if (Number.isNaN(date.getTime())) return "Ikke satt";

  // Format the date according to Norwegian language conventions.
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

// Formats the first and last dates of an offering into one date range.
function formatDateRange(first: string | null, last: string | null) {
  // If neither date exists, there is no range to display.
  if (!first && !last) return "Datoer ikke satt";

  // If both dates exist and differ, show the full range.
  if (first && last && first !== last) {
    return `${formatDate(first)} – ${formatDate(last)}`;
  }

  // If only one date exists, or both dates are the same, show one date.
  return formatDate(first || last);
}

export default function CoursesPage() {
  // Stores the full response received from the API.
  // null means the response hasn't been stored yet.
  const [data, setData] = useState<ApiResponse | null>(null);

  // Controls which page state is displayed while data is loading.
  const [loading, setLoading] = useState(true);

  // Stores an error message if loading the data fails.
  const [error, setError] = useState("");

  // Stores the text entered into the search box.
  const [search, setSearch] = useState("");

  // Stores the selected status filter.
  // "all" means that no status filter is applied.
  const [statusFilter, setStatusFilter] = useState("all");

  // Stores the IDs of course offerings whose details are expanded.
  // An array allows several offerings to be open simultaneously.
  const [expandedOfferings, setExpandedOfferings] = useState<string[]>([]);

  // Fetch the course overview when the page first loads.
  useEffect(() => {
    // This flag prevents an old request from updating state after
    // the component has been removed from the page.
    let cancelled = false;

    // Loads the course overview from our API route.
    async function loadCourses() {
      try {
        setLoading(true);
        setError("");

        // Request the latest overview from the server.
        // no-store prevents the browser from reusing a cached response.
        const response = await fetch("/api/courses/overview", {
          method: "GET",
          cache: "no-store",
        });

        // Convert the JSON response into a JavaScript object.
        // ApiResponse tells TypeScript what shape we expect.
        const result: ApiResponse = await response.json();

        // Throw an error if the HTTP request failed or the API
        // reports that it couldn't complete the operation.
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Kunne ikke hente kursinformasjon.");
        }

        // Only update the page if the request hasn't been cancelled.
        if (!cancelled) {
          setData(result);

          // Get all offerings from all courses in one flat array.
          // flatMap() combines the offerings arrays into a single array.
          // at(0) selects the first offering, if one exists.
          const firstOffering = result.courses
            ?.flatMap((course) => course.offerings)
            .at(0);

          // Automatically expand the first offering so the page
          // doesn't initially show only collapsed course details.
          if (firstOffering) {
            setExpandedOfferings([String(firstOffering.id)]);
          }
        }
      } catch (err) {
        // Display the error only if the request is still relevant.
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Noe gikk galt da kursene skulle hentes."
          );
        }
      } finally {
        // Stop displaying the loading state after the request finishes,
        // whether it succeeded or failed.
        if (!cancelled) setLoading(false);
      }
    }

    // Start the request.
    loadCourses();

    // Cleanup runs if the component unmounts.
    return () => {
      cancelled = true;
    };
  }, []);

  // Calculate which courses should appear based on the search and status filter.
  // useMemo recalculates this list only when data, search or statusFilter changes.
  const filteredCourses = useMemo(() => {
    // Remove spaces at the beginning/end and normalize the search text.
    // Norwegian locale-aware lowercasing helps with Norwegian text.
    const term = search.trim().toLocaleLowerCase("nb-NO");

    // Start with the courses returned by the API.
    // If courses is missing, use an empty array instead.
    return (data?.courses ?? [])
      .filter((course) => {
        // With an empty search, keep every course.
        if (!term) return true;

        // Keep a course if its name, teacher's name, or any enrolled
        // participant's name contains the search text.
        return (
          course.name.toLocaleLowerCase("nb-NO").includes(term) ||
          (course.teacher_name ?? "").toLocaleLowerCase("nb-NO").includes(term) ||
          course.offerings.some((offering) =>
            offering.participants.some((participant) =>
              participant.name.toLocaleLowerCase("nb-NO").includes(term)
            )
          )
        );
      })

      // Create a new course object with only the offerings matching
      // the selected status. The original API data is not modified.
      .map((course) => ({
        ...course,
        offerings: course.offerings.filter((offering) => {
          // "all" keeps every offering.
          if (statusFilter === "all") return true;

          // Otherwise, keep only offerings with the selected status.
          return offering.status === statusFilter;
        }),
      }))

      // When a specific status is selected, hide courses that have
      // no offerings matching that status.
      .filter((course) => statusFilter === "all" || course.offerings.length > 0);
  }, [data, search, statusFilter]);

  // Opens or closes an offering when the user clicks its header.
  function toggleOffering(id: number | string) {
    // Convert the ID to a string so it matches the IDs stored in state.
    const key = String(id);

    // Use the previous state to decide what the next state should be.
    setExpandedOfferings((current) =>
      // If the offering is already open, remove its ID to close it.
      current.includes(key)
        ? current.filter((item) => item !== key)

        // Otherwise, add its ID to the array to open it.
        : [...current, key]
    );
  }

  // Read the summary statistics from the API response.
  const stats = data?.stats;

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-800">
      {/* Sticky header stays visible while scrolling. */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Link back to the main dashboard. */}
            <Link
              href="/"
              aria-label="Tilbake til oversikten"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft size={18} />
            </Link>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
              <BookOpen size={21} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                Kursbedriften AS
              </p>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
                Kursoversikt
              </h1>
            </div>
          </div>

          {/* A second navigation link, shown on larger screens. */}
          <Link
            href="/"
            className="hidden rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 sm:inline-flex"
          >
            Til oversikten
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Intro banner explaining what the overview page contains. */}
        <section className="relative mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-100 sm:p-8">
          {/* Decorative shapes in the background. */}
          <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full border-[35px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 right-36 h-52 w-52 rounded-full bg-white/5" />

          <div className="relative max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-50">
              <BookMarked size={14} />
              Administrasjon
            </div>

            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Alle kurs. All oversikt.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">
              Se fagene, ansvarlige lærere, kursperioder og hvem som er meldt på
              hvert enkelt kursoppsett.
            </p>
          </div>
        </section>

        {/* Show the statistic cards only if the API returned statistics. */}
        {stats && (
          <section className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={<BookOpen size={18} />}
              label="Fag"
              value={stats.courses}
              tint="indigo"
            />
            <StatCard
              icon={<CalendarDays size={18} />}
              label="Kursoppsett"
              value={stats.offerings}
              tint="violet"
            />
            <StatCard
              icon={<Users size={18} />}
              label="Alle påmeldinger"
              value={stats.participants}
              tint="sky"
            />
            <StatCard
              icon={<Clock3 size={18} />}
              label="Pågår nå"
              value={stats.active}
              tint="emerald"
            />
          </section>
        )}

        {/* REPORT: count participant enrollments in planned offerings. */}
        {/* This section appears only after loading succeeds. */}
        {!loading && !error && data && (
          <section className="mb-7 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950">
                  Rapport: Planlagte kurs
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Antall deltakere på kurs som ennå ikke har startet.
                </p>
              </div>

              <div className="rounded-xl bg-indigo-50 px-4 py-3">
                <p className="text-xs font-semibold text-indigo-600">
                  Totalt antall påmeldinger
                </p>
                <p className="text-2xl font-extrabold text-indigo-800">
                  {
                    // Add up the number of participants across all planned offerings.
                    // reduce() keeps a running total as it loops through the courses.
                    (data.courses ?? []).reduce(
                      (total, course) =>
                        // For each course, first keep only planned offerings.
                        total +
                        course.offerings
                          .filter((offering) => offering.status === "planned")
                          .reduce(
                            // Count the participants in those offerings and add
                            // the result to the overall total.
                            (sum, offering) =>
                              sum + offering.participants.length,
                            0
                          ),
                      0
                    )
                  }
                </p>
              </div>
            </div>

            {/* Check whether at least one course has a planned offering. */}
            {(data.courses ?? []).some((course) =>
              course.offerings.some(
                (offering) => offering.status === "planned"
              )
            ) ? (
              // If planned offerings exist, show the report table.
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[1fr_auto] bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>Kurs</span>
                  <span>Påmeldte</span>
                </div>

                {/* Keep only courses with at least one planned offering. */}
                {(data.courses ?? [])
                  .filter((course) =>
                    course.offerings.some(
                      (offering) => offering.status === "planned"
                    )
                  )
                  .map((course) => {
                    // Get this course's planned offerings.
                    const plannedOfferings = course.offerings.filter(
                      (offering) => offering.status === "planned"
                    );

                    // Count all enrollments across its planned offerings.
                    // If the same participant is enrolled in two different
                    // offerings, they count once in each offering.
                    const count = plannedOfferings.reduce(
                      (sum, offering) =>
                        sum + offering.participants.length,
                      0
                    );

                    return (
                      <div
                        key={String(course.id)}
                        className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-slate-100 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {course.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {plannedOfferings.length} planlagt kursoppsett
                          </p>
                        </div>

                        <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700">
                          {count}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              // If no planned offerings exist, show a helpful empty state.
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Det finnes ingen planlagte kurs med oppstart frem i tid.
              </p>
            )}

            <p className="mt-3 text-xs text-slate-400">
              Deltakere som er påmeldt flere kurs telles én gang per kursoppsett.
            </p>
          </section>
        )}

        {/* Search box and course-status filter. */}
        <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            {/* Controlled input: its value comes from React state. */}
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Søk etter fag, lærer eller deltaker..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />
          </div>

          {/* Changing this dropdown updates statusFilter and filters the list. */}
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filtrer etter kursstatus"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
          >
            <option value="all">Alle statuser</option>
            <option value="planned">Planlagt</option>
            <option value="active">Pågår</option>
            <option value="completed">Fullført</option>
          </select>
        </section>

        {/* Show different content depending on the current page state. */}
        {loading ? (
          // Loading state: the API request hasn't finished yet.
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500">
            <LoaderCircle size={30} className="mb-3 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Henter kurs og påmeldinger...</p>
          </div>
        ) : error ? (
          // Error state: the request failed.
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <p className="font-bold text-rose-800">Kunne ikke laste kursene</p>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
            >
              Prøv igjen
            </button>
          </div>
        ) : filteredCourses.length === 0 ? (
          // Empty state: no courses match the current search and filter.
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Search size={21} />
            </div>
            <h3 className="font-bold text-slate-900">Ingen kurs funnet</h3>
            <p className="mt-1 text-sm text-slate-500">
              Prøv et annet søk eller velg en annen status.
            </p>
          </div>
        ) : (
          // Normal state: display all courses that match the search and filter.
          <section className="space-y-4">
            {filteredCourses.map((course) => {
              // Count enrollments across this course's currently visible offerings.
              // Because filteredCourses applies the status filter, this total can
              // change when a particular status is selected.
              const enrollmentCount = course.offerings.reduce(
                (total, offering) => total + offering.participants.length,
                0
              );

              return (
                // Each course gets its own article.
                // The key helps React identify the course when rendering updates.
                <article
                  key={String(course.id)}
                  className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-slate-300"
                >
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                        <BookOpen size={22} />
                      </div>
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-950">
                          {course.name}
                        </h2>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <GraduationCap size={15} />
                            {course.teacher_name || "Ingen lærer tildelt"}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays size={15} />
                            {course.offerings.length}{" "}
                            {course.offerings.length === 1 ? "kursoppsett" : "kursoppsett"}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Users size={15} />
                            {enrollmentCount} påmeldinger
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Display each status that exists among the course's offerings. */}
                    <div className="flex flex-wrap gap-2">
                      {course.offerings.some((item) => item.status === "active") && (
                        <StatusPill status="active" />
                      )}
                      {course.offerings.some((item) => item.status === "planned") && (
                        <StatusPill status="planned" />
                      )}
                      {course.offerings.some((item) => item.status === "completed") && (
                        <StatusPill status="completed" />
                      )}
                    </div>
                  </div>

                  {/* Section containing the individual offerings for this course. */}
                  <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-slate-400">
                      Kursoppsett og deltakere
                    </p>

                    {course.offerings.length === 0 ? (
                      // There are no offerings to show for this course.
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                        Det er ikke opprettet noe kursoppsett for dette faget ennå.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Render each offering belonging to the course. */}
                        {course.offerings.map((offering) => {
                          // Check whether this offering's details are currently open.
                          const isExpanded = expandedOfferings.includes(String(offering.id));

                          return (
                            <div
                              key={String(offering.id)}
                              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                            >
                              {/* Clicking this button expands or collapses the offering. */}
                              <button
                                type="button"
                                onClick={() => toggleOffering(offering.id)}
                                aria-expanded={isExpanded}
                                className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-slate-900">
                                      Kursoppsett #{offering.id}
                                    </span>
                                    <StatusPill status={offering.status} />
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                                    <span className="inline-flex items-center gap-1.5">
                                      <CalendarDays size={14} />
                                      {formatDateRange(offering.first_date, offering.last_date)}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                      <Users size={14} />
                                      {offering.participants.length} deltakere
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                      <Clock3 size={14} />
                                      {offering.session_count} økter
                                    </span>
                                  </div>
                                </div>

                                {/* Change the label and icon based on whether it's open. */}
                                <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-indigo-700">
                                  {isExpanded ? "Skjul deltakere" : "Vis deltakere"}
                                  {isExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                                </span>
                              </button>

                              {/* Only render the details when the offering is expanded. */}
                              {isExpanded && (
                                <div className="border-t border-slate-100 px-4 py-4">
                                  {/* Display the individual sessions if any exist. */}
                                  {offering.sessions.length > 0 && (
                                    <div className="mb-5">
                                      <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                                        Kursplan
                                      </h4>
                                      <div className="flex flex-wrap gap-2">
                                        {offering.sessions
                                          // slice() creates a copy so sort() doesn't
                                          // modify the original sessions array.
                                          .slice()
                                          // Sort by session number: 1, 2, 3, etc.
                                          .sort((a, b) => a.session_number - b.session_number)
                                          .map((session) => (
                                            <div
                                              key={String(session.id)}
                                              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                                            >
                                              <span className="font-bold text-slate-800">
                                                Økt {session.session_number}
                                              </span>
                                              <span className="ml-2">{formatDate(session.session_date)}</span>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}

                                  <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                                    Påmeldte deltakere
                                  </h4>

                                  {offering.participants.length === 0 ? (
                                    // Show a message if nobody is enrolled.
                                    <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                                      Ingen deltakere er meldt på dette kursoppsettet.
                                    </div>
                                  ) : (
                                    // Otherwise, display the enrolled participants.
                                    <div className="overflow-hidden rounded-xl border border-slate-200">
                                      <div className="hidden grid-cols-[1fr_1fr] gap-3 bg-slate-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-400 sm:grid">
                                        <span>Deltaker</span>
                                        <span>Telefon</span>
                                      </div>

                                      {offering.participants
                                        // Sort a copy of the participant list alphabetically.
                                        .slice()
                                        .sort((a, b) => a.name.localeCompare(b.name, "nb"))
                                        .map((participant) => (
                                          <div
                                            key={String(participant.id)}
                                            className="grid gap-2 border-t border-slate-100 px-4 py-3 first:border-t-0 sm:grid-cols-[1fr_1fr] sm:items-center"
                                          >
                                            <div className="flex items-center gap-2.5">
                                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                                <UserRound size={16} />
                                              </div>
                                              <div>
                                                <p className="text-sm font-semibold text-slate-800">
                                                  {participant.name}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                  Deltaker-ID: {participant.id}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 pl-11 text-sm text-slate-600 sm:pl-0">
                                              <Phone size={14} className="text-slate-400" />
                                              {participant.phone_number || "Ikke registrert"}
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* Footer shown at the bottom of the page. */}
        <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>Kursbedriften AS · Intern kursadministrasjon</span>
          <span>Deltakerinformasjon er kun tilgjengelig for innloggede ansatte.</span>
        </footer>
      </div>
    </main>
  );
}

// Reusable component for displaying one statistic.
// Props are the values passed into the component by its parent.
function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tint: "indigo" | "violet" | "sky" | "emerald";
}) {
  // Choose the icon background/text colors based on the tint prop.
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    violet: "bg-violet-50 text-violet-600",
    sky: "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${colors[tint]}`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

// Reusable badge showing an offering's status.
// Offering["status"] reuses the status type defined in the Offering type above.
function StatusPill({ status }: { status: Offering["status"] }) {
  // Choose an icon based on the current status.
  const icon =
    status === "active" ? (
      <CheckCircle2 size={13} />
    ) : status === "planned" ? (
      <CalendarDays size={13} />
    ) : (
      <CheckCircle2 size={13} />
    );

  return (
    <span
      // Look up the matching CSS classes and Norwegian label using the status.
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusStyles[status]}`}
    >
      {icon}
      {statusLabels[status]}
    </span>
  );
}
