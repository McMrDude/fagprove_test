"use client";

import { useState } from "react";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  ClipboardCheck,
  BarChart3,
  LogOut,
  Bell,
  Search,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  CalendarPlus,
  ClipboardList,
} from "lucide-react";


// --------------------------------------------------
// MOCK DATA
// --------------------------------------------------

const todayCourses = [
  {
    time: "09:00",
    subject: "Engelsk",
    teacher: "Kari Hansen",
    participants: 8,
    status: "upcoming",
    info: "Om 45 minutter",
  },
  {
    time: "13:00",
    subject: "Matematikk",
    teacher: "Per Johansen",
    participants: 12,
    status: "upcoming",
    info: "Om 4 timer",
  },
];

const recentParticipants = [
  {
    name: "Anna Hansen",
    course: "Engelsk",
    time: "10:42",
  },
  {
    name: "Erik Olsen",
    course: "Matematikk",
    time: "09:17",
  },
  {
    name: "Sara Berg",
    course: "Kjemi",
    time: "I går",
  },
  {
    name: "Jonas Nilsen",
    course: "Historie",
    time: "I går",
  },
];


// --------------------------------------------------
// SIDEBAR LINK
// --------------------------------------------------

function SidebarLink({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      }`}
    >
      <span
        className={`transition ${
          active
            ? "text-blue-600 dark:text-blue-400"
            : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
        }`}
      >
        {icon}
      </span>

      {label}
    </button>
  );
}


// --------------------------------------------------
// STAT ITEM
// --------------------------------------------------

function SmallStat({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {number}
      </div>

      <div className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </div>
    </div>
  );
}


// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function DashboardPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [registerParticipantOpen, setRegisterParticipantOpen] = useState(false);

  const [participantName, setParticipantName] = useState("");
  const [participantPhone, setParticipantPhone] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  const availableCourses = [
    "Engelsk",
    "Matematikk",
    "Historie",
    "Kjemi",
    "Fysikk",
  ];

  function toggleCourse(course: string) {
    setSelectedCourses((current) =>
      current.includes(course)
        ? current.filter((item) => item !== course)
        : [...current, course]
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">


      {/* ==================================================
          MOBILE HEADER
      ================================================== */}

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
            K
          </div>

          <div>
            <div className="text-sm font-bold">
              Kursbedriften
            </div>

            <div className="text-[11px] text-slate-400">
              Administrasjon
            </div>
          </div>
        </div>


        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {mobileMenuOpen ? (
            <X size={22} />
          ) : (
            <Menu size={22} />
          )}
        </button>

      </header>


      {/* ==================================================
          MOBILE MENU
      ================================================== */}

      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-30 border-b border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-950 lg:hidden">

          <nav className="space-y-1">

            <SidebarLink
              icon={<LayoutDashboard size={18} />}
              label="Oversikt"
              active
            />

            <SidebarLink
              icon={<Users size={18} />}
              label="Deltakere"
            />

            <SidebarLink
              icon={<BookOpen size={18} />}
              label="Kurs"
            />

            <SidebarLink
              icon={<GraduationCap size={18} />}
              label="Lærere"
            />

            <SidebarLink
              icon={<ClipboardCheck size={18} />}
              label="Oppmøte"
            />

            <SidebarLink
              icon={<BarChart3 size={18} />}
              label="Rapporter"
            />

          </nav>

          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">

            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
              <LogOut size={18} />
              Logg ut
            </button>

          </div>

        </div>
      )}


      {/* ==================================================
          DESKTOP SIDEBAR
      ================================================== */}

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:flex">

        {/* Logo */}

        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6 dark:border-slate-800">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm">
            K
          </div>

          <div>
            <div className="font-bold tracking-tight">
              Kursbedriften
            </div>

            <div className="text-xs text-slate-400">
              Administrasjon
            </div>
          </div>

        </div>


        {/* Navigation */}

        <nav className="flex-1 space-y-1 px-3 py-5">

          <SidebarLink
            icon={<LayoutDashboard size={18} />}
            label="Oversikt"
            active
          />

          <SidebarLink
            icon={<Users size={18} />}
            label="Deltakere"
          />

          <SidebarLink
            icon={<BookOpen size={18} />}
            label="Kurs"
          />

          <SidebarLink
            icon={<GraduationCap size={18} />}
            label="Lærere"
          />

          <SidebarLink
            icon={<ClipboardCheck size={18} />}
            label="Oppmøte"
          />

          <SidebarLink
            icon={<BarChart3 size={18} />}
            label="Rapporter"
          />

        </nav>


        {/* Account */}

        <div className="border-t border-slate-200 p-4 dark:border-slate-800">

          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              B
            </div>

            <div className="min-w-0">

              <div className="truncate text-sm font-semibold">
                Benjamin
              </div>

              <div className="text-xs text-slate-400">
                Administrator
              </div>

            </div>

          </div>


          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">

            <LogOut size={18} />

            Logg ut

          </button>

        </div>

      </aside>


      {/* ==================================================
          MAIN CONTENT
      ================================================== */}

      <main className="lg:ml-64">

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">


          {/* ==================================================
              TOP BAR
          ================================================== */}

          <div className="mb-8 flex items-center justify-between">

            <div>

              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Tirsdag 5. oktober
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                God morgen, Benjamin 👋
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Her er det som skjer hos Kursbedriften i dag.
              </p>

            </div>


            <div className="hidden items-center gap-2 sm:flex">

              <button className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
                <Search size={18} />
              </button>

              <button className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">

                <Bell size={18} />

                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />

              </button>

            </div>

          </div>


          {/* ==================================================
              TODAY'S COURSES
          ================================================== */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">

              <div className="flex items-center justify-between">

                <div>

                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <Clock size={14} />
                    Dagens program
                  </div>

                  <h2 className="text-lg font-bold">
                    Kurs i dag
                  </h2>

                </div>


                <button className="hidden items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 sm:flex">

                  Se kalender

                  <ChevronRight size={16} />

                </button>

              </div>

            </div>


            <div className="divide-y divide-slate-100 dark:divide-slate-800">

              {todayCourses.map((course) => (

                <div
                  key={course.time}
                  className="group flex items-center gap-4 px-5 py-5 transition hover:bg-slate-50 dark:hover:bg-slate-800/50 sm:px-6"
                >

                  {/* Time */}

                  <div className="w-14 shrink-0 text-center">

                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      {course.time}
                    </div>

                  </div>


                  {/* Timeline */}

                  <div className="relative flex h-14 w-1 shrink-0 justify-center">

                    <div className="h-full w-px bg-slate-200 dark:bg-slate-700" />

                    <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-900" />

                  </div>


                  {/* Course info */}

                  <div className="min-w-0 flex-1">

                    <div className="mb-1 flex flex-wrap items-center gap-2">

                      <h3 className="font-bold capitalize">
                        {course.subject}
                      </h3>

                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                        {course.info}
                      </span>

                    </div>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {course.teacher} · {course.participants} deltakere
                    </p>

                  </div>


                  {/* Arrow */}

                  <ChevronRight
                    size={18}
                    className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500"
                  />

                </div>

              ))}

            </div>

          </section>


          {/* ==================================================
              QUICK ACTIONS
          ================================================== */}

          <section className="mt-6">

            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Snarveier
            </div>


            <div className="grid gap-3 sm:grid-cols-3">

              <button
                onClick={() => setRegisterParticipantOpen(true)}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900"
              >

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                  <UserPlus size={19} />
                </div>

                <div className="flex-1">

                  <div className="text-sm font-bold">
                    Registrer deltaker
                  </div>

                  <div className="text-xs text-slate-400">
                    Legg til en ny deltaker
                  </div>

                </div>

                <ChevronRight
                  size={17}
                  className="text-slate-300 group-hover:text-blue-500"
                />

              </button>


              <button className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <CalendarPlus size={19} />
                </div>

                <div className="flex-1">

                  <div className="text-sm font-bold">
                    Opprett kurs
                  </div>

                  <div className="text-xs text-slate-400">
                    Planlegg et nytt kurs
                  </div>

                </div>

                <ChevronRight
                  size={17}
                  className="text-slate-300 group-hover:text-emerald-500"
                />

              </button>


              <button className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
                  <ClipboardList size={19} />
                </div>

                <div className="flex-1">

                  <div className="text-sm font-bold">
                    Se oppmøte
                  </div>

                  <div className="text-xs text-slate-400">
                    Sjekk dagens fravær
                  </div>

                </div>

                <ChevronRight
                  size={17}
                  className="text-slate-300 group-hover:text-violet-500"
                />

              </button>

            </div>

          </section>


          {/* ==================================================
              LOWER CONTENT
          ================================================== */}

          <div className="mt-8 grid gap-6 lg:grid-cols-5">


            {/* ==================================================
                COURSE STATUS
            ================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">

              <div className="mb-6">

                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Kursstatus
                </div>

                <h2 className="text-lg font-bold">
                  Slik ser det ut nå
                </h2>

              </div>


              <div className="space-y-5">

                <SmallStat
                  number="5"
                  label="aktive kurs"
                />

                <SmallStat
                  number="2"
                  label="planlagte kurs"
                />

                <SmallStat
                  number="3"
                  label="fullførte kurs"
                />

              </div>


              <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">

                <div className="flex items-center justify-between text-sm">

                  <span className="text-slate-500">
                    Totalt denne perioden
                  </span>

                  <span className="font-bold">
                    10 kurs
                  </span>

                </div>

              </div>

            </section>


            {/* ==================================================
                RECENT PARTICIPANTS
            ================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">

              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 dark:border-slate-800">

                <div>

                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Siste registreringer
                  </div>

                  <h2 className="text-lg font-bold">
                    Nye deltakere
                  </h2>

                </div>

                <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                  Se alle
                </button>

              </div>


              <div className="divide-y divide-slate-100 dark:divide-slate-800">

                {recentParticipants.map((participant) => (

                  <div
                    key={participant.name}
                    className="flex items-center gap-3 px-5 py-4"
                  >

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {participant.name.charAt(0)}
                    </div>


                    <div className="min-w-0 flex-1">

                      <div className="truncate text-sm font-semibold">
                        {participant.name}
                      </div>

                      <div className="text-xs text-slate-400">
                        {participant.course}
                      </div>

                    </div>


                    <div className="text-xs text-slate-400">
                      {participant.time}
                    </div>

                  </div>

                ))}

              </div>

            </section>

          </div>


          {/* ==================================================
              NEEDS ATTENTION
          ================================================== */}

          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/50 dark:bg-amber-950/20 sm:p-6">

            <div className="mb-5 flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
                <AlertTriangle size={19} />
              </div>

              <div>

                <h2 className="font-bold text-slate-900 dark:text-white">
                  Trenger oppmerksomhet
                </h2>

                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Noen ting kan være greit å ta tak i.
                </p>

              </div>

            </div>


            <div className="grid gap-3 md:grid-cols-3">


              {/* Missing course */}

              <div className="rounded-xl border border-amber-200/70 bg-white p-4 dark:border-amber-900/40 dark:bg-slate-900">

                <div className="mb-2 flex items-center justify-between">

                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    2 deltakere
                  </span>

                  <Users
                    size={16}
                    className="text-slate-300"
                  />

                </div>

                <div className="mb-3 text-sm font-semibold">
                  Mangler kursplassering
                </div>

                <button className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  Finn kurs →
                </button>

              </div>


              {/* Missing teacher */}

              <div className="rounded-xl border border-amber-200/70 bg-white p-4 dark:border-amber-900/40 dark:bg-slate-900">

                <div className="mb-2 flex items-center justify-between">

                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    1 kurs
                  </span>

                  <GraduationCap
                    size={16}
                    className="text-slate-300"
                  />

                </div>

                <div className="mb-3 text-sm font-semibold">
                  Mangler lærer
                </div>

                <button className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  Tildel lærer →
                </button>

              </div>


              {/* Absence */}

              <div className="rounded-xl border border-amber-200/70 bg-white p-4 dark:border-amber-900/40 dark:bg-slate-900">

                <div className="mb-2 flex items-center justify-between">

                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    3 deltakere
                  </span>

                  <ClipboardCheck
                    size={16}
                    className="text-slate-300"
                  />

                </div>

                <div className="mb-3 text-sm font-semibold">
                  Har høyt fravær
                </div>

                <button className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  Se fravær →
                </button>

              </div>

            </div>

          </section>


          {/* ==================================================
              SUMMARY STRIP
          ================================================== */}

          <section className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-6">

            <SmallStat
              number="47"
              label="deltakere"
            />

            <div className="hidden h-8 w-px bg-slate-200 dark:bg-slate-800 sm:block" />

            <SmallStat
              number="7"
              label="aktive kurs"
            />

            <div className="hidden h-8 w-px bg-slate-200 dark:bg-slate-800 sm:block" />

            <SmallStat
              number="5"
              label="lærere"
            />

            <div className="hidden h-8 w-px bg-slate-200 dark:bg-slate-800 sm:block" />

            <SmallStat
              number="2"
              label="planlagte"
            />

            <div className="ml-auto hidden items-center gap-2 text-xs font-medium text-slate-400 lg:flex">

              <CheckCircle2 size={15} />

              Systemet fungerer som normalt

            </div>

          </section>


        </div>

      </main>

      {registerParticipantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">

          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">

            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">

              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Ny registrering
                </div>

                <h2 className="text-xl font-bold">
                  Registrer deltaker
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Fyll inn informasjonen mens du snakker med personen.
                </p>
              </div>

              <button
                onClick={() => setRegisterParticipantOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>

            </div>


            {/* Form */}
            <div className="space-y-5 p-6">

              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Navn
                </label>

                <input
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="F.eks. Ola Nordmann"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>


              {/* Phone */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Telefonnummer
                </label>

                <input
                  type="tel"
                  value={participantPhone}
                  onChange={(e) => setParticipantPhone(e.target.value)}
                  placeholder="F.eks. 12345678"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>


              {/* Courses */}
              <div>

                <div className="mb-2">
                  <label className="block text-sm font-semibold">
                    Kurs
                  </label>

                  <p className="mt-1 text-xs text-slate-400">
                    Velg ett eller flere kurs.
                  </p>
                </div>


                <div className="grid gap-2 sm:grid-cols-2">

                  {availableCourses.map((course) => {

                    const selected = selectedCourses.includes(course);

                    return (
                      <button
                        key={course}
                        type="button"
                        onClick={() => toggleCourse(course)}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                          selected
                            ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >

                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs ${
                            selected
                              ? "border-blue-500 bg-blue-600 text-white"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {selected ? "✓" : ""}
                        </span>

                        {course}

                      </button>
                    );

                  })}

                </div>

              </div>

            </div>


            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">

              <button
                type="button"
                onClick={() => setRegisterParticipantOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Avbryt
              </button>

              <button
                type="button"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Registrer deltaker
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}