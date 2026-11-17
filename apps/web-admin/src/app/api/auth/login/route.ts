import { NextResponse } from "next/server";

/** Legacy mock auth disabled — use Nest API POST /auth/login. */
export async function POST() {
  return NextResponse.json(
    {
      error: "Gone",
      message: "Use the Nest LMS API /auth/login endpoint.",
    },
    { status: 410 }
  );
}
