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

export default function UsersPage() {
  const { show } = useSnackbar();
  const [items, setItems] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] =
    useState<(typeof ACCOUNT_TYPES)[number]>("STUDENT");
  const [track, setTrack] = useState("");
  const [phone, setPhone] = useState("");
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

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          accountType,
          track: track.trim() || undefined,
          phone: phone.trim() || undefined,
          password: password.trim() || undefined,
          sendInvitation: !password.trim(),
        }),
      });
      setFullName("");
      setEmail("");
      setPassword("");
      setTrack("");
      setPhone("");
      show("User saved");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save user";
      show(msg);
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
              ? " — pehle /login se admin sign in karo."
              : null}
          </p>
        ) : null}
      </div>

      <form onSubmit={onCreate} className="glass-card space-y-4 p-5">
        <h3 className="font-semibold">Add new user</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Account type</Label>
            <select
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={accountType}
              onChange={(e) =>
                setAccountType(e.target.value as (typeof ACCOUNT_TYPES)[number])
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
            <Label>Password (optional — for immediate login)</Label>
            <div className="flex gap-2">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                placeholder="Min 8 characters"
                autoComplete="off"
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
          </div>
          <div className="space-y-1.5">
            <Label>Track (optional)</Label>
            <Input value={track} onChange={(e) => setTrack(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone (optional)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create user"}
        </Button>
      </form>

      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold">
            All users {loading ? "…" : `(${items.length})`}
          </h3>
          <Button type="button" variant="secondary" size="sm" onClick={() => void load()}>
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
                      <Badge variant="secondary">{roleLabel(u.accountType)}</Badge>
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
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
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
