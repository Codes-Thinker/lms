import { NextResponse } from "next/server";

/** Legacy file-backed users API disabled — use Nest /users/:id. */
export async function GET() {
  return NextResponse.json(
    { error: "Gone", message: "Use the Nest LMS API /users/:id endpoint." },
    { status: 410 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Gone", message: "Use the Nest LMS API /users/:id endpoint." },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Gone", message: "Use the Nest LMS API /users/:id endpoint." },
    { status: 410 }
  );
}
