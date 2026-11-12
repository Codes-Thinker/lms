"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSnackbar } from "@/components/ui/snackbar";
import { useNotifications } from "@/components/ui/notifications-provider";

type Role = "STUDENT" | "INTERN" | "STAFF";
type Status = "ACTIVE" | "INACTIVE" | "INVITED";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: Status;
  department: string;
  batch: string;
  track: string;
  phone: string;
  attendancePercent: number;
  createdAt: string;
};

const emptyForm = {
  fullName: "",
  email: "",
  password: "codesthinker",
  role: "STUDENT" as Role,
  department: "",
  batch: "",
  track: "",
  phone: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState<string>("");
  const { show } = useSnackbar();
  const { push } = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (roleFilter !== "ALL") params.set("role", roleFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    const res = await fetch(`/api/users?${params.toString()}`);
    const json = await res.json();
    setUsers(json.data || []);
    setLoading(false);
  }, [q, roleFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => users.find((u) => u.id === selectedId) ?? users[0],
    [users, selectedId]
  );

  async function addUser() {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      show(json.error || "Failed to add user");
      return;
    }
    show(`User added · ${json.data.fullName} can login in app`);
    push({
      title: "New user created",
      body: `${json.data.fullName} · ${json.data.role} · ${json.data.email}`,
      type: "system",
    });
    setForm(emptyForm);
    await load();
    setSelectedId(json.data.id);
  }

  async function setStatus(id: string, status: Status) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const json = await res.json();
      show(json.error || "Update failed");
      return;
    }
    show(`Status → ${status}`);
    await load();
  }

  async function resetPassword(id: string) {
    const password = window.prompt(
      'New password (must include "codesthinker", min 8 chars)',
      "codesthinker"
    );
    if (!password) return;
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const json = await res.json();
    if (!res.ok) {
      show(json.error || "Password update failed");
      return;
    }
    show("Password updated · share with user for app login");
  }

  async function removeUser(id: string) {
    if (!window.confirm("Delete this user permanently?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      show("Delete failed");
      return;
    }
    show("User deleted");
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Users</h2>
        <p className="text-sm text-slate-500">
          Sab users yahan · add with Gmail + role + password · app login same credentials
        </p>
        <p className="mt-1 text-xs font-medium text-blue-600">
          Password rule: must include <code>codesthinker</code> · min 8 characters
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="glass-card space-y-3 p-5">
          <h3 className="font-semibold">Add user</h3>
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Ali Khan"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Gmail / Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@gmail.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm({ ...form, role: v as Role })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STUDENT">Student</SelectItem>
                <SelectItem value="INTERN">Intern</SelectItem>
                <SelectItem value="STAFF">Staff / Teacher</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>App password (admin sets)</Label>
            <Input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="codesthinker"
            />
            <p className="text-[11px] text-slate-400">
              User will login with this email + password in the app
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Batch</Label>
              <Input
                value={form.batch}
                onChange={(e) => setForm({ ...form, batch: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Track</Label>
            <Input
              value={form.track}
              onChange={(e) => setForm({ ...form, track: e.target.value })}
            />
          </div>
          <Button className="w-full" onClick={addUser}>
            Add user · give app access
          </Button>
        </div>

        <div className="space-y-4">
          <div className="glass-card flex flex-wrap gap-3 p-4">
            <Input
              className="max-w-xs"
              placeholder="Search name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All roles</SelectItem>
                <SelectItem value="STUDENT">Student</SelectItem>
                <SelectItem value="INTERN">Intern</SelectItem>
                <SelectItem value="STAFF">Staff</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={() => void load()}>
              Refresh
            </Button>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3 font-semibold">
              All users ({users.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Dept / Batch</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-5 py-8 text-slate-400" colSpan={5}>
                        Loading…
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-slate-400" colSpan={5}>
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr
                        key={u.id}
                        className={`border-t border-slate-100 ${
                          selected?.id === u.id ? "bg-blue-50/40" : ""
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            className="text-left"
                            onClick={() => setSelectedId(u.id)}
                          >
                            <p className="font-semibold">{u.fullName}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant="secondary">{u.role}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={u.status === "ACTIVE" ? "success" : "danger"}>
                            {u.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600">
                          {u.department || "—"}
                          {u.batch ? ` · ${u.batch}` : ""}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setSelectedId(u.id)}>
                              Profile
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => resetPassword(u.id)}>
                              Password
                            </Button>
                            {u.status === "ACTIVE" ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setStatus(u.id, "INACTIVE")}
                              >
                                Deactivate
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => setStatus(u.id, "ACTIVE")}>
                                Activate
                              </Button>
                            )}
                            <Button size="sm" variant="secondary" onClick={() => removeUser(u.id)}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selected ? (
            <div className="glass-card p-5">
              <h3 className="font-semibold">User profile</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Name</p>
                  <p className="font-semibold">{selected.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="font-semibold">{selected.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Role</p>
                  <p className="font-semibold">{selected.role}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="font-semibold">{selected.status}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Department</p>
                  <p className="font-semibold">{selected.department || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Batch</p>
                  <p className="font-semibold">{selected.batch || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Track</p>
                  <p className="font-semibold">{selected.track || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Attendance</p>
                  <p className="font-semibold">{selected.attendancePercent}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Created</p>
                  <p className="font-semibold">
                    {new Date(selected.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
