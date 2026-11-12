"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminUser } from "@/lib/mock-data";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF7] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Code&apos;s Thinker LMS</CardTitle>
          <CardDescription>Admin: Ayaz Aslam — courses, attendance, fees, tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue={adminUser.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" defaultValue="••••••••" />
          </div>
          <Button className="w-full" onClick={() => router.push("/")}>
            Sign in as Ayaz Aslam
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
