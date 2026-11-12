"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  UsersRound,
  BriefcaseBusiness,
  FolderKanban,
  MessageSquare,
  ClipboardList,
  Wallet,
  UserRoundCog,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminUser } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { PageEnter } from "@/components/ui/page-enter";
import { SnackbarProvider } from "@/components/ui/snackbar";
import { NotificationsProvider } from "@/components/ui/notifications-provider";
import { NotificationsBell } from "@/components/ui/notifications-bell";
import { Search } from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: UserRoundCog },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/interns", label: "Interns", icon: FolderKanban },
  { href: "/staff", label: "Staff", icon: BriefcaseBusiness },
  { href: "/fees", label: "Fees", icon: Wallet },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/inbox", label: "Chat inbox", icon: MessageSquare },
  { href: "/feedback", label: "Feedback", icon: ClipboardList },
  { href: "/system", label: "System", icon: Settings2 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SnackbarProvider>
      <NotificationsProvider>
      <div className="dashboard-shell flex min-h-screen bg-[#F8FAFC]">
        <aside className="fixed inset-y-0 left-0 z-20 flex w-[220px] flex-col border-r border-slate-200 bg-white px-3 py-4 md:w-[250px]">
          <div className="mb-6 flex items-center gap-2.5 px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/ct_mark.png"
              alt="CT"
              className="h-10 w-10 rounded-full bg-[#0A1228] object-contain p-1"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
                Code&apos;s Thinker
              </p>
              <p className="text-[11px] font-medium text-slate-500">LMS Admin</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                    active
                      ? "bg-[#2563EB] text-white"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-slate-200 pt-3">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                AA
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{adminUser.name}</p>
                <p className="truncate text-xs text-slate-500">Super Admin</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="ml-[220px] flex min-h-screen min-w-0 flex-1 flex-col md:ml-[250px]">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 md:gap-4 md:px-6">
            <div className="relative min-w-0 w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search students, interns, staff..."
                className="h-10 w-full rounded-full border-slate-200 bg-white pl-9"
              />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 md:flex">
                <UsersRound className="h-3.5 w-3.5" />
                Live from APP
              </div>
              <NotificationsBell />
            </div>
          </header>
          <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
            <PageEnter key={pathname}>{children}</PageEnter>
          </main>
        </div>
      </div>
      </NotificationsProvider>
    </SnackbarProvider>
  );
}
