import { NextRequest, NextResponse } from "next/server";
import {
  readUsers,
  writeUsers,
  validateEmail,
  validatePassword,
  publicUser,
  type ManagedRole,
  type ManagedUser,
} from "@/lib/users-store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const status = searchParams.get("status");
  const q = (searchParams.get("q") || "").toLowerCase();

  let users = await readUsers();
  if (role) users = users.filter((u) => u.role === role);
  if (status) users = users.filter((u) => u.status === status);
  if (q) {
    users = users.filter(
      (u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({
    data: users.map(publicUser),
    total: users.length,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();
  const role = String(body.role || "STUDENT").toUpperCase() as ManagedRole;
  const department = String(body.department || "").trim();
  const batch = String(body.batch || "").trim();
  const track = String(body.track || "").trim();
  const phone = String(body.phone || "").trim();

  if (!fullName) {
    return NextResponse.json({ error: "Full name required" }, { status: 400 });
  }
  const emailErr = validateEmail(email);
  if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });
  const passErr = validatePassword(password);
  if (passErr) return NextResponse.json({ error: passErr }, { status: 400 });
  if (!["STUDENT", "INTERN", "STAFF"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const users = await readUsers();
  if (users.some((u) => u.email === email)) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const user: ManagedUser = {
    id: `u-${Date.now()}`,
    fullName,
    email,
    password,
    role,
    status: "ACTIVE",
    department:
      department ||
      (role === "STUDENT" ? "Paid Training" : role === "INTERN" ? "Interns" : "Staff"),
    batch,
    track: track || role,
    phone,
    attendancePercent: 0,
    createdAt: now,
    updatedAt: now,
  };

  users.unshift(user);
  await writeUsers(users);

  return NextResponse.json({ data: publicUser(user) }, { status: 201 });
}
