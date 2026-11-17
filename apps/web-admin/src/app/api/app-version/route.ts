import { NextResponse } from "next/server";

/** Legacy local app-version store disabled — use Nest /system endpoints. */
export async function GET() {
  return NextResponse.json(
    {
      error: "Gone",
      message: "Use the Nest LMS API system/app-version endpoint.",
    },
    { status: 410 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      error: "Gone",
      message: "Use the Nest LMS API system/app-version endpoint.",
    },
    { status: 410 }
  );
}
