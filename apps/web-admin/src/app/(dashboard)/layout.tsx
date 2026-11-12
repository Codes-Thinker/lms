"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  Search,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearSession, getAdminUser, getToken } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { PageEnter } from "@/components/ui/page-enter";
import { SnackbarProvider } from "@/components/ui/snackbar";
import { NotificationsProvider } from "@/components/ui/notifications-provider";
import { NotificationsBell } from "@/components/ui/notifications-bell";
import {
  AdminActivityProvider,
  useAdminActivity,
} from "@/components/ui/admin-activity-provider";
import { useNotifications } from "@/components/ui/notifications-provider";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: UserRoundCog },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/interns", label: "Interns", icon: FolderKanban },
  { href: "/staff", label: "Teachers", icon: BriefcaseBusiness },
  { href: "/fees", label: "Student fees", icon: Wallet },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/inbox", label: "Chat inbox", icon: MessageSquare },
  { href: "/feedback", label: "Feedback", icon: ClipboardList },
  { href: "/system", label: "System", icon: Settings2 },
];

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const activity = useAdminActivity();
  const { notes } = useNotifications();
  const surveyUnread = notes.filter(
    (n) => !n.read && n.type === "survey"
  ).length;
  const feeNoteUnread = notes.filter(
    (n) => !n.read && n.type === "fee"
  ).length;

  const badgeFor = (href: string): number => {
    if (href === "/inbox") return activity.chatUnread;
    if (href === "/feedback") return activity.openTickets + surveyUnread;
    if (href === "/fees")
      return Math.max(activity.feesAwaitingReview, feeNoteUnread);
    return 0;
  };

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto">
      {nav.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));
        const Icon = item.icon;
        const count = badgeFor(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
              active
                ? "bg-[#2563EB] text-white"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{item.label}</span>
            {count > 0 ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                  active ? "bg-white text-blue-700" : "bg-blue-600 text-white"
                )}
              >
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({
  pathname,
  name,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  name: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="mb-6 flex items-center gap-2.5 px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/app_icon.png"
          alt="Code's Thinker LMS"
          className="h-10 w-10 rounded-xl object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/brand/ct_mark.png";
          }}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
            Code&apos;s Thinker LMS
          </p>
          <p className="text-[11px] font-medium text-slate-500">Admin</p>
        </div>
      </div>

      <NavLinks pathname={pathname} onNavigate={onNavigate} />

      <div className="mt-auto border-t border-slate-200 pt-3">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
            {name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "AA"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
            <p className="truncate text-xs text-slate-500">Super Admin</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            title="Sign out"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("Ayaz Aslam");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const user = getAdminUser();
    setName(user?.name || user?.fullName || user?.email || "Ayaz Aslam");
    setReady(true);
  }, [router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Checking session…
      </div>
    );
  }

  const logout = () => {
    clearSession();
    router.replace("/login");
  };

  return (
    <SnackbarProvider>
      <NotificationsProvider>
        <AdminActivityProvider>
          <div className="dashboard-shell flex min-h-screen bg-[#F8FAFC]">
            {/* Desktop sidebar */}
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col border-r border-slate-200 bg-white px-3 py-4 lg:flex">
              <SidebarBody
                pathname={pathname}
                name={name}
                onLogout={logout}
              />
            </aside>

            {/* Mobile drawer */}
            {mobileOpen ? (
              <div className="fixed inset-0 z-40 lg:hidden">
                <button
                  type="button"
                  className="absolute inset-0 bg-slate-900/40"
                  aria-label="Close menu"
                  onClick={() => setMobileOpen(false)}
                />
                <aside className="absolute inset-y-0 left-0 flex w-[min(280px,86vw)] flex-col border-r border-slate-200 bg-white px-3 py-4">
                  <div className="mb-2 flex justify-end px-1">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"
                      onClick={() => setMobileOpen(false)}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <SidebarBody
                    pathname={pathname}
                    name={name}
                    onNavigate={() => setMobileOpen(false)}
                    onLogout={logout}
                  />
                </aside>
              </div>
            ) : null}

            <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-[250px]">
              <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:h-16 sm:gap-3 sm:px-4 md:px-6">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 p-2 text-slate-700 lg:hidden"
                  aria-label="Open menu"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/ct_mark.png"
                  alt=""
                  className="h-8 w-8 rounded-lg object-cover lg:hidden"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/brand/app_icon.png";
                  }}
                />
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search students, interns, staff..."
                    className="h-10 w-full rounded-full border-slate-200 bg-white pl-9"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 sm:flex">
                    <UsersRound className="h-3.5 w-3.5" />
                    Live
                  </div>
                  <NotificationsBell />
                </div>
              </header>
              <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 md:p-6">
                <PageEnter key={pathname}>{children}</PageEnter>
              </main>
            </div>
          </div>
        </AdminActivityProvider>
      </NotificationsProvider>
    </SnackbarProvider>
  );
}
