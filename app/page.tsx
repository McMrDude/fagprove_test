
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  Users,
  UserRound,
  X,
  Phone,
  ClipboardCheck,
  RefreshCw,
} from "lucide-react";

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

type RecentParticipant = {
  id: number;
  name: string;
  phone_number: string;
  registered_at: string | null;
  course_names: string[];
};

type Offering = {
  id: number;
  course_id: number;
  course_name: string;
  start_date: string | null;
  session_count: number;
};

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

function formatDate(date: string) {
  if (!date) return "Dato ikke satt";

  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Oslo",
  }).format(new Date(`${date}T12:00:00`));
}

function formatShortDate(date: string | null) {
  if (!date) return "Dato ikke satt";

  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Oslo",
  }).format(new Date(`${date}T12:00:00`));
}

function formatRelativeDate(date: string | null) {
  if (!date) return "Ingen registreringsdato";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Nylig registrert";

  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Oslo",
  }).format(parsed);
}

function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Oslo",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date())
  );

  if (hour < 10) return "God morgen";
  if (hour < 18) return "God dag";
  return "God kveld";
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function DashboardPage() {
  const router = useRouter();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [registerParticipantOpen, setRegisterParticipantOpen] =
    useState(false);
  const [participantName, setParticipantName] = useState("");
  const [participantPhone, setParticipantPhone] = useState("");
  const [selectedOfferings, setSelectedOfferings] = useState<number[]>([]);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/dashboard", {
        cache: "no-store",
      });

      const result = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Kunne ikke hente oversikten."
        );
      }

      setDashboard(result as DashboardData);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Noe gikk galt da oversikten skulle lastes."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadRegistrationOfferings = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/participants/registration-options",
        { cache: "no-store" }
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Kunne ikke hente tilgjengelige kurs."
        );
      }

      setOfferings(result.offerings ?? []);
    } catch (error) {
      setRegisterError(
        error instanceof Error
          ? error.message
          : "Kunne ikke hente tilgjengelige kurs."
      );
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (registerParticipantOpen) {
      void loadRegistrationOfferings();
    }
  }, [registerParticipantOpen, loadRegistrationOfferings]);

  function toggleOffering(offeringId: number) {
    setSelectedOfferings((current) =>
      current.includes(offeringId)
        ? current.filter((id) => id !== offeringId)
        : [...current, offeringId]
    );
  }

  async function registerParticipant() {
    setRegisterError("");
    setRegisterSuccess("");

    const cleanName = participantName.trim();
    const cleanPhone = participantPhone.trim();

    if (!cleanName) {
      setRegisterError("Skriv inn navnet til deltakeren.");
      return;
    }

    if (!/^\d{8}$/.test(cleanPhone)) {
      setRegisterError("Telefonnummeret må bestå av 8 siffer.");
      return;
    }

    if (selectedOfferings.length === 0) {
      setRegisterError("Velg minst ett planlagt kurs.");
      return;
    }

    setRegistering(true);

    try {
      const response = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          offeringIds: selectedOfferings,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Kunne ikke registrere deltakeren."
        );
      }

      setRegisterSuccess(`${cleanName} ble registrert!`);
      setParticipantName("");
      setParticipantPhone("");
      setSelectedOfferings([]);

      await loadDashboard();

      window.setTimeout(() => {
        setRegisterParticipantOpen(false);
        setRegisterSuccess("");
      }, 900);
    } catch (error) {
      setRegisterError(
        error instanceof Error
          ? error.message
          : "Noe gikk galt under registreringen."
      );
    } finally {
      setRegistering(false);
    }
  }

  const userName = dashboard?.user?.name || "Ansatt";
  const firstName = userName.trim().split(/\s+/)[0] || "Ansatt";
  const today = dashboard?.today;
  const stats = dashboard?.stats;
  const attention = dashboard?.attention;

  const navItems = [
    { label: "Oversikt", icon: LayoutDashboard, active: true, href: "/" },
    { label: "Deltakere", icon: Users, active: false, href: "/participants" },
    { label: "Kurs", icon: BookOpen, active: false, href: "/courses" },
    { label: "Lærere", icon: GraduationCap, active: false, href: "/teachers" },
    {
      label: "Kursplanlegging",
      icon: CalendarDays,
      active: false,
      href: "/course-planning",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-800">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-5 backdrop-blur-xl lg:hidden">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-3"
          aria-label="Til oversikten"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <GraduationCap size={21} />
          </div>
          <div className="text-left">
            <p className="font-extrabold tracking-tight text-slate-900">
              kurs<span className="text-indigo-600">bedriften</span>
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Administrasjon
            </p>
          </div>
        </button>

        <button
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="rounded-xl border border-slate-200 p-2.5 text-slate-600"
          aria-label="Åpne meny"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-[68px] z-30 border-b border-slate-200 bg-white p-3 shadow-xl lg:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push(item.href);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold ${
                  item.active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon size={18} />
                {item.label}
                <ArrowRight size={15} className="ml-auto opacity-50" />
              </button>
            );
          })}
        </div>
      )}

      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-[258px] flex-col border-r border-slate-200/80 bg-white px-5 py-7 lg:flex">
          <button
            onClick={() => router.push("/")}
            className="mb-10 flex items-center gap-3 px-2 text-left"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <GraduationCap size={23} />
            </div>
            <div>
              <p className="text-[17px] font-extrabold tracking-tight text-slate-900">
                kurs<span className="text-indigo-600">bedriften</span>
              </p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.19em] text-slate-400">
                Administrasjon
              </p>
            </div>
          </button>

          <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
            Arbeidsområde
          </p>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                    item.active
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                  {item.active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto">
            <div className="mb-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                <Activity size={18} />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Hold oversikten
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Følg opp kurs, deltakere og oppmøte fra ett sted.
              </p>
            </div>

            <button
              onClick={() => router.push("/settings")}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Settings size={18} />
              Innstillinger
            </button>

            <div className="mt-4 flex items-center gap-3 border-t border-slate-100 px-2 pt-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-extrabold text-indigo-700">
                {initials(userName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">
                  {userName}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {dashboard?.user?.role === "admin"
                    ? "Administrator"
                    : "Kontoransatt"}
                </p>
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 lg:ml-[258px]">
          {/* Top bar */}
          <div className="hidden h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/80 px-8 lg:flex xl:px-10">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Arbeidsområde</span>
              <span>/</span>
              <span className="font-semibold text-slate-700">Oversikt</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  placeholder="Søk i oversikten..."
                  className="w-56 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      router.push("/participants");
                    }
                  }}
                />
              </div>
              <button
                onClick={() => void loadDashboard()}
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50"
                aria-label="Oppdater oversikten"
                title="Oppdater"
              >
                <RefreshCw size={17} />
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-extrabold text-indigo-700">
                {initials(userName)}
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-7 sm:py-9 xl:px-10">
            {/* Welcome */}
            <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Administrasjonspanel
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-[38px]">
                  {getGreeting()}, {firstName}
                  <span className="ml-2 inline-block origin-bottom-right animate-[wave_1.8s_ease-in-out_infinite]">
                    👋
                  </span>
                </h1>
                <p className="mt-2 text-sm text-slate-500 sm:text-base">
                  Her er statusen for Kursbedriften akkurat nå.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
                  <CalendarDays size={17} className="text-indigo-500" />
                  {today ? formatDate(today) : "Henter dato..."}
                </div>
                <button
                  onClick={() => {
                    setRegisterError("");
                    setRegisterSuccess("");
                    setRegisterParticipantOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700"
                >
                  <Plus size={18} />
                  Registrer deltaker
                </button>
              </div>
            </section>

            {loadError && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <AlertCircle size={19} className="mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold">Kunne ikke laste oversikten</p>
                  <p className="mt-1">{loadError}</p>
                </div>
                <button
                  onClick={() => void loadDashboard()}
                  className="rounded-lg bg-white px-3 py-2 font-bold text-rose-700 shadow-sm"
                >
                  Prøv igjen
                </button>
              </div>
            )}

            {/* Statistics */}
            <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Deltakere"
                value={stats?.participants}
                description="Registrert i systemet"
                icon={Users}
                accent="indigo"
                loading={loading}
              />
              <StatCard
                title="Aktive kurs"
                value={stats?.activeOfferings}
                description="Kurs som har startet"
                icon={BookOpen}
                accent="emerald"
                loading={loading}
              />
              <StatCard
                title="Lærere"
                value={stats?.teachers}
                description="Registrerte lærere"
                icon={GraduationCap}
                accent="violet"
                loading={loading}
              />
              <StatCard
                title="Planlagte kurs"
                value={stats?.plannedOfferings}
                description="Kurs som ikke har startet"
                icon={CalendarDays}
                accent="amber"
                loading={loading}
              />
            </section>

            {/* Today's courses + quick actions */}
            <section className="mb-8 grid grid-cols-1 gap-6 2xl:grid-cols-[1.55fr_0.85fr]">
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <CalendarDays size={18} />
                      </div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Kurs i dag
                      </h2>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {today ? formatDate(today) : "Henter dagens dato"}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/course-planning")}
                    className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 transition hover:text-indigo-800"
                  >
                    Kursplanlegging <ArrowRight size={15} />
                  </button>
                </div>

                <div className="p-5 sm:p-6">
                  {loading ? (
                    <LoadingRows />
                  ) : dashboard?.todayCourses.length ? (
                    <div className="space-y-3">
                      {dashboard.todayCourses.map((course, index) => (
                        <div
                          key={course.session_id}
                          className="group flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-indigo-100 hover:bg-indigo-50/40 sm:flex-row sm:items-center"
                        >
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                              index % 3 === 0
                                ? "bg-indigo-100 text-indigo-700"
                                : index % 3 === 1
                                  ? "bg-violet-100 text-violet-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            <BookOpen size={21} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-extrabold text-slate-800">
                              {course.course_name}
                            </h3>
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                              <UserRound size={14} />
                              {course.teacher_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 sm:justify-end">
                            <div className="text-left sm:text-right">
                              <p className="text-sm font-bold text-slate-700">
                                {course.participant_count} deltakere
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                Økt {course.session_number}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                                course.teacher_assigned
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {course.teacher_assigned
                                ? "Lærer tildelt"
                                : "Mangler lærer"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={CalendarDays}
                      title="Ingen kurs i dag"
                      description="Det er ingen kursøkter planlagt for dagens dato."
                    />
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-base font-extrabold text-slate-900">
                    Snarveier
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Gå rett til det du trenger.
                  </p>
                </div>

                <div className="space-y-3">
                  <QuickAction
                    icon={UserRound}
                    title="Ny deltaker"
                    description="Registrer og meld på en deltaker"
                    color="indigo"
                    onClick={() => {
                      setRegisterError("");
                      setRegisterSuccess("");
                      setRegisterParticipantOpen(true);
                    }}
                  />
                  <QuickAction
                    icon={Users}
                    title="Deltakeroversikt"
                    description="Se og finn registrerte deltakere"
                    color="emerald"
                    onClick={() => router.push("/participants")}
                  />
                  <QuickAction
                    icon={CalendarDays}
                    title="Planlegg kurs"
                    description="Opprett kurs med fem ukentlige økter"
                    color="violet"
                    onClick={() => router.push("/course-planning")}
                  />
                  <QuickAction
                    icon={GraduationCap}
                    title="Læreroversikt"
                    description="Se lærere og fagtilknytning"
                    color="amber"
                    onClick={() => router.push("/teachers")}
                  />
                </div>
              </div>
            </section>

            {/* Course status + recent participants */}
            <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Kursstatus
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Status basert på datoene i kursplanene.
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <Activity size={19} />
                  </div>
                </div>

                <div className="space-y-5">
                  <CourseStatusRow
                    label="Aktive kurs"
                    value={stats?.activeOfferings ?? 0}
                    total={
                      (stats?.activeOfferings ?? 0) +
                      (stats?.plannedOfferings ?? 0) +
                      (stats?.completedOfferings ?? 0)
                    }
                    color="bg-emerald-500"
                  />
                  <CourseStatusRow
                    label="Planlagte kurs"
                    value={stats?.plannedOfferings ?? 0}
                    total={
                      (stats?.activeOfferings ?? 0) +
                      (stats?.plannedOfferings ?? 0) +
                      (stats?.completedOfferings ?? 0)
                    }
                    color="bg-indigo-500"
                  />
                  <CourseStatusRow
                    label="Fullførte kurs"
                    value={stats?.completedOfferings ?? 0}
                    total={
                      (stats?.activeOfferings ?? 0) +
                      (stats?.plannedOfferings ?? 0) +
                      (stats?.completedOfferings ?? 0)
                    }
                    color="bg-slate-400"
                  />
                </div>

                <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                  Kurs regnes som aktive fra første kursdato til og med siste
                  kursdato.
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Nylig registrerte
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Deltakere sortert etter siste registrering.
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/participants")}
                    className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Alle <ArrowRight size={15} />
                  </button>
                </div>

                <div className="divide-y divide-slate-100 px-5 sm:px-6">
                  {loading ? (
                    <LoadingRows />
                  ) : dashboard?.recentParticipants.length ? (
                    dashboard.recentParticipants.map((participant, index) => (
                      <div
                        key={participant.id}
                        className="flex items-center gap-3 py-4"
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                            index % 4 === 0
                              ? "bg-indigo-100 text-indigo-700"
                              : index % 4 === 1
                                ? "bg-emerald-100 text-emerald-700"
                                : index % 4 === 2
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-violet-100 text-violet-700"
                          }`}
                        >
                          {initials(participant.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {participant.name}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                            <Phone size={12} />
                            {participant.phone_number}
                          </p>
                        </div>
                        <div className="hidden max-w-[150px] text-right sm:block">
                          <p className="truncate text-xs font-semibold text-slate-600">
                            {participant.course_names.length
                              ? participant.course_names.join(", ")
                              : "Ingen kurs"}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {formatRelativeDate(participant.registered_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon={Users}
                      title="Ingen deltakere ennå"
                      description="Registrerte deltakere vil vises her."
                    />
                  )}
                </div>
              </div>
            </section>

            {/* Attention */}
            <section className="mb-8 overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-sm">
              <div className="flex items-start gap-3 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50/50 px-5 py-5 sm:px-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Trenger oppmerksomhet
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Oppgaver som kan trenge oppfølging fra kontoret.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <AttentionItem
                  icon={UserRound}
                  count={attention?.missingPlacement ?? 0}
                  title="Mangler kursplassering"
                  description="Deltakere uten påmelding til et planlagt kurs."
                  color="amber"
                  loading={loading}
                  onClick={() => router.push("/participants")}
                />
                <AttentionItem
                  icon={GraduationCap}
                  count={attention?.missingTeacher ?? 0}
                  title="Mangler lærer"
                  description="Planlagte kurs uten en tilknyttet lærer."
                  color="rose"
                  loading={loading}
                  onClick={() => router.push("/teachers")}
                />
                <AttentionItem
                  icon={ClipboardCheck}
                  count={attention?.highAbsence ?? 0}
                  title="Høyt fravær"
                  description="Deltakere med minst 30 % fravær."
                  color="violet"
                  loading={loading}
                  onClick={() => router.push("/teachers/attendance")}
                />
              </div>
            </section>

            {/* Bottom summary */}
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <SummaryCard
                icon={Users}
                label="Deltakere totalt"
                value={stats?.participants}
                loading={loading}
              />
              <SummaryCard
                icon={BookOpen}
                label="Fag i systemet"
                value={stats?.courses}
                loading={loading}
              />
              <SummaryCard
                icon={GraduationCap}
                label="Lærere"
                value={stats?.teachers}
                loading={loading}
              />
              <SummaryCard
                icon={Check}
                label="Fullførte kurs"
                value={stats?.completedOfferings}
                loading={loading}
              />
            </section>

            <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200/80 pt-5 text-xs text-slate-400 sm:flex-row">
              <p>Kursbedriften AS · Administrasjonssystem</p>
              <p>Informasjonen hentes fra systemets registrerte data.</p>
            </footer>
          </div>
        </main>
      </div>

      {/* Register participant modal */}
      {registerParticipantOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !registering) {
              setRegisterParticipantOpen(false);
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
              <div>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <UserRound size={21} />
                </div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">
                  Registrer deltaker
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Legg inn kontaktinformasjon og velg kurs.
                </p>
              </div>
              <button
                onClick={() => setRegisterParticipantOpen(false)}
                disabled={registering}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Lukk"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              {registerError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <p>{registerError}</p>
                </div>
              )}

              {registerSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                  <Check size={17} />
                  {registerSuccess}
                </div>
              )}

              <div>
                <label
                  htmlFor="participant-name"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Fullt navn
                </label>
                <input
                  id="participant-name"
                  value={participantName}
                  onChange={(event) => setParticipantName(event.target.value)}
                  placeholder="F.eks. Kari Nordmann"
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div>
                <label
                  htmlFor="participant-phone"
                  className="mb-2 block text-sm font-bold text-slate-700"
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
                    setParticipantPhone(
                      event.target.value.replace(/\D/g, "").slice(0, 8)
                    )
                  }
                  placeholder="8 siffer"
                  autoComplete="tel"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700">
                      Velg kurs
                    </label>
                    <p className="mt-1 text-xs text-slate-400">
                      Velg ett eller flere oppsatte kurs.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                    {selectedOfferings.length} valgt
                  </span>
                </div>

                {offerings.length ? (
                  <div className="space-y-2">
                    {offerings.map((offering) => {
                      const selected = selectedOfferings.includes(offering.id);

                      return (
                        <button
                          key={offering.id}
                          type="button"
                          onClick={() => toggleOffering(offering.id)}
                          className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                            selected
                              ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100"
                              : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                              selected
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300 bg-white text-transparent"
                            }`}
                          >
                            <Check size={13} strokeWidth={3} />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-slate-800">
                              {offering.course_name}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays size={12} />
                                {formatShortDate(offering.start_date)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock3 size={12} />
                                {offering.session_count} økter
                              </span>
                            </span>
                          </span>

                          <span className="text-xs font-semibold text-slate-400">
                            #{offering.id}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center">
                    <CalendarDays
                      size={22}
                      className="mx-auto mb-2 text-slate-400"
                    />
                    <p className="text-sm font-bold text-slate-700">
                      Ingen tilgjengelige kurs
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Opprett et kurs med kursdatoer før du melder på deltakere.
                    </p>
                    <button
                      onClick={() => router.push("/course-planning")}
                      className="mt-3 text-sm font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Gå til kursplanlegging →
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                onClick={() => setRegisterParticipantOpen(false)}
                disabled={registering}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Avbryt
              </button>
              <button
                onClick={() => void registerParticipant()}
                disabled={registering || offerings.length === 0}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {registering ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Registrerer...
                  </>
                ) : (
                  <>
                    <Plus size={17} />
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

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  accent,
  loading,
}: {
  title: string;
  value: number | undefined;
  description: string;
  icon: React.ElementType;
  accent: "indigo" | "emerald" | "violet" | "amber";
  loading: boolean;
}) {
  const styles = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">
            {loading ? (
              <span className="inline-block h-8 w-12 animate-pulse rounded-lg bg-slate-100" />
            ) : (
              value ?? 0
            )}
          </p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${styles[accent]}`}>
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">{description}</p>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  color,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: "indigo" | "emerald" | "violet" | "amber";
  onClick: () => void;
}) {
  const styles = {
    indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600",
    violet: "bg-violet-50 text-violet-600 group-hover:bg-violet-600",
    amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-500",
  };

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-slate-200 hover:bg-slate-50"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition group-hover:text-white ${styles[color]}`}
      >
        <Icon size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-800">{title}</span>
        <span className="mt-1 block text-xs text-slate-400">{description}</span>
      </span>
      <ArrowRight
        size={16}
        className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600"
      />
    </button>
  );
}

function CourseStatusRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? Math.min((value / total) * 100, 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-600">{label}</span>
        <span className="text-sm font-extrabold text-slate-800">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function AttentionItem({
  icon: Icon,
  count,
  title,
  description,
  color,
  loading,
  onClick,
}: {
  icon: React.ElementType;
  count: number;
  title: string;
  description: string;
  color: "amber" | "rose" | "violet";
  loading: boolean;
  onClick: () => void;
}) {
  const styles = {
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 p-5 text-left transition hover:bg-slate-50 sm:p-6"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles[color]}`}>
        <Icon size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-slate-800">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        <p className="mt-3 text-2xl font-black tracking-tight text-slate-900">
          {loading ? "—" : count}
        </p>
      </div>
      <ArrowDownRight size={16} className="mt-1 shrink-0 text-slate-300" />
    </button>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Icon size={18} />
      </div>
      <p className="text-2xl font-black tracking-tight text-slate-900">
        {loading ? "—" : value ?? 0}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-400">{label}</p>
    </div>
  );
}

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
    <div className="px-4 py-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={22} />
      </div>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 py-1">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-100 p-4"
        >
          <div className="h-11 w-11 rounded-xl bg-slate-100" />
          <div className="flex-1">
            <div className="h-3 w-1/3 rounded bg-slate-100" />
            <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}