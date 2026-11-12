"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSnackbar } from "@/components/ui/snackbar";
import { useNotifications } from "@/components/ui/notifications-provider";

type VersionConfig = {
  latestVersion: string;
  minimumVersion: string;
  forceUpdate: boolean;
  title: string;
  message: string;
  androidUrl: string;
  iosUrl: string;
  updatedAt: string;
};

export default function SystemPage() {
  const [form, setForm] = useState<VersionConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const { show } = useSnackbar();
  const { push } = useNotifications();

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/app-version");
      const json = await res.json();
      setForm(json.data);
    })();
  }, []);

  async function save() {
    if (!form) return;
    setSaving(true);
    const res = await fetch("/api/app-version", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      show(json.error || "Save failed");
      return;
    }
    setForm(json.data);
    show(`App version set to ${json.data.latestVersion}`);
    push({
      title: "App version updated",
      body: `Latest ${json.data.latestVersion} · Min ${json.data.minimumVersion}`,
      type: "system",
    });
  }

  function bumpPatch() {
    if (!form) return;
    const [a, b, c] = form.latestVersion.split(".").map(Number);
    const next = `${a}.${b}.${(c || 0) + 1}`;
    setForm({
      ...form,
      latestVersion: next,
      minimumVersion: form.forceUpdate ? next : form.minimumVersion,
    });
  }

  if (!form) {
    return <div className="glass-card p-6 text-sm text-slate-500">Loading system…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">System · App version control</h2>
        <p className="text-sm text-slate-500">
          Version badhao → purani app wale users ko force update bottom sheet aayegi. Latest pe
          hone walon ko sheet nahi dikhegi.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="glass-card space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Latest version</Label>
              <Input
                value={form.latestVersion}
                onChange={(e) => setForm({ ...form, latestVersion: e.target.value })}
                placeholder="1.2.1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Minimum required version</Label>
              <Input
                value={form.minimumVersion}
                onChange={(e) => setForm({ ...form, minimumVersion: e.target.value })}
                placeholder="1.2.1"
              />
              <p className="text-[11px] text-slate-400">
                App version &lt; minimum → blocked until update
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Force update</p>
              <p className="text-xs text-slate-500">Sheet dismiss nahi hogi / app use band</p>
            </div>
            <Switch
              checked={form.forceUpdate}
              onCheckedChange={(v) => setForm({ ...form, forceUpdate: v })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Bottom sheet title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Android store URL</Label>
              <Input
                value={form.androidUrl}
                onChange={(e) => setForm({ ...form, androidUrl: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>iOS store URL</Label>
              <Input
                value={form.iosUrl}
                onChange={(e) => setForm({ ...form, iosUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={bumpPatch}>
              Bump patch (+0.0.1)
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save & publish to app"}
            </Button>
          </div>
        </div>

        <div className="glass-card space-y-3 p-5">
          <h3 className="font-semibold">Live status</h3>
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p>
              Latest: <span className="font-bold">{form.latestVersion}</span>
            </p>
            <p>
              Minimum: <span className="font-bold">{form.minimumVersion}</span>
            </p>
            <p>
              Force:{" "}
              <span className="font-bold">{form.forceUpdate ? "ON" : "OFF"}</span>
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Updated {new Date(form.updatedAt).toLocaleString()}
            </p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Example: app installed = 1.2.0, you set minimum = 1.2.1 → user sees update sheet and
            cannot use LMS until updated. User already on 1.2.1+ → no sheet.
          </p>
        </div>
      </div>
    </div>
  );
}
