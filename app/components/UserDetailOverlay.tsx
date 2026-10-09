
"use client";

import { useEffect, useState } from "react";

type Course = {
    id: number;
    name: string;
};

type Props = {
    id: number;
    name: string;
    phone: string;
    onClose: () => void;
    onSaved: () => void;
};

export default function UserDetailOverlay({
    id,
    name,
    phone,
    onClose,
    onSaved,
}: Props) {
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(name);
    const [editPhone, setEditPhone] = useState(phone);

    const [userCourses, setUserCourses] = useState<Course[]>([]);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    async function loadCourses() {
        setLoading(true);
        setError("");

        try {
            const [participantResponse, allResponse] = await Promise.all([
                fetch(`/api/courses/${id}`),
                fetch("/api/courses"),
            ]);

            const participantResult = await participantResponse.json();
            const allResult = await allResponse.json();

            if (!participantResponse.ok || !participantResult.success) {
                throw new Error(
                    participantResult.error || "Kunne ikke hente deltakerens kurs."
                );
            }

            if (!allResponse.ok || !allResult.success) {
                throw new Error(
                    allResult.error || "Kunne ikke hente alle kursene."
                );
            }

            setUserCourses(participantResult.courses ?? []);
            setAllCourses(allResult.courses ?? []);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Noe gikk galt."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCourses();
    }, [id]);

    async function saveDetails() {
        if (!editName.trim() || !editPhone.trim()) {
            setError("Navn og telefonnummer må fylles ut.");
            return;
        }

        setSaving(true);
        setError("");
        setMessage("");

        try {
            const response = await fetch(`/api/participants/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName.trim(),
                    phone_number: editPhone.trim(),
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.error || "Kunne ikke oppdatere deltakeren."
                );
            }

            setEditing(false);
            setMessage("Deltakeropplysningene er lagret.");
            await onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Noe gikk galt.");
        } finally {
            setSaving(false);
        }
    }

    async function addCourse() {
        if (!selectedCourseId) {
            setError("Velg et kurs først.");
            return;
        }

        setSaving(true);
        setError("");
        setMessage("");

        try {
            const response = await fetch(
                `/api/participants/${id}/courses`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        course_id: Number(selectedCourseId),
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Kunne ikke legge til kurset.");
            }

            setSelectedCourseId("");
            setMessage("Kurset er lagt til.");
            await loadCourses();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Noe gikk galt.");
        } finally {
            setSaving(false);
        }
    }

    async function removeCourse(courseId: number, courseName: string) {
        if (!window.confirm(`Vil du fjerne ${courseName} fra deltakeren?`)) {
            return;
        }

        setSaving(true);
        setError("");
        setMessage("");

        try {
            const response = await fetch(
                `/api/participants/${id}/courses?course_id=${courseId}`,
                { method: "DELETE" }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Kunne ikke fjerne kurset.");
            }

            setMessage("Kurset er fjernet.");
            await loadCourses();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Noe gikk galt.");
        } finally {
            setSaving(false);
        }
    }

    async function deleteParticipant() {
        if (
            !window.confirm(
                `Er du sikker på at du vil slette ${name}? Denne handlingen kan ikke angres.`
            )
        ) {
            return;
        }

        setSaving(true);
        setError("");

        try {
            const response = await fetch(`/api/participants/${id}`, {
                method: "DELETE",
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Kunne ikke slette deltakeren.");
            }

            await onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Noe gikk galt.");
        } finally {
            setSaving(false);
        }
    }

    const availableCourses = allCourses.filter(
        (course) => !userCourses.some((userCourse) => userCourse.id === course.id)
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            Deltakerinformasjon
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Rediger opplysninger og administrer kurs.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Lukk"
                        className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                        {error}
                    </p>
                )}

                {message && (
                    <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                        {message}
                    </p>
                )}

                <section className="mt-5">
                    <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">
                        Opplysninger
                    </h3>

                    {editing ? (
                        <div className="space-y-3">
                            <label className="block text-sm text-slate-600 dark:text-slate-300">
                                Navn
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </label>

                            <label className="block text-sm text-slate-600 dark:text-slate-300">
                                Telefonnummer
                                <input
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    inputMode="numeric"
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </label>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={saveDetails}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? "Lagrer..." : "Lagre"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditName(name);
                                        setEditPhone(phone);
                                        setEditing(false);
                                        setError("");
                                    }}
                                    className="rounded-lg border border-slate-300 px-4 py-2 dark:border-slate-700"
                                >
                                    Avbryt
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                            <p className="font-medium text-slate-900 dark:text-white">
                                {name}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                {phone}
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditName(name);
                                    setEditPhone(phone);
                                    setEditing(true);
                                    setError("");
                                    setMessage("");
                                }}
                                className="mt-3 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                            >
                                Rediger opplysninger
                            </button>
                        </div>
                    )}
                </section>

                <section className="mt-6">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                        Kurs
                    </h3>

                    {loading ? (
                        <p className="mt-3 text-sm text-slate-500">
                            Henter kurs...
                        </p>
                    ) : userCourses.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-500">
                            Deltakeren er ikke meldt på noen kurs.
                        </p>
                    ) : (
                        <div className="mt-3 space-y-2">
                            {userCourses.map((course) => (
                                <div
                                    key={course.id}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                                >
                                    <span className="text-sm text-slate-800 dark:text-slate-200">
                                        {course.name}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() =>
                                            removeCourse(course.id, course.name)
                                        }
                                        className="text-sm text-red-600 hover:underline disabled:opacity-50"
                                    >
                                        Fjern
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <select
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                            <option value="">Velg et kurs...</option>
                            {availableCourses.map((course) => (
                                <option key={course.id} value={course.id}>
                                    {course.name}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            disabled={saving || !selectedCourseId}
                            onClick={addCourse}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            Legg til kurs
                        </button>
                    </div>
                </section>

                <section className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={deleteParticipant}
                        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950"
                    >
                        Slett deltaker
                    </button>
                </section>
            </div>
        </div>
    );
}