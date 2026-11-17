"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

type Course = { id: string; title: string };
type QuizRow = {
  id: string;
  title: string;
  status: string;
  passPercent: number;
  maxAttempts: number;
  course: { id: string; title: string };
  _count: { questions: number; attempts: number };
};

type QuestionDraft = {
  prompt: string;
  options: string[];
  correctIndex: number;
};

const emptyQ = (): QuestionDraft => ({
  prompt: "",
  options: ["", "", "", ""],
  correctIndex: 0,
});

export default function QuizzesPage() {
  const [rows, setRows] = useState<QuizRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [passPercent, setPassPercent] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [publish, setPublish] = useState(true);
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQ()]);

  const load = useCallback(async () => {
    try {
      const [q, c] = await Promise.all([
        api<QuizRow[]>("/quizzes"),
        api<Course[]>("/courses?all=1"),
      ]);
      setRows(q);
      const courseRows = (c as Course[]).map((x) => ({
        id: x.id,
        title: x.title,
      }));
      setCourses(courseRows);
      setCourseId((prev) => prev || courseRows[0]?.id || "");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/quizzes", {
        method: "POST",
        body: JSON.stringify({
          courseId,
          title,
          passPercent,
          maxAttempts,
          publish,
          issueCertificate: true,
          questions: questions.map((q, i) => {
            const options = q.options.map((o) => o.trim()).filter(Boolean);
            const correctLabel = (q.options[q.correctIndex] || "").trim();
            const correctIndex = Math.max(0, options.indexOf(correctLabel));
            return {
              prompt: q.prompt,
              options,
              correctIndex,
              sortOrder: i,
            };
          }),
        }),
      });
      setTitle("");
      setQuestions([emptyQ()]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await api(`/quizzes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this quiz?")) return;
    await api(`/quizzes/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Quizzes</h2>
          <p className="text-sm text-slate-500">
            MCQ exams graded on the server. Passing can issue a certificate.
          </p>
        </div>
        <Link href="/certificates" className="text-sm font-medium text-blue-600 hover:underline">
          Certificates
        </Link>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <form onSubmit={onCreate} className="glass-card space-y-4 p-5">
        <h3 className="font-semibold">New quiz</h3>
        <div className="grid gap-3 md:grid-cols-2">
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
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Pass %</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={passPercent}
              onChange={(e) => setPassPercent(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max attempts</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
          />
          Publish immediately
        </label>

        <div className="space-y-3">
          {questions.map((q, qi) => (
            <div key={qi} className="rounded-2xl border border-slate-100 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Question {qi + 1}</p>
                {questions.length > 1 ? (
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() =>
                      setQuestions((prev) => prev.filter((_, i) => i !== qi))
                    }
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <Input
                className="mb-2"
                placeholder="Prompt"
                value={q.prompt}
                onChange={(e) =>
                  setQuestions((prev) =>
                    prev.map((row, i) =>
                      i === qi ? { ...row, prompt: e.target.value } : row
                    )
                  )
                }
                required
              />
              <div className="grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, oi) => (
                  <label key={oi} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`correct-${qi}`}
                      checked={q.correctIndex === oi}
                      onChange={() =>
                        setQuestions((prev) =>
                          prev.map((row, i) =>
                            i === qi ? { ...row, correctIndex: oi } : row
                          )
                        )
                      }
                    />
                    <Input
                      placeholder={`Option ${oi + 1}`}
                      value={opt}
                      onChange={(e) =>
                        setQuestions((prev) =>
                          prev.map((row, i) =>
                            i === qi
                              ? {
                                  ...row,
                                  options: row.options.map((o, j) =>
                                    j === oi ? e.target.value : o
                                  ),
                                }
                              : row
                          )
                        )
                      }
                      required={oi < 2}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setQuestions((prev) => [...prev, emptyQ()])}
          >
            Add question
          </Button>
        </div>

        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Create quiz"}
        </Button>
      </form>

      <div className="glass-card overflow-hidden">
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Quiz</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Qs</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{r.title}</td>
                  <td className="px-4 py-3 text-slate-600">{r.course.title}</td>
                  <td className="px-4 py-3">{r._count.questions}</td>
                  <td className="px-4 py-3">{r._count.attempts}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.status === "PUBLISHED" ? "success" : "secondary"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {r.status !== "PUBLISHED" ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-blue-600"
                          onClick={() => setStatus(r.id, "PUBLISHED")}
                        >
                          Publish
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-xs font-medium text-slate-600"
                          onClick={() => setStatus(r.id, "DRAFT")}
                        >
                          Unpublish
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-xs font-medium text-red-600"
                        onClick={() => remove(r.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No quizzes yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
