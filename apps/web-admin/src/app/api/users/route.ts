import { NextResponse } from "next/server";

/** Legacy file-backed users API disabled — use Nest /users. */
export async function GET() {
  return NextResponse.json(
    { error: "Gone", message: "Use the Nest LMS API /users endpoint." },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Gone", message: "Use the Nest LMS API /users endpoint." },
    { status: 410 }
  );
}
