"use client";

import { useEffect, useState } from "react";

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone_number: string;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    const fetchTeachers = async () => {
      const response = await fetch("/api/teachers");
      const data = await response.json();
      setTeachers(data);
    };

    fetchTeachers();
  }, []);

  return (
    <div>
      <h1>Lærere</h1>
      <p>Her er alle lærere.</p>

      <div>
        {teachers.length > 0 ? (
          <ul className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700 m-5">
            {teachers.map((teacher) => (
              <li key={teacher.id}>
                <h2>{teacher.name}</h2>
                <p>{teacher.email}</p>
                <p>{teacher.phone_number}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>Ingen lærere funnet.</p>
        )}
      </div>
    </div>
  );
}