"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type ParticipantReportRow = {
  participant_id: number;
  participant_name: string;
  phone_number: string;
  course_name: string;
  offering_id: number;
};

type CompletionReport = {
  totalCompletedEnrollments: number;
  uniqueParticipants: number;
  byCourse: {
    course_id: number;
    course_name: string;
    completed_enrollments: number;
  }[];
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

  const [participantTab, setParticipantTab] =
    useState<"active" | "planned">("active");

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
        throw new Error(result.error ?? "Kunne ikke hente oversikten.");
      }

      setDashboard(result as DashboardData);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Kunne ikke laste oversikten."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadRegistrationOfferings = useCallback(async () => {
    try {
      const response = await fetch("/api/participants/registration-options", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Kunne ikke hente tilgjengelige kurs.");
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
        throw new Error(result.error ?? "Kunne ikke registrere deltakeren.");
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
  const stats = dashboard?.stats;
  const attention = dashboard?.attention;

  const participantRows =
    participantTab === "active"
      ? dashboard?.participantReports?.active ?? []
      : dashboard?.participantReports?.planned ?? [];

  const navItems = [
    { label: "Oversikt", icon: LayoutDashboard, href: "/" },
    { label: "Deltakere", icon: Users, href: "/participants" },
    { label: "Kurs", icon: BookOpen, href: "/courses" },
    { label: "Lærere", icon: GraduationCap, href: "/teachers" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Mobile header */}
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

        <button
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="rounded-lg border border-slate-200 p-2"
          aria-label="Åpne meny"
        >
          {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-30 border-b border-slate-200 bg-white p-3 shadow-lg lg:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                onClick={() => {
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
        </div>
      )}

      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        {/* Sidebar */}
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
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </button>
              );
            })}
          </nav>

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
                  {dashboard?.user?.role === "admin"
                    ? "Administrator"
                    : "Kontoransatt"}
                </span>
              </span>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 lg:ml-60">
          <header className="hidden h-14 items-center justify-between border-b border-slate-200 bg-white px-8 lg:flex">
            <div className="text-sm text-slate-500">
              Administrasjon <span className="mx-2 text-slate-300">/</span>
              <span className="font-semibold text-slate-800">Oversikt</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/admin/enrollments")}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Search size={15} />
                Påmeldingsrapport
              </button>
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
            {/* Welcome */}
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
                  {dashboard?.today ? formatDate(dashboard.today) : "Henter dato..."}
                </span>
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

            {/* Key statistics */}
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

            {/* Today's courses and actions */}
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_0.8fr]">
              <Panel
                title="Kurs i dag"
                subtitle={
                  dashboard?.today ? formatDate(dashboard.today) : "Dagens kursøkter"
                }
                icon={CalendarDays}
                action={
                  <button
                    onClick={() => router.push("/courses")}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Alle kurs →
                  </button>
                }
              >
                {loading ? (
                  <LoadingRows />
                ) : dashboard?.todayCourses?.length ? (
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
                  <EmptyState
                    icon={CalendarDays}
                    title="Ingen kurs i dag"
                    description="Det er ingen kursøkter planlagt for i dag."
                  />
                )}
              </Panel>

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
                    onClick={() => router.push("/admin/enrollments")}
                  />
                  <QuickAction
                    icon={CalendarDays}
                    title="Planlegg kurs"
                    onClick={() => router.push("/course-planning")}
                  />
                  <QuickAction
                    icon={GraduationCap}
                    title="Læreroversikt"
                    onClick={() => router.push("/teachers")}
                  />
                </div>
              </Panel>
            </section>

            {/* Enrolled participants */}
            <Panel
              title="Påmeldte deltakere"
              subtitle="Deltakere fordelt på aktive og planlagte kurs."
              icon={Users}
              action={
                <button
                  onClick={() => router.push("/admin/enrollments")}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Full rapport →
                </button>
              }
            >
              <div className="mb-3 flex gap-2 border-b border-slate-100">
                <TabButton
                  active={participantTab === "active"}
                  onClick={() => setParticipantTab("active")}
                  label="Aktive"
                  count={dashboard?.participantReports?.active?.length ?? 0}
                />
                <TabButton
                  active={participantTab === "planned"}
                  onClick={() => setParticipantTab("planned")}
                  label="Planlagte"
                  count={dashboard?.participantReports?.planned?.length ?? 0}
                />
              </div>

              {loading ? (
                <LoadingRows />
              ) : participantRows.length ? (
                <div className="divide-y divide-slate-100">
                  {participantRows.slice(0, 6).map((row) => (
                    <div
                      key={`${row.offering_id}-${row.participant_id}`}
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
                  {participantRows.length > 6 && (
                    <button
                      onClick={() => router.push("/admin/enrollments")}
                      className="w-full pt-3 text-left text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Vis alle {participantRows.length} påmeldinger →
                    </button>
                  )}
                </div>
              ) : (
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

            {/* Completion report */}
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
                    const total =
                      dashboard.completionReport.totalCompletedEnrollments;
                    const percentage =
                      total > 0
                        ? Math.min(
                            (course.completed_enrollments / total) * 100,
                            100
                          )
                        : 0;

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

            {/* Items requiring follow-up */}
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

            <footer className="border-t border-slate-200 pt-4 text-xs text-slate-400">
              Kursbedriften AS · Administrasjonssystem
            </footer>
          </div>
        </main>
      </div>

      {/* Register participant modal */}
      {registerParticipantOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !registering) {
              setRegisterParticipantOpen(false);
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
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
              {registerError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  {registerError}
                </div>
              )}

              {registerSuccess && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                  <Check size={17} />
                  {registerSuccess}
                </div>
              )}

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
                  onChange={(event) => setParticipantName(event.target.value)}
                  placeholder="F.eks. Kari Nordmann"
                  autoComplete="name"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                />
              </div>

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
                    setParticipantPhone(
                      event.target.value.replace(/\D/g, "").slice(0, 8)
                    )
                  }
                  placeholder="8 siffer"
                  autoComplete="tel"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-sm font-bold text-slate-700">
                    Velg kurs
                  </label>
                  <span className="text-xs font-semibold text-indigo-700">
                    {selectedOfferings.length} valgt
                  </span>
                </div>

                {offerings.length ? (
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {offerings.map((offering) => {
                      const selected = selectedOfferings.includes(offering.id);

                      return (
                        <button
                          key={offering.id}
                          type="button"
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

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:justify-end">
              <button
                onClick={() => setRegisterParticipantOpen(false)}
                disabled={registering}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Avbryt
              </button>
              <button
                onClick={() => void registerParticipant()}
                disabled={registering || offerings.length === 0}
                className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {registering ? (
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
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-extrabold text-slate-900">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

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
          {loading ? "—" : value ?? 0}
        </p>
      </div>
    </div>
  );
}

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
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles[tone]}`}>
        <ShieldAlert size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-800">{title}</span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {description}
        </span>
      </span>
      <span className="text-lg font-black text-slate-900">
        {loading ? "—" : count}
      </span>
    </button>
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

function LoadingRows() {
  return (
    <div className="space-y-3">
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
