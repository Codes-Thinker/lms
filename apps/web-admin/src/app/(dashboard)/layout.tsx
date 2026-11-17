"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavItemActive } from "@/lib/nav-active";
import { clearSession, getAdminUser, getToken } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { PageEnter } from "@/components/ui/page-enter";
import { RealtimeBridge } from "@/components/ui/realtime-bridge";
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
  { href: "/courses/requests", label: "Enrollments", icon: UsersRound },
  { href: "/quizzes", label: "Quizzes", icon: ClipboardList },
  { href: "/certificates", label: "Certificates", icon: GraduationCap },
  { href: "/inbox", label: "Chat inbox", icon: MessageSquare },
  { href: "/feedback", label: "Feedback", icon: ClipboardList },
  { href: "/system", label: "System", icon: Settings2 },
];

const SIDEBAR_COLLAPSED_KEY = "lms_sidebar_collapsed";

function NavLinks({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed?: boolean;
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
        const active = isNavItemActive(pathname, item.href);
        const Icon = item.icon;
        const count = badgeFor(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "nav-link relative flex items-center rounded-xl py-2.5 text-sm font-medium",
              collapsed ? "justify-center px-2" : "gap-3 px-3",
              active
                ? "bg-[#2563EB] text-white"
                : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed ? (
              <>
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
              </>
            ) : count > 0 ? (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white" />
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
  collapsed,
  onNavigate,
  onLogout,
  onToggleCollapse,
}: {
  pathname: string;
  name: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
  onToggleCollapse?: () => void;
}) {
  const initials =
    name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AA";

  return (
    <>
      <div
        className={cn(
          "mb-6 flex items-center px-2",
          collapsed ? "justify-center" : "gap-2.5"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/app_icon.png"
          alt="Code's Thinker LMS"
          className="h-10 w-10 shrink-0 rounded-xl object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/brand/ct_mark.png";
          }}
        />
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
              Code&apos;s Thinker LMS
            </p>
            <p className="text-[11px] font-medium text-slate-500">Admin</p>
          </div>
        ) : null}
      </div>

      <NavLinks
        pathname={pathname}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />

      <div className="mt-auto space-y-2 border-t border-slate-200 pt-3">
        {onToggleCollapse ? (
          <button
            type="button"
            className={cn(
              "flex w-full items-center rounded-xl border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50",
              collapsed ? "justify-center px-2" : "gap-2 px-3"
            )}
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        ) : null}
        <div
          className={cn(
            "flex items-center px-2",
            collapsed ? "flex-col gap-2" : "gap-3"
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
            {initials}
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
              <p className="truncate text-xs text-slate-500">Super Admin</p>
            </div>
          ) : null}
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === "1") setSidebarCollapsed(true);
    } catch {
      /* private mode */
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const runHeaderSearch = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (!q) return;
      const base = pathname === "/users" || pathname.startsWith("/users/")
        ? "/users"
        : "/students";
      router.push(`${base}?q=${encodeURIComponent(q)}`);
    },
    [pathname, router]
  );

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const trimmed = searchQ.trim();
    if (!trimmed) return;
    searchDebounceRef.current = setTimeout(() => runHeaderSearch(trimmed), 500);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQ, runHeaderSearch]);

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
          <RealtimeBridge />
          <div className="dashboard-shell flex min-h-screen bg-[#F8FAFC]">
            {/* Desktop sidebar */}
            <aside
              className={cn(
                "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-200 bg-white px-3 py-4 transition-[width] duration-200 lg:flex",
                sidebarCollapsed ? "w-[72px]" : "w-[250px]"
              )}
            >
              <SidebarBody
                pathname={pathname}
                name={name}
                collapsed={sidebarCollapsed}
                onLogout={logout}
                onToggleCollapse={toggleSidebar}
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

            <div
              className={cn(
                "flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-200",
                sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[250px]"
              )}
            >
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
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (searchDebounceRef.current) {
                          clearTimeout(searchDebounceRef.current);
                        }
                        runHeaderSearch(searchQ);
                      }
                    }}
                    placeholder="Search students, interns, staff..."
                    className="h-10 w-full rounded-full border-slate-200 bg-white pl-9 pr-9"
                  />
                  {searchQ.trim() ? (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Clear search"
                      onClick={() => setSearchQ("")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
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
