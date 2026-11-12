import { NextRequest, NextResponse } from "next/server";
import {
  readUsers,
  writeUsers,
  validatePassword,
  publicUser,
  type ManagedStatus,
} from "@/lib/users-store";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const users = await readUsers();
  const user = users.find((u) => u.id === params.id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: publicUser(user) });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const body = await req.json();
  const users = await readUsers();
  const idx = users.findIndex((u) => u.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const current = users[idx];
  if (body.password) {
    const err = validatePassword(String(body.password));
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    current.password = String(body.password).trim();
  }
  if (body.fullName) current.fullName = String(body.fullName).trim();
  if (body.department != null) current.department = String(body.department);
  if (body.batch != null) current.batch = String(body.batch);
  if (body.track != null) current.track = String(body.track);
  if (body.phone != null) current.phone = String(body.phone);
  if (body.status) current.status = String(body.status).toUpperCase() as ManagedStatus;
  if (body.role && ["STUDENT", "INTERN", "STAFF"].includes(String(body.role).toUpperCase())) {
    current.role = String(body.role).toUpperCase() as typeof current.role;
  }
  current.updatedAt = new Date().toISOString();
  users[idx] = current;
  await writeUsers(users);
  return NextResponse.json({ data: publicUser(current) });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const users = await readUsers();
  const next = users.filter((u) => u.id !== params.id);
  if (next.length === users.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeUsers(next);
  return NextResponse.json({ ok: true });
}
