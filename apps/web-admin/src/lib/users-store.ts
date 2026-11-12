import { promises as fs } from "fs";
import path from "path";

export type ManagedRole = "STUDENT" | "INTERN" | "STAFF";
export type ManagedStatus = "ACTIVE" | "INACTIVE" | "INVITED";

export type ManagedUser = {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: ManagedRole;
  status: ManagedStatus;
  department: string;
  batch: string;
  track: string;
  phone: string;
  attendancePercent: number;
  createdAt: string;
  updatedAt: string;
};

const DATA_PATH = path.join(process.cwd(), "data", "users.json");

/** Password must include "codesthinker" and be at least 8 characters. */
export function validatePassword(password: string): string | null {
  const p = password.trim();
  if (p.length < 8) return "Password must be at least 8 characters";
  if (!p.toLowerCase().includes("codesthinker")) {
    return 'Password must include "codesthinker"';
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const e = email.trim().toLowerCase();
  if (!e) return "Email required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return "Invalid email";
  return null;
}

async function ensureFile() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, "[]", "utf8");
  }
}

export async function readUsers(): Promise<ManagedUser[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_PATH, "utf8");
  return JSON.parse(raw) as ManagedUser[];
}

export async function writeUsers(users: ManagedUser[]) {
  await ensureFile();
  await fs.writeFile(DATA_PATH, JSON.stringify(users, null, 2), "utf8");
}

export function publicUser(u: ManagedUser) {
  const { password: _p, ...rest } = u;
  return rest;
}
