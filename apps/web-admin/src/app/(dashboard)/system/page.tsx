"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSnackbar } from "@/components/ui/snackbar";

type Version = {
  minVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  storeUrlAndroid?: string | null;
  message?: string | null;
};

export default function SystemPage() {
  const [version, setVersion] = useState<Version>({
    minVersion: "1.0.0",
    latestVersion: "1.0.0",
    forceUpdate: false,
    storeUrlAndroid: "",
    message: "",
  });
  const { show } = useSnackbar();

  useEffect(() => {
    api<Version>("/system/app-version")
      .then((v) =>
        setVersion({
          minVersion: v.minVersion,
          latestVersion: v.latestVersion,
          forceUpdate: v.forceUpdate,
          storeUrlAndroid: v.storeUrlAndroid ?? "",
          message: v.message ?? "",
        })
      )
      .catch((e) => show(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">System</h2>
        <p className="text-sm text-slate-500">Android force-update settings</p>
      </div>
      <div className="glass-card max-w-xl space-y-3 p-5">
        <div className="space-y-1.5">
          <Label>Minimum version</Label>
          <Input
            value={version.minVersion}
            onChange={(e) => setVersion({ ...version, minVersion: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Latest version</Label>
          <Input
            value={version.latestVersion}
            onChange={(e) => setVersion({ ...version, latestVersion: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Play Store URL</Label>
          <Input
            value={version.storeUrlAndroid ?? ""}
            onChange={(e) =>
              setVersion({ ...version, storeUrlAndroid: e.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Message</Label>
          <Input
            value={version.message ?? ""}
            onChange={(e) => setVersion({ ...version, message: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={version.forceUpdate}
            onChange={(e) =>
              setVersion({ ...version, forceUpdate: e.target.checked })
            }
          />
          Force update
        </label>
        <Button
          onClick={() =>
            api("/system/app-version", {
              method: "PUT",
              body: JSON.stringify(version),
            })
              .then(() => show("App version saved"))
              .catch((e) => show(String(e)))
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
}
