"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

type Cert = {
  id: string;
  title: string;
  recipientName: string;
  courseTitle?: string | null;
  verificationCode: string;
  issuedAt: string;
  userEmail?: string;
  userId?: string;
};

type UserRow = { id: string; fullName?: string; name?: string; email: string; accountType: string };
type Course = { id: string; title: string };

export default function CertificatesPage() {
  const [rows, setRows] = useState<Cert[]>([]);
  const [students, setStudents] = useState<UserRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const load = useCallback(async () => {
    try {
      const [certs, users, courseList] = await Promise.all([
        api<Cert[]>("/certificates"),
        api<{ items: UserRow[] }>("/users?pageSize=100"),
        api<Course[]>("/courses?all=1"),
      ]);
      setRows(certs);
      const studentRows = (users.items || []).filter(
        (u) => u.accountType === "STUDENT"
      );
      setStudents(studentRows);
      setCourses(courseList as Course[]);
      setUserId((prev) => prev || studentRows[0]?.id || "");
      setCourseId((prev) => prev || (courseList as Course[])[0]?.id || "");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function onIssue(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/certificates/issue", {
        method: "POST",
        body: JSON.stringify({ userId, courseId }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Issue failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Certificates</h2>
          <p className="text-sm text-slate-500">
            Issued certificates with public verification codes.
          </p>
        </div>
        <Link href="/quizzes" className="text-sm font-medium text-blue-600 hover:underline">
          Quizzes
        </Link>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <form onSubmit={onIssue} className="glass-card grid gap-3 p-5 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Student</Label>
          <select
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName || s.name || s.email}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Course</Label>
          <select
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            required
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Issuing…" : "Issue certificate"}
          </Button>
        </div>
      </form>

      <div className="glass-card overflow-hidden">
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Verify</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.recipientName}</p>
                    <p className="text-xs text-slate-500">{r.userEmail}</p>
                  </td>
                  <td className="px-4 py-3">{r.courseTitle || "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.verificationCode}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(r.issuedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      className="text-xs font-medium text-blue-600 hover:underline"
                      href={`${origin}/verify/${r.verificationCode}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No certificates yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card p-5">
        <Label>Quick verify</Label>
        <p className="mb-2 text-xs text-slate-500">
          Public page: {origin}/verify/CT-XXXX-XXXX-XXXX
        </p>
        <Input
          placeholder="Paste verification code"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = (e.target as HTMLInputElement).value.trim();
              if (v) window.open(`/verify/${encodeURIComponent(v)}`, "_blank");
            }
          }}
        />
      </div>
    </div>
  );
}
