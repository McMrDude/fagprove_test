"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  ClipboardCheck,
  BarChart3,
  LogOut,
  Menu,
  X,
  Plus,
  ArrowRight,
  CalendarDays,
  Clock,
  Phone,
  UserPlus,
  BookPlus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const courses = [
  {
    name: "Engelsk",
    teacher: "Sarah Johnson",
    day: "Mandag",
    time: "17:00 – 20:00",
    students: 18,
    status: "Pågående",
  },
  {
    name: "Matematikk",
    teacher: "David Smith",
    day: "Tirsdag",
    time: "17:00 – 20:00",
    students: 21,
    status: "Pågående",
  },
  {
    name: "Historie",
    teacher: "Emma Williams",
    day: "Onsdag",
    time: "17:00 – 20:00",
    students: 16,
    status: "Planlagt",
  },
  {
    name: "Kjemi",
    teacher: "Michael Brown",
    day: "Torsdag",
    time: "17:00 – 20:00",
    students: 14,
    status: "Pågående",
  },
  {
    name: "Fysikk",
    teacher: "James Wilson",
    day: "Fredag",
    time: "17:00 – 20:00",
    students: 12,
    status: "Planlagt",
  },
];

const recentParticipants = [
  {
    name: "Anna Hansen",
    course: "Engelsk",
    phone: "912 34 567",
    date: "I dag",
  },
  {
    name: "Ola Nordmann",
    course: "Matematikk",
    phone: "923 45 678",
    date: "I går",
  },
  {
    name: "Kari Olsen",
    course: "Historie",
    phone: "934 56 789",
    date: "I går",
  },
  {
    name: "Per Hansen",
    course: "Fysikk",
    phone: "945 67 890",
    date: "02.10.2026",
  },
];

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ============================================================
          MOBILE HEADER
      ============================================================ */}

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            K
          </div>

          <span className="font-bold text-slate-900">
            Kursbedriften
          </span>
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Åpne meny"
        >
          {sidebarOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </header>

      {/* ============================================================
          MOBILE OVERLAY
      ============================================================ */}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ============================================================
          SIDEBAR
      ============================================================ */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white transition-transform duration-200 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}

          <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
              K
            </div>

            <div>
              <p className="font-bold text-slate-900">
                Kursbedriften
              </p>

              <p className="text-xs text-slate-500">
                Administrasjon
              </p>
            </div>
          </div>

          {/* Navigation */}

          <nav className="flex-1 space-y-1 p-4">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Hovedmeny
            </p>

            <SidebarLink
              icon={<LayoutDashboard className="h-5 w-5" />}
              label="Dashboard"
              active
            />

            <SidebarLink
              icon={<Users className="h-5 w-5" />}
              label="Deltakere"
            />

            <SidebarLink
              icon={<BookOpen className="h-5 w-5" />}
              label="Kurs"
            />

            <SidebarLink
              icon={<GraduationCap className="h-5 w-5" />}
              label="Lærere"
            />

            <SidebarLink
              icon={<ClipboardCheck className="h-5 w-5" />}
              label="Oppmøte"
            />

            <SidebarLink
              icon={<BarChart3 className="h-5 w-5" />}
              label="Rapporter"
            />
          </nav>

          {/* User section */}

          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-3 rounded-lg p-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                BJ
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  Benjamin
                </p>

                <p className="truncate text-xs text-slate-500">
                  Kontoransatt
                </p>
              </div>
            </div>

            <button className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
              <LogOut className="h-4 w-4" />
              Logg ut
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================
          MAIN CONTENT
      ============================================================ */}

      <main className="lg:ml-64">
        <div className="mx-auto max-w-7xl p-5 sm:p-6 lg:p-8">

          {/* ========================================================
              PAGE HEADER
          ======================================================== */}

          <div className="mb-8">
            <p className="text-sm font-medium text-blue-600">
              Dashboard
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              God morgen, Benjamin
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Her er en oversikt over kursdriften og deltakerne.
            </p>
          </div>

          {/* ========================================================
              STATISTICS
          ======================================================== */}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <StatCard
              title="Totalt antall deltakere"
              value="84"
              description="+6 denne måneden"
              icon={<Users className="h-5 w-5" />}
            />

            <StatCard
              title="Planlagte kurs"
              value="5"
              description="Alle aktive kurs"
              icon={<BookOpen className="h-5 w-5" />}
            />

            <StatCard
              title="Pågående kurs"
              value="3"
              description="Kurs som er i gang"
              icon={<Clock className="h-5 w-5" />}
            />

            <StatCard
              title="Lærere"
              value="5"
              description="Registrerte lærere"
              icon={<GraduationCap className="h-5 w-5" />}
            />

          </div>

          {/* ========================================================
              MAIN GRID
          ======================================================== */}

          <div className="mt-6 grid gap-6 xl:grid-cols-3">

            {/* ======================================================
                COURSES
            ====================================================== */}

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">

              <div className="flex items-center justify-between border-b border-slate-200 p-5">

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Aktive kurs
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Oversikt over kurs og ansvarlige lærere
                  </p>
                </div>

                <button className="hidden items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 sm:flex">
                  Se alle
                  <ArrowRight className="h-4 w-4" />
                </button>

              </div>

              <div className="divide-y divide-slate-100">

                {courses.map((course) => (
                  <div
                    key={course.name}
                    className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div className="flex items-center gap-4">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 font-semibold text-blue-600">
                        {course.name.charAt(0)}
                      </div>

                      <div>
                        <p className="font-medium text-slate-900">
                          {course.name}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {course.teacher}
                        </p>
                      </div>

                    </div>

                    <div className="flex items-center gap-5 sm:text-right">

                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {course.day}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {course.time}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {course.students}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          deltakere
                        </p>
                      </div>

                      <CourseStatus status={course.status} />

                    </div>

                  </div>
                ))}

              </div>
            </section>

            {/* ======================================================
                QUICK ACTIONS
            ====================================================== */}

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 p-5">
                <h2 className="font-semibold text-slate-900">
                  Hurtighandlinger
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Vanlige oppgaver
                </p>
              </div>

              <div className="space-y-3 p-5">

                <button className="flex w-full items-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-blue-700">
                  <UserPlus className="h-5 w-5" />
                  <span>Registrer deltaker</span>
                </button>

                <button className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  <BookPlus className="h-5 w-5" />
                  <span>Opprett kurs</span>
                </button>

                <button className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  <ClipboardCheck className="h-5 w-5" />
                  <span>Se oppmøte</span>
                </button>

              </div>

            </section>

          </div>

          {/* ========================================================
              LOWER GRID
          ======================================================== */}

          <div className="mt-6 grid gap-6 xl:grid-cols-2">

            {/* ======================================================
                RECENT PARTICIPANTS
            ====================================================== */}

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

              <div className="flex items-center justify-between border-b border-slate-200 p-5">

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Nylig registrerte
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    De siste deltakerne som er registrert
                  </p>
                </div>

                <Users className="h-5 w-5 text-slate-400" />

              </div>

              <div className="divide-y divide-slate-100">

                {recentParticipants.map((participant) => (
                  <div
                    key={participant.name}
                    className="flex items-center justify-between gap-4 p-4 transition hover:bg-slate-50"
                  >

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-600">
                        {participant.name
                          .split(" ")
                          .map((name) => name[0])
                          .join("")}
                      </div>

                      <div className="min-w-0">

                        <p className="truncate text-sm font-medium text-slate-900">
                          {participant.name}
                        </p>

                        <p className="truncate text-xs text-slate-500">
                          {participant.course}
                        </p>

                      </div>

                    </div>

                    <div className="hidden text-right sm:block">

                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Phone className="h-3 w-3" />
                        {participant.phone}
                      </div>

                      <p className="mt-1 text-xs text-slate-400">
                        {participant.date}
                      </p>

                    </div>

                  </div>
                ))}

              </div>

            </section>

            {/* ======================================================
                REPORTS
            ====================================================== */}

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 p-5">

                <h2 className="font-semibold text-slate-900">
                  Rapporter
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Informasjon om deltakere og kurs
                </p>

              </div>

              <div className="grid gap-3 p-5 sm:grid-cols-2">

                <ReportCard
                  icon={<Users className="h-5 w-5" />}
                  title="Påmeldte deltakere"
                  value="84"
                  description="Totalt påmeldt"
                />

                <ReportCard
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  title="Gjennomførte kurs"
                  value="27"
                  description="Totalt gjennomført"
                />

                <ReportCard
                  icon={<Clock className="h-5 w-5" />}
                  title="Pågående kurs"
                  value="3"
                  description="Kurs som er i gang"
                />

                <ReportCard
                  icon={<AlertCircle className="h-5 w-5" />}
                  title="Fravær"
                  value="12"
                  description="Registrerte fravær"
                />

              </div>

            </section>

          </div>

          {/* ========================================================
              THIS WEEK
          ======================================================== */}

          <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="flex items-center gap-3 border-b border-slate-200 p-5">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <CalendarDays className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Kurs denne uken
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Planlagte kursdager
                </p>
              </div>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full min-w-[700px] text-left">

                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                  <tr>
                    <th className="px-5 py-3 font-medium">
                      Kurs
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Lærer
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Dag
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Deltakere
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Status
                    </th>
                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {courses.map((course) => (
                    <tr
                      key={course.name}
                      className="transition hover:bg-slate-50"
                    >

                      <td className="px-5 py-4 text-sm font-medium text-slate-900">
                        {course.name}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {course.teacher}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-slate-400" />
                          {course.day}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {course.students}
                      </td>

                      <td className="px-5 py-4">
                        <CourseStatus status={course.status} />
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>

          </section>

        </div>
      </main>
    </div>
  );
}

/* ================================================================
   SIDEBAR LINK
================================================================ */

function SidebarLink({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <a
      href="#"
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {icon}
      {label}
    </a>
  );
}

/* ================================================================
   STAT CARD
================================================================ */

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between">

        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </div>

      </div>

      <p className="mt-3 text-xs text-slate-500">
        {description}
      </p>

    </div>
  );
}

/* ================================================================
   COURSE STATUS
================================================================ */

function CourseStatus({
  status,
}: {
  status: string;
}) {
  const isActive = status === "Pågående";

  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
        isActive
          ? "bg-green-50 text-green-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

/* ================================================================
   REPORT CARD
================================================================ */

function ReportCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <button className="group rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/50">

      <div className="flex items-center justify-between">

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-blue-100 group-hover:text-blue-600">
          {icon}
        </div>

        <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500" />

      </div>

      <p className="mt-4 text-sm font-medium text-slate-900">
        {title}
      </p>

      <div className="mt-1 flex items-baseline gap-2">

        <p className="text-2xl font-bold text-slate-900">
          {value}
        </p>

        <p className="text-xs text-slate-500">
          {description}
        </p>

      </div>

    </button>
  );
}