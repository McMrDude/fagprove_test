"use client";

import { useEffect, useState } from "react";

interface Teacher {
  id: string;
  name: string;
  email: string;
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
          <ul>
            {teachers.map((teacher) => (
              <li key={teacher.id}>
                <h2>{teacher.name}</h2>
                <p>{teacher.email}</p>
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