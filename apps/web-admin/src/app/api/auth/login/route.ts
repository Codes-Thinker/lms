import { NextRequest, NextResponse } from "next/server";
import { publicUser, readUsers } from "@/lib/users-store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();
  const roleHint = String(body.role || "").toUpperCase();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const users = await readUsers();
  const user = users.find((u) => u.email === email);

  // Avoid email enumeration detail in production; keep clear for LMS demo.
  if (!user || user.password !== password) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  if (user.status === "INACTIVE") {
    return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
  }
  if (roleHint && user.role !== roleHint) {
    return NextResponse.json(
      { error: `This account is ${user.role}. Select the correct role.` },
      { status: 403 }
    );
  }

  return NextResponse.json({ data: publicUser(user) });
}
