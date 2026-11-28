"use client";

import { useEffect, useState } from "react";
import { FolderTree, MapPin, Settings, Smartphone } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
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
  staffWorkingDays: string;
  staffOffDays: string;
  exitGraceMinutes: number;
};

type HolidayRow = { id: string; date: string; label: string };

const WEEK_DAYS = [
  { v: 0, label: "Sun" },
  { v: 1, label: "Mon" },
  { v: 2, label: "Tue" },
  { v: 3, label: "Wed" },
  { v: 4, label: "Thu" },
  { v: 5, label: "Fri" },
  { v: 6, label: "Sat" },
] as const;

const defaultOffice: OfficeConfig = {
  latitude: 29.3931779,
  longitude: 71.6924333,
  radiusMeters: 50,
  timezone: "Asia/Karachi",
  studentStartTime: "09:00",
  studentEndTime: "14:00",
  staffStartTime: "10:00",
  staffEndTime: "18:00",
  internStartTime: "10:00",
  internEndTime: "18:00",
  staffWorkingDays: "0,1,2,3,4,5",
  staffOffDays: "6",
  exitGraceMinutes: 2,
};

type CategoryRow = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
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
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayLabel, setHolidayLabel] = useState("");
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [catBusy, setCatBusy] = useState(false);
  const { show } = useSnackbar();

  function workingSet(): Set<number> {
    return new Set(
      office.staffWorkingDays
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n))
    );
  }

  function toggleWorkingDay(day: number) {
    const set = workingSet();
    if (set.has(day)) set.delete(day);
    else set.add(day);
    const sorted = Array.from(set).sort((a, b) => a - b);
    const off = WEEK_DAYS.map((d) => d.v).filter((v) => !set.has(v));
    setOffice({
      ...office,
      staffWorkingDays: sorted.join(","),
      staffOffDays: off.join(","),
    });
  }

  async function loadCategories() {
    const rows = await api<CategoryRow[]>("/system/categories/all");
    setCategories(rows);
  }

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
          staffWorkingDays: o.staffWorkingDays || defaultOffice.staffWorkingDays,
          staffOffDays: o.staffOffDays || defaultOffice.staffOffDays,
          exitGraceMinutes: o.exitGraceMinutes ?? 2,
        })
      )
      .catch(() => {});
    api<HolidayRow[]>("/system/holidays")
      .then(setHolidays)
      .catch(() => {});
    loadCategories().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage system preferences, office rules, and app updates"
        icon={Settings}
      />

      <div className="glass-card max-w-2xl space-y-3 p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/30">
            <FolderTree className="h-4 w-4" strokeWidth={2} />
          </span>
          <h3 className="text-base font-bold text-slate-900">
            Course categories
          </h3>
        </div>
        <p className="text-sm text-slate-500">
          These names appear under All courses on the student home.
        </p>
        <p className="text-xs text-slate-500">
          These names appear under All courses on the student home: All,
          Flutter, Frontend, Dot Net, and more.
        </p>
        <div className="flex gap-2">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="e.g. Flutter Development"
          />
          <Button
            type="button"
            disabled={catBusy || !newCategory.trim()}
            onClick={() => {
              setCatBusy(true);
              api("/system/categories", {
                method: "POST",
                body: JSON.stringify({
                  name: newCategory.trim(),
                  sortOrder: categories.length + 1,
                }),
              })
                .then(() => {
                  setNewCategory("");
                  show("Category added");
                  return loadCategories();
                })
                .catch((e) => show(String(e), "error"))
                .finally(() => setCatBusy(false));
            }}
          >
            Add
          </Button>
        </div>
        <ul className="divide-y divide-slate-100 text-sm">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 py-2"
            >
              <span className={c.active ? "font-medium" : "text-slate-400"}>
                {c.name}
                {!c.active ? " (hidden)" : ""}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    api(`/system/categories/${c.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ active: !c.active }),
                    })
                      .then(loadCategories)
                      .catch((e) => show(String(e), "error"))
                  }
                >
                  {c.active ? "Hide" : "Show"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (!window.confirm(`Delete category “${c.name}”?`)) return;
                    api(`/system/categories/${c.id}`, { method: "DELETE" })
                      .then(() => {
                        show("Category deleted");
                        return loadCategories();
                      })
                      .catch((e) => show(String(e), "error"));
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
          {categories.length === 0 ? (
            <li className="py-3 text-slate-500">No categories yet</li>
          ) : null}
        </ul>
      </div>

      <div className="glass-card max-w-2xl space-y-3 p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/30">
            <MapPin className="h-4 w-4" strokeWidth={2} />
          </span>
          <h3 className="text-base font-bold text-slate-900">
            Office attendance
          </h3>
        </div>
        <p className="text-sm text-slate-500">
          Static pin, check-in only inside radius, once/day arrival reminder,
          auto check-out at shift end
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Latitude</Label>
            <Input
              type="number"
              step="any"
              value={office.latitude}
              onChange={(e) =>
                setOffice({
                  ...office,
                  latitude: Number(e.target.value) || office.latitude,
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Longitude</Label>
            <Input
              type="number"
              step="any"
              value={office.longitude}
              onChange={(e) =>
                setOffice({
                  ...office,
                  longitude: Number(e.target.value) || office.longitude,
                })
              }
            />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Use the real office coordinates. App geofence and check-in use these
          values live after save.
        </p>
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
        <div className="space-y-2 rounded-xl border border-slate-100 p-3">
          <p className="text-sm font-semibold">Staff working days</p>
          <p className="text-xs text-slate-500">
            Default Sun–Fri (48h/week at 8h/day). Unchecked days are weekly off.
          </p>
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map((d) => {
              const on = workingSet().has(d.v);
              return (
                <button
                  key={d.v}
                  type="button"
                  onClick={() => toggleWorkingDay(d.v)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    on
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <div className="space-y-1.5 pt-2">
            <Label>Exit grace (minutes)</Label>
            <Input
              type="number"
              min={0}
              max={30}
              value={office.exitGraceMinutes}
              onChange={(e) =>
                setOffice({
                  ...office,
                  exitGraceMinutes: Number(e.target.value) || 0,
                })
              }
            />
            <p className="text-xs text-slate-500">
              After leaving the geofence this long, checkout is recorded
              automatically.
            </p>
          </div>
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
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold">Public holidays</p>
          <div className="flex flex-wrap gap-2">
            <Input
              type="date"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              className="w-auto"
            />
            <Input
              value={holidayLabel}
              onChange={(e) => setHolidayLabel(e.target.value)}
              placeholder="Label"
              className="min-w-[140px] flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!holidayDate}
              onClick={() => {
                api<HolidayRow>("/system/holidays", {
                  method: "POST",
                  body: JSON.stringify({
                    date: holidayDate,
                    label: holidayLabel.trim() || "Holiday",
                  }),
                })
                  .then((row) => {
                    setHolidays((prev) =>
                      [...prev.filter((h) => h.id !== row.id), row].sort((a, b) =>
                        a.date.localeCompare(b.date)
                      )
                    );
                    setHolidayDate("");
                    setHolidayLabel("");
                    show("Holiday saved");
                  })
                  .catch((e) => show(String(e), "error"));
              }}
            >
              Add
            </Button>
          </div>
          <ul className="space-y-1 text-sm">
            {holidays.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
              >
                <span>
                  {h.date} — {h.label}
                </span>
                <button
                  type="button"
                  className="text-xs font-semibold text-rose-600"
                  onClick={() => {
                    api(`/system/holidays/${h.id}`, { method: "DELETE" })
                      .then(() => {
                        setHolidays((prev) =>
                          prev.filter((x) => x.id !== h.id)
                        );
                        show("Holiday removed");
                      })
                      .catch((e) => show(String(e), "error"));
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
            {holidays.length === 0 ? (
              <li className="text-xs text-slate-400">No holidays configured</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="glass-card max-w-2xl space-y-3 p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/30">
            <Smartphone className="h-4 w-4" strokeWidth={2} />
          </span>
          <h3 className="text-base font-bold text-slate-900">
            Android force-update
          </h3>
        </div>
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
