"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, resetPassword } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = useMemo(() => params.get("token")?.trim() ?? "", [params]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onRequestLink(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await requestPasswordReset(email.trim());
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await resetPassword(token, password);
      setMessage(res.message);
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
      <Card className="w-full max-w-md animate-fade-up">
        <CardHeader className="text-center">
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            {token
              ? "Choose a new password for your admin account."
              : "Enter your email and we will send a reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {token ? (
            <form className="space-y-4" onSubmit={onReset}>
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {message ? (
                <p className="text-sm text-emerald-700">{message}</p>
              ) : null}
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Updating…" : "Update password"}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={onRequestLink}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {message ? (
                <p className="text-sm text-emerald-700">{message}</p>
              ) : null}
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-slate-500">
            <Link href="/login" className="text-blue-600 hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
