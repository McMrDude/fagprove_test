"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function UserDetailOverlay({ id, name, phone }: { id: number; name: string; phone: string; }) {
    const dropdownRef =
        useRef<HTMLDivElement>(null);

    const [userCourses, setUserCourses] = useState<{ name: string; id: number }[]>([]);

    useEffect(() => {
        async function fetchParticipants() {
            const response = await fetch(`/api/courses/${id}`);
            const result = await response.json();
            if (result.success) {
                setUserCourses(result.courses);
            }

            console.log("Should have gotten the bloody couses now", result.courses);
        }
        fetchParticipants();
    }, []);

    const [open, setOpen] = useState(true);

      useEffect(() => {

        function handleClickOutside(
        event: MouseEvent
        ) {

        if (
            dropdownRef.current &&
            !dropdownRef.current.contains(
            event.target as Node
            )
        ) {

            setOpen(false);

        }

        }


        document.addEventListener(
        "mousedown",
        handleClickOutside
        );


        return () => {

        document.removeEventListener(
            "mousedown",
            handleClickOutside
        );

        };

    }, []);
    
    return (
        <div
            ref={dropdownRef}
            className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-950"
        >
            {open && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-500 text-white">
                            INFO
                        </div>
                        <div>
                            <div className="font-medium">{name}</div>
                            <div className="text-sm text-slate-500">{phone}</div>
                        </div>
                        <div>
                            KURS:
                            {userCourses.map((course: any) => (
                                <div key={course.id}>{course.name}</div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}