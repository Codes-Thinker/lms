"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAdmin } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginAdmin(email.trim(), password);
      router.replace("/");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Sign-in failed";
      const lower = raw.toLowerCase();
      if (lower.includes("no account") || lower.includes("not found")) {
        setError("No account found with this email.");
      } else if (lower.includes("incorrect password") || lower.includes("wrong password")) {
        setError("Incorrect password. Please try again.");
      } else if (lower.includes("not active")) {
        setError("This account is not active. Please contact your admin.");
      } else if (lower.includes("email") && lower.includes("valid")) {
        setError("Please enter a valid email address.");
      } else if (lower.includes("password") && (lower.includes("8") || lower.includes("longer"))) {
        setError("Password must be at least 8 characters.");
      } else if (lower.includes("admin access")) {
        setError("This portal is for admins only.");
      } else {
        setError(raw.length < 120 ? raw : "Sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
      <Card className="w-full max-w-md animate-fade-up">
        <CardHeader className="items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/app_icon.png"
            alt="Code's Thinker LMS"
            className="mb-3 h-16 w-16 rounded-2xl object-cover"
          />
          <CardTitle>Code&apos;s Thinker LMS</CardTitle>
          <CardDescription>Admin sign in</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/reset-password"
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
