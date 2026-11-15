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

type OfficeConfig = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  timezone: string;
  studentStartTime: string;
  studentEndTime: string;
  staffStartTime: string;
  staffEndTime: string;
  internStartTime: string;
  internEndTime: string;
};

const defaultOffice: OfficeConfig = {
  latitude: 29.3931779,
  longitude: 71.6924333,
  radiusMeters: 50,
  timezone: "Asia/Karachi",
  studentStartTime: "09:00",
  studentEndTime: "14:00",
  staffStartTime: "08:00",
  staffEndTime: "17:00",
  internStartTime: "10:00",
  internEndTime: "18:00",
};

export default function SystemPage() {
  const [version, setVersion] = useState<Version>({
    minVersion: "1.0.0",
    latestVersion: "1.0.0",
    forceUpdate: false,
    storeUrlAndroid: "",
    message: "",
  });
  const [office, setOffice] = useState<OfficeConfig>(defaultOffice);
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
    api<OfficeConfig>("/system/office-config")
      .then((o) =>
        setOffice({
          ...defaultOffice,
          ...o,
          radiusMeters: o.radiusMeters || 50,
        })
      )
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">System</h2>
        <p className="text-sm text-slate-500">
          Force-update, office geofence &amp; role shift times
        </p>
      </div>

      <div className="glass-card max-w-xl space-y-3 p-5">
        <h3 className="font-semibold">Office attendance (Port Singer)</h3>
        <p className="text-xs text-slate-500">
          Static pin · check-in only inside radius · once/day arrival reminder ·
          auto check-out at shift end
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Latitude</Label>
            <Input value={office.latitude} readOnly className="bg-slate-50" />
          </div>
          <div className="space-y-1.5">
            <Label>Longitude</Label>
            <Input value={office.longitude} readOnly className="bg-slate-50" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Geofence radius (meters)</Label>
          <Input
            type="number"
            min={20}
            max={200}
            value={office.radiusMeters}
            onChange={(e) =>
              setOffice({
                ...office,
                radiusMeters: Number(e.target.value) || 50,
              })
            }
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["Student", "studentStartTime", "studentEndTime"],
              ["Staff", "staffStartTime", "staffEndTime"],
              ["Intern", "internStartTime", "internEndTime"],
            ] as const
          ).map(([label, startKey, endKey]) => (
            <div key={label} className="space-y-2 rounded-xl border border-slate-100 p-3">
              <p className="text-sm font-semibold">{label} shift</p>
              <div className="space-y-1">
                <Label className="text-xs">Start</Label>
                <Input
                  type="time"
                  value={office[startKey]}
                  onChange={(e) =>
                    setOffice({ ...office, [startKey]: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End (auto checkout)</Label>
                <Input
                  type="time"
                  value={office[endKey]}
                  onChange={(e) =>
                    setOffice({ ...office, [endKey]: e.target.value })
                  }
                />
              </div>
            </div>
          ))}
        </div>
        <Button
          onClick={() =>
            api("/system/office-config", {
              method: "PUT",
              body: JSON.stringify(office),
            })
              .then(() => show("Office & shift times saved"))
              .catch((e) => show(String(e), "error"))
          }
        >
          Save attendance settings
        </Button>
      </div>

      <div className="glass-card max-w-xl space-y-3 p-5">
        <h3 className="font-semibold">Android force-update</h3>
        <div className="space-y-1.5">
          <Label>Minimum version</Label>
          <Input
            value={version.minVersion}
            onChange={(e) =>
              setVersion({ ...version, minVersion: e.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Latest version</Label>
          <Input
            value={version.latestVersion}
            onChange={(e) =>
              setVersion({ ...version, latestVersion: e.target.value })
            }
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
            onChange={(e) =>
              setVersion({ ...version, message: e.target.value })
            }
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
              .catch((e) => show(String(e), "error"))
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
}
