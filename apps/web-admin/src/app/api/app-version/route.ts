import { NextRequest, NextResponse } from "next/server";
import { readAppVersion, writeAppVersion } from "@/lib/app-version-store";

export async function GET() {
  const data = await readAppVersion();
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const current = await readAppVersion();
  const next = {
    ...current,
    latestVersion: String(body.latestVersion ?? current.latestVersion).trim(),
    minimumVersion: String(body.minimumVersion ?? current.minimumVersion).trim(),
    forceUpdate: body.forceUpdate ?? current.forceUpdate,
    title: String(body.title ?? current.title).trim(),
    message: String(body.message ?? current.message).trim(),
    androidUrl: String(body.androidUrl ?? current.androidUrl).trim(),
    iosUrl: String(body.iosUrl ?? current.iosUrl).trim(),
    updatedAt: new Date().toISOString(),
  };

  if (!/^\d+\.\d+\.\d+$/.test(next.latestVersion) || !/^\d+\.\d+\.\d+$/.test(next.minimumVersion)) {
    return NextResponse.json(
      { error: "Versions must look like 1.2.0" },
      { status: 400 }
    );
  }

  await writeAppVersion(next);
  return NextResponse.json({ data: next });
}
