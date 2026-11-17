import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Legacy Next `/api/*` mock routes are retired (410).
 * Admin UI talks only to the Nest LMS API.
 */
export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return NextResponse.json(
    {
      error: "Gone",
      message: "Legacy Next API disabled. Use the Nest LMS API.",
    },
    { status: 410 }
  );
}

export const config = {
  matcher: "/api/:path*",
};
