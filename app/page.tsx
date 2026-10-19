
"use client";

// "use client" tells Next.js that this page runs in the browser.
// We need this because the page uses React state, effects, clicks, and input fields.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// These are icons from the lucide-react library.
// Each icon is a React component that can be placed inside our JSX.
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  UserRound,
  X,
} from "lucide-react";

// A TypeScript type describes what kind of data an object should contain.
// DashboardCourse describes one course session displayed on the dashboard.
type DashboardCourse = {
  id: number;
  session_id: number;
  offering_id: number;
  session_number: number;
  course_name: string;
  teacher_name: string;
  teacher_assigned: boolean;
  participant_count: number;
};

// Describes a recently registered participant and the courses they attend.
type RecentParticipant = {
  id: number;
  name: string;
  phone_number: string;
  registered_at: string | null; // null means there is no registration date.
  course_names: string[];
};

// Describes one course offering, meaning a specific scheduled run of a course.
// For example, English offered in November is a different offering from English in January.
type Offering = {
  id: number;
  course_id: number;
  course_name: string;
  start_date: string | null;
  session_count: number;
};

// Describes a participant's enrollment in a specific course offering.
type ParticipantReportRow = {
  participant_id: number;
  participant_name: string;
  phone_number: string;
  course_name: string;
  offering_id: number;
};

// Describes the data used in the completed-course report.
type CompletionReport = {
  totalCompletedEnrollments: number;
  uniqueParticipants: number;
  byCourse: {
    course_id: number;
    course_name: string;
    completed_enrollments: number;
  }[];
};

// This is the main structure of the information returned by /api/dashboard.
// Defining this type helps TypeScript catch mistakes when we use that data.
type DashboardData = {
  success: boolean;
  today: string;
  user: {
    id: string | number | null;
    name: string;
    role: string | null;
  };
  todayCourses: DashboardCourse[];
  recentParticipants: RecentParticipant[];
  participantReports: {
    planned: ParticipantReportRow[];
    active: ParticipantReportRow[];
  };
  completionReport: CompletionReport;
  attention: {
    missingPlacement: number;
    missingTeacher: number;
    highAbsence: number;
  };
  stats: {
    participants: number;
    teachers: number;
    courses: number;
    activeOfferings: number;
    plannedOfferings: number;
    completedOfferings: number;
  };
};

// Converts a date string into a longer, readable Norwegian date.
// Example: "2026-10-16" becomes something like "16. oktober 2026".
function formatDate(date: string) {
  // If there is no date, show a message instead of trying to format it.
  if (!date) return "Dato ikke satt";

  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Oslo",
  }).format(new Date(`${date}T12:00:00`));
  // T12:00:00 sets the time to midday to help avoid date changes
  // caused by timezone conversions around midnight.
}

// Similar to formatDate, but uses a shorter month name.
// This is useful for the small course cards in the registration modal.
function formatShortDate(date: string | null) {
  if (!date) return "Dato ikke satt";

  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Oslo",
  }).format(new Date(`${date}T12:00:00`));
}

// Returns a greeting based on the current hour in Norway.
function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Oslo",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date())
  );

  // These conditions are checked from top to bottom.
  if (hour < 10) return "God morgen";
  if (hour < 18) return "God dag";
  return "God kveld";
}

// Turns a person's name into initials.
// Example: "Kari Nordmann" becomes "KN".
// These initials are used in the circular profile icons.
function initials(name: string) {
  return name
    .trim() // Removes whitespace at the beginning and end.
    .split(/\s+/) // Splits the name at one or more spaces.
    .slice(0, 2) // Keeps only the first two name parts.
    .map((part) => part[0]?.toUpperCase() ?? "")
    // Gets the first character of each part and makes it uppercase.
    // ?. prevents an error if the character does not exist.
    // ?? "" provides an empty string if the result is null or undefined.
    .join(""); // Combines the initials into one string.
}

// The main dashboard page.
// Next.js displays this component when the user visits the "/" route.
export default function DashboardPage() {
  // useRouter lets us navigate to other pages in the application.
  // Example: router.push("/participants") opens the participants page.
  const router = useRouter();

  // useState stores information that can change while the page is open.
  // When a state value changes, React updates the relevant UI.

  // dashboard stores the data fetched from the dashboard API.
  // null means the data has not been loaded yet.
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  // Stores course offerings available when registering a participant.
  const [offerings, setOfferings] = useState<Offering[]>([]);

  // Controls whether the dashboard is currently loading its data.
  const [loading, setLoading] = useState(true);

  // Prevents repeated clicks while the logout request is running.
  const [loggingOut, setLoggingOut] = useState(false);

  // Stores an error message if the dashboard request fails.
  const [loadError, setLoadError] = useState("");

  // Controls whether the mobile navigation menu is open.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // These states control the participant registration modal.
  const [registerParticipantOpen, setRegisterParticipantOpen] =
    useState(false);

  // These store the values typed into the registration form.
  const [participantName, setParticipantName] = useState("");
  const [participantPhone, setParticipantPhone] = useState("");

  // Stores the IDs of the course offerings selected by the employee.
  // An array allows the participant to be enrolled in multiple courses.
  const [selectedOfferings, setSelectedOfferings] = useState<number[]>([]);

  // Indicates that the registration request is currently being processed.
  const [registering, setRegistering] = useState(false);

  // Stores registration errors and success messages separately.
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");

  // Determines whether we display participants from active or planned courses.
  // The type allows only these two string values.
  const [participantTab, setParticipantTab] =
    useState<"active" | "planned">("active");

  // useCallback keeps a stable function reference between renders,
  // unless one of the values in its dependency array changes.
  // This is useful here because the function is also used by useEffect.
  const loadDashboard = useCallback(async () => {
    // Start the loading indicator and clear any previous error.
    setLoading(true);
    setLoadError("");

    try {
      // fetch sends an HTTP request to our own Next.js API endpoint.
      // The API is responsible for retrieving the dashboard data.
      const response = await fetch("/api/dashboard", {
        cache: "no-store",
        // Avoid using a cached response; request fresh dashboard data.
      });

      // Convert the response body from JSON into a JavaScript object.
      const result = await response.json();

      // HTTP 401 means the user is not authenticated.
      // Send them to the login page instead of displaying the dashboard.
      if (response.status === 401) {
        router.push("/login");
        return; // Stop executing this function.
      }

      // response.ok is true for successful HTTP status codes.
      // result.success is an additional success flag provided by our API.
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Kunne ikke hente oversikten.");
      }

      // Save the fetched data in React state.
      // This causes React to render the dashboard with the new information.
      setDashboard(result as DashboardData);
    } catch (error) {
      // If the request fails, show a useful error message.
      // "instanceof Error" checks whether the caught value is an Error object.
      setLoadError(
        error instanceof Error
          ? error.message
          : "Kunne ikke laste oversikten."
      );
    } finally {
      // finally runs whether the request succeeded or failed.
      // Stop the loading indicator when the request has finished.
      setLoading(false);
    }
  }, [router]);
  // The dependency array contains router because this callback uses it.
  // React can reuse this function while router remains the same.

  // Clears the authentication cookie through the logout API, then returns to login.
  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Kunne ikke logge ut. Prøv igjen.");
      }

      // replace() prevents the browser's Back button from returning to this page.
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Kunne ikke logge ut. Prøv igjen."
      );
      setLoggingOut(false);
    }
  }

  // Fetches the course offerings available for participant registration.
  const loadRegistrationOfferings = useCallback(async () => {
    try {
      const response = await fetch("/api/participants/registration-options", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Kunne ikke hente tilgjengelige kurs."
        );
      }

      // If the API returns no offerings, use an empty array instead.
      setOfferings(result.offerings ?? []);
    } catch (error) {
      setRegisterError(
        error instanceof Error
          ? error.message
          : "Kunne ikke hente tilgjengelige kurs."
      );
    }
  }, []);
  // The empty dependency array means this callback does not depend
  // on any changing values from this component.

  // useEffect runs after React renders the component.
  // This effect loads the dashboard when the page first opens.
  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);
  // It runs again if the loadDashboard function reference changes.
  // "void" indicates that we are intentionally not awaiting the Promise here.

  // Load the available course offerings when the registration modal opens.
  useEffect(() => {
    if (registerParticipantOpen) {
      void loadRegistrationOfferings();
    }
  }, [registerParticipantOpen, loadRegistrationOfferings]);
  // The effect checks the modal state.
  // Closing the modal does not trigger another fetch of the offerings.

  // Adds or removes an offering ID from the selected course list.
  function toggleOffering(offeringId: number) {
    setSelectedOfferings((current) =>
      // If the offering is already selected, remove it.
      current.includes(offeringId)
        ? current.filter((id) => id !== offeringId)
        // Otherwise, create a new array with the offering added.
        : [...current, offeringId]
    );
  }
  // current is the previous state.
  // Using the previous state is useful when the next value depends on it.

  // Validates and submits the participant registration form.
  async function registerParticipant() {
    // Clear messages from any previous registration attempt.
    setRegisterError("");
    setRegisterSuccess("");

    // trim() removes unnecessary spaces around the entered values.
    const cleanName = participantName.trim();
    const cleanPhone = participantPhone.trim();

    // Do not allow registration if the name is empty.
    if (!cleanName) {
      setRegisterError("Skriv inn navnet til deltakeren.");
      return;
    }

    // This regular expression requires exactly eight digits.
    // ^ means the beginning, \d means a digit, and $ means the end.
    if (!/^\d{8}$/.test(cleanPhone)) {
      setRegisterError("Telefonnummeret må bestå av 8 siffer.");
      return;
    }

    // The participant must be assigned to at least one offering.
    if (selectedOfferings.length === 0) {
      setRegisterError("Velg minst ett planlagt kurs.");
      return;
    }

    // Prevent duplicate submissions while the request is running.
    setRegistering(true);

    try {
      // Send the participant information to the API using POST.
      // POST is commonly used when creating new records.
      const response = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // JSON.stringify converts our JavaScript object into JSON text.
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          offeringIds: selectedOfferings,
        }),
      });

      const result = await response.json();

      // The API may return an error even if the request reached the server.
      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Kunne ikke registrere deltakeren."
        );
      }

      // Show a success message and reset the form fields.
      setRegisterSuccess(`${cleanName} ble registrert!`);
      setParticipantName("");
      setParticipantPhone("");
      setSelectedOfferings([]);

      // Reload the dashboard so the new participant appears in its lists
      // and any affected statistics can be updated.
      await loadDashboard();

      // Close the modal after a short delay so the user can see the message.
      window.setTimeout(() => {
        setRegisterParticipantOpen(false);
        setRegisterSuccess("");
      }, 900);
    } catch (error) {
      // Display an error if registration fails.
      setRegisterError(
        error instanceof Error
          ? error.message
          : "Noe gikk galt under registreringen."
      );
    } finally {
      // Re-enable the registration button after the request finishes.
      setRegistering(false);
    }
  }

  // These are derived values: they are calculated from existing state.
  // We do not need separate useState calls for values we can calculate.

  // Use the logged-in user's name, or a fallback while data is unavailable.
  const userName = dashboard?.user?.name || "Ansatt";

  // Extract the first name for the welcome message.
  const firstName = userName.trim().split(/\s+/)[0] || "Ansatt";

  // Shortcuts to the statistics and follow-up counts in the API response.
  const stats = dashboard?.stats;
  const attention = dashboard?.attention;

  // Choose which participant list to display based on the selected tab.
  // The ?? [] fallback ensures we always have an array to work with.
  const participantRows =
    participantTab === "active"
      ? dashboard?.participantReports?.active ?? []
      : dashboard?.participantReports?.planned ?? [];

  // Navigation items are stored in an array so the menu can be generated
  // with map() instead of repeating nearly identical button markup.
  // Each item contains a label, an icon component, and a destination URL.
  const navItems = [
    { label: "Oversikt", icon: LayoutDashboard, href: "/" },
    { label: "Deltakere", icon: Users, href: "/participants" },
    { label: "Kurs", icon: BookOpen, href: "/courses" },
    { label: "Lærere", icon: GraduationCap, href: "/teachers" },
  ];

  // Everything below this point is JSX: the structure of the page.
  // Curly braces {} let us use JavaScript values and expressions inside JSX.
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* MOBILE HEADER: only visible on smaller screens. */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2.5"
          aria-label="Til oversikten"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <GraduationCap size={20} />
          </span>
          <span className="font-extrabold tracking-tight text-slate-900">
            kurs<span className="text-indigo-600">bedriften</span>
          </span>
        </button>

        {/* Toggle the mobile menu open or closed when clicked. */}
        <button
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="rounded-lg border border-slate-200 p-2"
          aria-label="Åpne meny"
        >
          {/* Show an X when open, or a menu icon when closed. */}
          {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </header>

      {/* Render the mobile navigation only when its state is true. */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-30 border-b border-slate-200 bg-white p-3 shadow-lg lg:hidden">
          {/* map() creates one button for each object in navItems. */}
          {navItems.map((item) => {
            // A component can be stored in a variable and rendered as <Icon />.
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                onClick={() => {
                  // Close the menu first, then navigate to the selected page.
                  setMobileMenuOpen(false);
                  router.push(item.href);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Icon size={18} />
                {item.label}
                <ArrowRight size={15} className="ml-auto" />
              </button>
            );
          })}

          {/* Log out from the mobile navigation. */}
          <button
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="mt-2 flex w-full items-center gap-3 rounded-lg border-t border-slate-100 px-3 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
          >
            <LogOut size={18} />
            {loggingOut ? "Logger ut..." : "Logg ut"}
          </button>
        </div>
      )}

      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        {/* DESKTOP SIDEBAR: hidden on small screens, visible from lg upwards. */}
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex">
          <button
            onClick={() => router.push("/")}
            className="mb-8 flex items-center gap-3 px-2 text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <GraduationCap size={22} />
            </span>
            <span>
              <span className="block text-base font-extrabold text-slate-900">
                kurs<span className="text-indigo-600">bedriften</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Administrasjon
              </span>
            </span>
          </button>

          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Meny
          </p>

          <nav className="space-y-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;

              // The first item is the dashboard, so it is highlighted as active.
              const active = index === 0;

              return (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-indigo-600 text-white"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}

                  {/* Show a small dot beside the active navigation item. */}
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* mt-auto pushes the user information to the bottom of the sidebar. */}
          <div className="mt-auto border-t border-slate-100 pt-4">
            <div className="flex items-center gap-3 px-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-extrabold text-indigo-700">
                {initials(userName)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">
                  {userName}
                </span>
                <span className="text-xs text-slate-400">
                  {/* Display a different label based on the user's role. */}
                  {dashboard?.user?.role === "admin"
                    ? "Administrator"
                    : "Kontoransatt"}
                </span>
              </span>
            </div>

            {/* Desktop logout button below the signed-in user's information. */}
            <button
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut size={17} />
              {loggingOut ? "Logger ut..." : "Logg ut"}
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT: this is where the dashboard sections are displayed. */}
        <main className="min-w-0 flex-1 lg:ml-60">
          {/* DESKTOP TOP BAR: hidden on mobile screens. */}
          <header className="hidden h-14 items-center justify-between border-b border-slate-200 bg-white px-8 lg:flex">
            <div className="text-sm text-slate-500">
              Administrasjon <span className="mx-2 text-slate-300">/</span>
              <span className="font-semibold text-slate-800">Oversikt</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Shortcut to the report of participant enrollments. */}
              <button
                onClick={() => router.push("/enrollments")}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Search size={15} />
                Påmeldingsrapport
              </button>

              {/* Clicking this button requests fresh dashboard data. */}
              <button
                onClick={() => void loadDashboard()}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Oppdater oversikten"
                title="Oppdater"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            {/* WELCOME SECTION: greeting, date, and new-participant button. */}
            <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Administrasjon
                </p>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {getGreeting()}, {firstName}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Her er det viktigste om kurs og deltakere.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
                  <CalendarDays size={16} className="text-indigo-600" />
                  {dashboard?.today
                    ? formatDate(dashboard.today)
                    : "Henter dato..."}
                </span>

                {/* Open the registration modal and clear old messages. */}
                <button
                  onClick={() => {
                    setRegisterError("");
                    setRegisterSuccess("");
                    setRegisterParticipantOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                  <Plus size={17} />
                  Ny deltaker
                </button>
              </div>
            </section>

            {/* Display this section only if loading the dashboard failed. */}
            {loadError && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold">Kunne ikke laste oversikten</p>
                  <p className="mt-1">{loadError}</p>
                </div>
                <button
                  onClick={() => void loadDashboard()}
                  className="font-bold underline"
                >
                  Prøv igjen
                </button>
              </div>
            )}

            {/* KEY STATISTICS: summary cards showing important totals. */}
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard
                title="Deltakere"
                value={stats?.participants}
                icon={Users}
                loading={loading}
              />
              <StatCard
                title="Lærere"
                value={stats?.teachers}
                icon={GraduationCap}
                loading={loading}
              />
              <StatCard
                title="Aktive kurs"
                value={stats?.activeOfferings}
                icon={BookOpen}
                loading={loading}
              />
              <StatCard
                title="Planlagte kurs"
                value={stats?.plannedOfferings}
                icon={CalendarDays}
                loading={loading}
              />
            </section>

            {/* TODAY'S COURSES AND QUICK ACTIONS. */}
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_0.8fr]">
              <Panel
                title="Kurs i dag"
                subtitle={
                  dashboard?.today
                    ? formatDate(dashboard.today)
                    : "Dagens kursøkter"
                }
                icon={CalendarDays}
                action={
                  // The action prop allows Panel to display a button in its header.
                  <button
                    onClick={() => router.push("/courses")}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Alle kurs →
                  </button>
                }
              >
                {/* Conditional rendering selects the appropriate display. */}
                {loading ? (
                  // Show placeholders while the API request is running.
                  <LoadingRows />
                ) : dashboard?.todayCourses?.length ? (
                  // If courses exist, create a row for each one.
                  <div className="divide-y divide-slate-100">
                    {dashboard.todayCourses.map((course) => (
                      <div
                        key={course.session_id}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <BookOpen size={19} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {course.course_name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {course.teacher_name} · Økt {course.session_number}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-800">
                            {course.participant_count}
                          </p>
                          <p className="text-[11px] text-slate-400">deltakere</p>

                          {/* Show a warning if no teacher has been assigned. */}
                          {!course.teacher_assigned && (
                            <span className="text-[10px] font-bold text-amber-700">
                              Mangler lærer
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // If there are no courses today, show an empty-state message.
                  <EmptyState
                    icon={CalendarDays}
                    title="Ingen kurs i dag"
                    description="Det er ingen kursøkter planlagt for i dag."
                  />
                )}
              </Panel>

              {/* Reusable shortcut buttons for common office tasks. */}
              <Panel title="Snarveier" subtitle="Vanlige oppgaver" icon={Activity}>
                <div className="space-y-2">
                  <QuickAction
                    icon={UserRound}
                    title="Registrer deltaker"
                    onClick={() => {
                      setRegisterError("");
                      setRegisterSuccess("");
                      setRegisterParticipantOpen(true);
                    }}
                  />
                  <QuickAction
                    icon={Users}
                    title="Deltakeroversikt"
                    onClick={() => router.push("/participants")}
                  />
                  <QuickAction
                    icon={Search}
                    title="Påmeldingsrapport"
                    onClick={() => router.push("/enrollments")}
                  />
                  <QuickAction
                    icon={GraduationCap}
                    title="Læreroversikt"
                    onClick={() => router.push("/teachers")}
                  />
                </div>
              </Panel>
            </section>

            {/* ENROLLMENT LIST: displays participants in active or planned courses. */}
            <Panel
              title="Påmeldte deltakere"
              subtitle="Deltakere fordelt på aktive og planlagte kurs."
              icon={Users}
              action={
                <button
                  onClick={() => router.push("/enrollments")}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Full rapport →
                </button>
              }
            >
              {loading ? (
                <LoadingRows />
              ) : participantRows.length ? (
                <div className="divide-y divide-slate-100">
                  {/* Show at most six rows in this dashboard section. */}
                  {participantRows.slice(0, 6).map((row) => (
                    <div
                      key={`${row.offering_id}-${row.participant_id}`}
                      // The combined ID gives each enrollment row a stable key.
                      className="flex items-center gap-3 py-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                        {initials(row.participant_name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {row.participant_name}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                          <Phone size={11} />
                          {row.phone_number}
                        </p>
                      </div>
                      <span className="max-w-[45%] truncate rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {row.course_name}
                      </span>
                    </div>
                  ))}

                  {/* Only show this link if more than six enrollments exist. */}
                  {participantRows.length > 6 && (
                    <button
                      onClick={() => router.push("/enrollments")}
                      className="w-full pt-3 text-left text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Vis alle {participantRows.length} påmeldinger →
                    </button>
                  )}
                </div>
              ) : (
                // If the selected list is empty, explain which list is empty.
                <EmptyState
                  icon={Users}
                  title={
                    participantTab === "active"
                      ? "Ingen aktive påmeldinger"
                      : "Ingen planlagte påmeldinger"
                  }
                  description="Påmeldinger vises her når de finnes."
                />
              )}
            </Panel>

            {/* COMPLETION REPORT: shows the course-completion totals. */}
            <Panel
              title="Fullførte kurs"
              subtitle="Hvor mange kursdeltakelser som er registrert som fullført."
              icon={ClipboardCheck}
              action={
                <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-extrabold text-emerald-700">
                  {loading
                    ? "—"
                    : dashboard?.completionReport?.totalCompletedEnrollments ?? 0}{" "}
                  fullført
                </span>
              }
            >
              <div className="mb-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="text-xs font-medium text-slate-500">
                    Fullførte påmeldinger
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {loading
                      ? "—"
                      : dashboard?.completionReport?.totalCompletedEnrollments ?? 0}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="text-xs font-medium text-slate-500">
                    Unike deltakere
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {loading
                      ? "—"
                      : dashboard?.completionReport?.uniqueParticipants ?? 0}
                  </p>
                </div>
              </div>

              {loading ? (
                <LoadingRows />
              ) : dashboard?.completionReport?.byCourse?.length ? (
                <div className="space-y-3">
                  {dashboard.completionReport.byCourse.map((course) => {
                    // Calculate each course's share of all completed enrollments.
                    // This measures the distribution of completions, not the
                    // percentage of participants in that course who passed.
                    const total =
                      dashboard.completionReport.totalCompletedEnrollments;

                    const percentage =
                      total > 0
                        ? Math.min(
                            (course.completed_enrollments / total) * 100,
                            100
                          )
                        : 0;
                    // Avoid dividing by zero when no completions exist.
                    // Math.min ensures the bar never exceeds 100%.

                    return (
                      <div key={course.course_id}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-semibold text-slate-700">
                            {course.course_name}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {course.completed_enrollments}
                          </span>
                        </div>
                        {/* The inner div's width controls the progress bar length. */}
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                  Ingen fullførte kursdeltakelser er registrert ennå.
                </p>
              )}
            </Panel>

            {/* FOLLOW-UP ITEMS: things the office worker may need to investigate. */}
            <Panel
              title="Trenger oppfølging"
              subtitle="Velg en rad for å gå til riktig oversikt."
              icon={ShieldAlert}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <AttentionItem
                  count={attention?.missingPlacement ?? 0}
                  title="Mangler kursplass"
                  description="Deltakere uten påmelding"
                  loading={loading}
                  onClick={() => router.push("/participants")}
                  tone="amber"
                />
                <AttentionItem
                  count={attention?.missingTeacher ?? 0}
                  title="Mangler lærer"
                  description="Kurs uten tildelt lærer"
                  loading={loading}
                  onClick={() => router.push("/teachers")}
                  tone="rose"
                />
                <AttentionItem
                  count={attention?.highAbsence ?? 0}
                  title="Høyt fravær"
                  description="Deltakere med minst 30 % fravær"
                  loading={loading}
                  onClick={() => router.push("/teachers/attendance-report")}
                  tone="violet"
                />
              </div>
            </Panel>

            {/* FOOTER: small text at the bottom of the dashboard. */}
            <footer className="border-t border-slate-200 pt-4 text-xs text-slate-400">
              Kursbedriften AS · Administrasjonssystem
            </footer>
          </div>
        </main>
      </div>

      {/* REGISTRATION MODAL: only rendered when the state is true. */}
      {registerParticipantOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            // Close the modal if the user clicks the dark background itself.
            // event.target is the element clicked.
            // event.currentTarget is the element holding this event handler.
            // Comparing them prevents clicks inside the form from closing it.
            if (event.target === event.currentTarget && !registering) {
              setRegisterParticipantOpen(false);
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            {/* Modal heading and close button. */}
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Registrer deltaker
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Legg inn kontaktinformasjon og velg kurs.
                </p>
              </div>
              <button
                onClick={() => setRegisterParticipantOpen(false)}
                disabled={registering}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Lukk"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* Show an error message only when registerError is not empty. */}
              {registerError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  {registerError}
                </div>
              )}

              {/* Show the success message after a successful API response. */}
              {registerSuccess && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                  <Check size={17} />
                  {registerSuccess}
                </div>
              )}

              {/* NAME INPUT: value connects the field to React state. */}
              <div>
                <label
                  htmlFor="participant-name"
                  className="mb-1.5 block text-sm font-bold text-slate-700"
                >
                  Fullt navn
                </label>
                <input
                  id="participant-name"
                  value={participantName}
                  // Update state every time the user types.
                  onChange={(event) => setParticipantName(event.target.value)}
                  placeholder="F.eks. Kari Nordmann"
                  autoComplete="name"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                />
              </div>

              {/* PHONE INPUT: keep the field to a maximum of eight digits. */}
              <div>
                <label
                  htmlFor="participant-phone"
                  className="mb-1.5 block text-sm font-bold text-slate-700"
                >
                  Telefonnummer
                </label>
                <input
                  id="participant-phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={8}
                  value={participantPhone}
                  onChange={(event) =>
                    // Remove non-digit characters and keep at most eight digits.
                    setParticipantPhone(
                      event.target.value.replace(/\D/g, "").slice(0, 8)
                    )
                  }
                  placeholder="8 siffer"
                  autoComplete="tel"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                />
              </div>

              {/* COURSE SELECTION: let the employee choose one or more offerings. */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-sm font-bold text-slate-700">
                    Velg kurs
                  </label>
                  <span className="text-xs font-semibold text-indigo-700">
                    {selectedOfferings.length} valgt
                  </span>
                </div>

                {/* If offerings exist, show a selectable button for each one. */}
                {offerings.length ? (
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {offerings.map((offering) => {
                      // Check whether this offering's ID is in the selected array.
                      const selected = selectedOfferings.includes(offering.id);

                      return (
                        <button
                          key={offering.id}
                          type="button"
                          // Reuse the toggle function to select or deselect this course.
                          onClick={() => toggleOffering(offering.id)}
                          className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${
                            selected
                              ? "border-indigo-300 bg-indigo-50"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              selected
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300 text-transparent"
                            }`}
                          >
                            {/* The checkmark is visible when the course is selected. */}
                            <Check size={13} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-slate-800">
                              {offering.course_name}
                            </span>
                            <span className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <CalendarDays size={12} />
                                {formatShortDate(offering.start_date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock3 size={12} />
                                {offering.session_count} økter
                              </span>
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // If there are no offerings, explain how to create one.
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                    <p className="text-sm font-bold text-slate-700">
                      Ingen tilgjengelige kurs
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Opprett et kurs med kursdatoer før du melder på deltakere.
                    </p>
                    <button
                      onClick={() => router.push("/course-planning")}
                      className="mt-2 text-sm font-bold text-indigo-600"
                    >
                      Gå til kursplanlegging →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* MODAL FOOTER: cancel and submit buttons. */}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:justify-end">
              <button
                onClick={() => setRegisterParticipantOpen(false)}
                disabled={registering}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Avbryt
              </button>

              <button
                // Call the async function when the user submits the form.
                onClick={() => void registerParticipant()}
                // Disable submission while registering or if no offerings exist.
                disabled={registering || offerings.length === 0}
                className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {registering ? (
                  // Show a spinner and different text while the request is running.
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Registrerer...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Registrer deltaker
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// REUSABLE UI COMPONENTS
// -----------------------------------------------------------------------------
// These components are outside DashboardPage so that the same layout patterns
// can be reused without copying their JSX into every section.

// Panel provides a consistent card with a heading, optional subtitle,
// optional action on the right, and a content area.
function Panel({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            {/* Icon is a component passed in through the icon prop. */}
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-extrabold text-slate-900">
              {title}
            </h2>
            {/* The subtitle is optional, so only render it when provided. */}
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Render the optional action, such as a report link or badge. */}
        {action}
      </div>

      {/* children represents whatever content is placed inside <Panel>...</Panel>. */}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

// StatCard displays one number and its label.
// It is reused for participant, teacher, and course statistics.
function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: number | undefined;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon size={19} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-500">{title}</p>
        <p className="mt-0.5 text-2xl font-black text-slate-900">
          {/* Show a dash during loading; otherwise show the value or zero. */}
          {loading ? "—" : value ?? 0}
        </p>
      </div>
    </div>
  );
}

// QuickAction is a reusable button that includes an icon, label, and arrow.
// Its parent supplies the onClick function, so it can navigate anywhere.
function QuickAction({
  icon: Icon,
  title,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 text-left transition hover:border-indigo-100 hover:bg-indigo-50/50"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-indigo-100 group-hover:text-indigo-700">
        <Icon size={16} />
      </span>
      <span className="flex-1 text-sm font-semibold text-slate-700">
        {title}
      </span>
      <ArrowRight
        size={15}
        className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600"
      />
    </button>
  );
}

// TabButton is a reusable tab-style button.
// It accepts the current active state, a click function, a label, and a count.
// It is defined here even though this dashboard currently does not render it.
function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-3 py-2.5 text-sm font-bold transition ${
        active
          ? "border-indigo-600 text-indigo-700"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {label}
      <span
        className={`ml-2 rounded-md px-1.5 py-0.5 text-xs ${
          active ? "bg-indigo-50" : "bg-slate-100"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// AttentionItem displays a warning or follow-up task.
// Clicking it runs the onClick function supplied by the parent.
function AttentionItem({
  count,
  title,
  description,
  loading,
  onClick,
  tone,
}: {
  count: number;
  title: string;
  description: string;
  loading: boolean;
  onClick: () => void;
  tone: "amber" | "rose" | "violet";
}) {
  // Map each allowed tone to its Tailwind CSS color classes.
  // The tone type prevents unsupported values from being passed in.
  const styles = {
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 text-left transition hover:bg-slate-50"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles[tone]}`}
      >
        <ShieldAlert size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-800">{title}</span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {description}
        </span>
      </span>
      <span className="text-lg font-black text-slate-900">
        {/* Do not display the count as if it were final while data is loading. */}
        {loading ? "—" : count}
      </span>
    </button>
  );
}

// EmptyState is displayed when a section has no data to show.
// It gives the user an explanation instead of leaving a blank area.
function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="py-7 text-center">
      <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <Icon size={20} />
      </span>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

// LoadingRows creates animated placeholder rows.
// These are displayed while data is being fetched from the API.
function LoadingRows() {
  return (
    <div className="space-y-3">
      {/* Render three placeholder rows using map(). */}
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex animate-pulse items-center gap-3 py-2">
          <div className="h-9 w-9 rounded-lg bg-slate-100" />
          <div className="flex-1">
            <div className="h-3 w-1/3 rounded bg-slate-100" />
            <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}