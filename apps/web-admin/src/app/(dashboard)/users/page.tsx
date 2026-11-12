"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { roleLabel } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useSnackbar } from "@/components/ui/snackbar";

type UserRow = {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  accountType: string;
  status: string;
  track?: string | null;
  phone?: string | null;
};

const ACCOUNT_TYPES = ["STUDENT", "INTERN", "STAFF"] as const;

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  accountType: "STUDENT" as (typeof ACCOUNT_TYPES)[number],
  track: "",
  phone: "",
};

export default function UsersPage() {
  const { show } = useSnackbar();
  const [items, setItems] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ items: UserRow[] }>("/users?pageSize=100");
      setItems(r.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function setField<K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setShowPassword(false);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          accountType: form.accountType,
          track: form.track.trim() || undefined,
          phone: form.phone.trim() || undefined,
          password: form.password.trim() || undefined,
          sendInvitation: !form.password.trim(),
        }),
      });
      resetForm();
      show("User created");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save user";
      show(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Users</h2>
        <p className="text-sm text-slate-500">
          Add Student · Intern · Teacher — tap a name for full profile
        </p>
        {error ? (
          <p className="mt-2 text-sm text-red-600">
            {error}
            {error.toLowerCase().includes("unauthorized") ||
            error.toLowerCase().includes("session")
              ? " — sign in again from /login."
              : null}
          </p>
        ) : null}
      </div>

      <form
        onSubmit={onCreate}
        className="glass-card space-y-5 p-5"
        autoComplete="off"
        data-lpignore="true"
        data-1p-ignore="true"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Add new user</h3>
            <p className="text-sm text-slate-500">
              Empty form — enter the new person&apos;s details only
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={resetForm}
          >
            Clear form
          </Button>
        </div>

        {/* Honeypot-style decoys so browsers don't dump admin login here */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          defaultValue=""
        />
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          defaultValue=""
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-user-name">Full name</Label>
            <Input
              id="new-user-name"
              name="new-user-full-name"
              value={form.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              placeholder="e.g. Ali Khan"
              required
              minLength={2}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-email">Email</Label>
            <Input
              id="new-user-email"
              name="new-user-email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="name@codesthinker.com"
              required
              autoComplete="off"
              inputMode="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-type">Account type</Label>
            <select
              id="new-user-type"
              name="new-user-account-type"
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              value={form.accountType}
              onChange={(e) =>
                setField(
                  "accountType",
                  e.target.value as (typeof ACCOUNT_TYPES)[number]
                )
              }
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {roleLabel(t)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-password">
              Password{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="new-user-password"
                name="new-user-password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                minLength={8}
                placeholder="Leave blank to send invite"
                autoComplete="new-password"
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Blank password = invitation email · set password for instant login
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-track">
              Track <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Input
              id="new-user-track"
              name="new-user-track"
              value={form.track}
              onChange={(e) => setField("track", e.target.value)}
              placeholder="e.g. Flutter Development"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-phone">
              Phone <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Input
              id="new-user-phone"
              name="new-user-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="03xx-xxxxxxx"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create user"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={resetForm}
          >
            Reset
          </Button>
        </div>
      </form>

      <div className="glass-card table-scroll overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold">
            All users {loading ? "…" : `(${items.length})`}
          </h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void load()}
          >
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Track</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const display = u.name || u.fullName || u.email;
                return (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/users/${u.id}`}
                        className="flex items-center gap-2.5 hover:text-blue-700"
                      >
                        <UserAvatar
                          name={display}
                          email={u.email}
                          accountType={u.accountType}
                          size="sm"
                        />
                        <span>
                          <span className="block font-semibold">{display}</span>
                          <span className="block text-xs text-slate-500">
                            {u.email}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="secondary">
                        {roleLabel(u.accountType)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">{u.track || "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline">{u.status}</Badge>
                    </td>
                  </tr>
                );
              })}
              {!loading && items.length === 0 && !error ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-slate-500"
                  >
                    No users yet
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
