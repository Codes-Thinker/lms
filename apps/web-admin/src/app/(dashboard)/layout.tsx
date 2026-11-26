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
  Users,
  Settings,
  Search,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Award,
  MessageCircleWarning,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavItemActive } from "@/lib/nav-active";
import { pageTitleForPath } from "@/lib/page-titles";
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

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label?: string; items: NavItem[] };

/** Grouped nav — clearer hierarchy, less “long random list” vibe. */
const navGroups: NavGroup[] = [
  {
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "People",
    items: [
      { href: "/users", label: "Users", icon: Users },
      { href: "/students", label: "Students", icon: GraduationCap },
      { href: "/interns", label: "Interns", icon: FolderKanban },
      { href: "/staff", label: "Teachers", icon: BriefcaseBusiness },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/fees", label: "Student fees", icon: Wallet },
      { href: "/attendance", label: "Attendance", icon: CalendarCheck },
      { href: "/courses", label: "Courses", icon: BookOpen },
      { href: "/courses/requests", label: "Enrollments", icon: UsersRound },
    ],
  },
  {
    label: "Learning",
    items: [
      { href: "/quizzes", label: "Quizzes", icon: ClipboardList },
      { href: "/certificates", label: "Certificates", icon: Award },
      { href: "/ai", label: "AI coach", icon: Sparkles },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/inbox", label: "Chat inbox", icon: MessageSquare },
      { href: "/feedback", label: "Feedback", icon: MessageCircleWarning },
    ],
  },
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
  const { unreadForSection } = useNotifications();

  const badgeFor = (href: string): number => {
    const noteCount = unreadForSection(href);
    if (href === "/inbox") return Math.max(activity.chatUnread, noteCount);
    if (href === "/fees")
      return Math.max(activity.feesAwaitingReview, noteCount);
    if (href === "/feedback") return noteCount;
    return noteCount;
  };

  return (
    <nav className="sidebar-scroll flex-1 space-y-3 pr-0.5">
      {navGroups.map((group, gi) => (
        <div key={group.label ?? `g-${gi}`} className="space-y-0.5">
          {group.label && !collapsed ? (
            <p className="px-3 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => {
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
                  "nav-link relative flex items-center rounded-xl py-2 text-[13px] font-semibold",
                  collapsed ? "justify-center px-2" : "gap-2.5 px-2.5",
                  active
                    ? "bg-white text-[#1a120e] shadow-[0_8px_22px_-14px_rgba(0,0,0,0.65)]"
                    : "bg-transparent text-white/88 hover:bg-white/12 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "h-[17px] w-[17px] shrink-0",
                    active ? "text-[#1a120e]" : "text-white/90"
                  )}
                  strokeWidth={2.1}
                />
                {!collapsed ? (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {count > 0 ? (
                      <span
                        className={cn(
                          "badge-pulse rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                          active
                            ? "bg-[#1a120e] text-white"
                            : "bg-rose-500 text-white"
                        )}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    ) : null}
                  </>
                ) : count > 0 ? (
                  <span className="badge-pulse absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#1c100c]" />
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** When admin opens a section, mark its notifications as read. */
function SectionReadOnVisit() {
  const pathname = usePathname();
  const { markSectionRead } = useNotifications();

  useEffect(() => {
    const section =
      [
        "/feedback",
        "/fees",
        "/inbox",
        "/attendance",
        "/staff",
        "/interns",
      ].find((s) => pathname === s || pathname.startsWith(`${s}/`)) ?? null;
    if (!section) return;
    const t = window.setTimeout(() => markSectionRead(section), 400);
    return () => window.clearTimeout(t);
  }, [pathname, markSectionRead]);

  return null;
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

  const settingsActive = isNavItemActive(pathname, "/system");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "mb-4 flex items-center px-2",
          collapsed ? "justify-center" : "gap-2.5"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/app_icon.png"
          alt="Code's Thinker LMS"
          className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-white/25"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/brand/ct_mark.png";
          }}
        />
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold tracking-tight text-white">
              Code&apos;s Thinker
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
              LMS Admin
            </p>
          </div>
        ) : null}
      </div>

      <NavLinks
        pathname={pathname}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />

      {/* Settings + profile + logout stay together — no huge empty gap */}
      <div className="mt-3 space-y-1 border-t border-white/15 pt-3">
        <Link
          href="/system"
          title={collapsed ? "Settings" : undefined}
          onClick={onNavigate}
          aria-current={settingsActive ? "page" : undefined}
          className={cn(
            "nav-link relative flex items-center rounded-xl py-2 text-[13px] font-semibold",
            collapsed ? "justify-center px-2" : "gap-2.5 px-2.5",
            settingsActive
              ? "bg-white text-[#1a120e] shadow-[0_8px_22px_-14px_rgba(0,0,0,0.65)]"
              : "bg-transparent text-white/88 hover:bg-white/12 hover:text-white"
          )}
        >
          <Settings className="h-[17px] w-[17px] shrink-0" strokeWidth={2.1} />
          {!collapsed ? <span className="flex-1 truncate">Settings</span> : null}
        </Link>

        {onToggleCollapse ? (
          <button
            type="button"
            className={cn(
              "flex w-full items-center rounded-xl py-1.5 text-xs font-semibold text-white/65 hover:bg-white/10 hover:text-white",
              collapsed ? "justify-center px-2" : "gap-2 px-2.5"
            )}
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" strokeWidth={2} />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span>Collapse</span>
              </>
            )}
          </button>
        ) : null}

        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/18 text-[11px] font-bold text-white ring-1 ring-white/30">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{name}</p>
              <p className="truncate text-[11px] text-white/60">Super Admin</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/18 text-[11px] font-bold text-white ring-1 ring-white/30">
              {initials}
            </div>
          </div>
        )}

        <button
          type="button"
          className={cn(
            "flex w-full items-center rounded-xl py-2 text-[13px] font-semibold text-rose-300 hover:bg-rose-500/20 hover:text-rose-100",
            collapsed ? "justify-center px-2" : "gap-2.5 px-2.5"
          )}
          title="Sign out"
          onClick={onLogout}
        >
          <LogOut className="h-[17px] w-[17px] shrink-0" strokeWidth={2.1} />
          {!collapsed ? <span>Logout</span> : null}
        </button>
      </div>
    </div>
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
      <div className="dashboard-shell flex min-h-screen items-center justify-center text-sm text-white/70">
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
          <SectionReadOnVisit />
          <div className="dashboard-shell flex min-h-screen">
            {/* Desktop sidebar */}
            <aside
              className={cn(
                "glass-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden px-2.5 py-4 transition-[width] duration-300 ease-out lg:flex",
                sidebarCollapsed ? "w-[72px]" : "w-[236px]"
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
                  className="absolute inset-0 bg-[#1C1410]/50 backdrop-blur-sm"
                  aria-label="Close menu"
                  onClick={() => setMobileOpen(false)}
                />
                <aside className="glass-sidebar absolute inset-y-0 left-0 flex w-[min(270px,88vw)] flex-col px-2.5 py-4">
                  <div className="mb-2 flex justify-end px-1">
                    <button
                      type="button"
                      className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white"
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
                sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[236px]"
              )}
            >
              <header className="glass-header sticky top-0 z-20 flex h-12 items-center gap-3 px-3 animate-fade-in sm:h-14 sm:gap-4 sm:px-5 md:px-6">
                <button
                  type="button"
                  className="rounded-xl border border-black/10 bg-white p-2 text-[#1a120e] lg:hidden"
                  aria-label="Open menu"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="h-5 w-5" strokeWidth={2} />
                </button>
                <div className="hidden min-w-0 lg:block">
                  <p className="truncate text-sm font-bold text-[#1a120e]">
                    {pageTitleForPath(pathname).title}
                  </p>
                  <p className="truncate text-[11px] font-medium text-[#1a120e]/60">
                    Admin Overview
                  </p>
                </div>
                <div className="relative min-w-0 flex-1 lg:max-w-md lg:flex-none lg:ml-auto">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1a120e]/50"
                    strokeWidth={2}
                  />
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
                    placeholder="Search records..."
                    className="h-9 w-full rounded-full border-black/10 bg-white pl-9 pr-9 text-[#1a120e] placeholder:text-[#1a120e]/45 shadow-sm"
                  />
                  {searchQ.trim() ? (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#1a120e]/45 hover:bg-black/5 hover:text-[#1a120e]"
                      aria-label="Clear search"
                      onClick={() => setSearchQ("")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  <NotificationsBell />
                  <div className="hidden items-center gap-2 rounded-full border border-black/10 bg-white px-2.5 py-1 sm:flex">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a120e]/8 text-[10px] font-bold text-[#1a120e]">
                      {(name.split(" ").map((p) => p[0]).join("").slice(0, 2) ||
                        "AA"
                      ).toUpperCase()}
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-xs font-semibold text-[#1a120e]">
                        {name.split(" ")[0] || "Admin"}
                      </p>
                      <p className="truncate text-[10px] font-medium text-[#1a120e]/55">
                        Super Admin
                      </p>
                    </div>
                  </div>
                </div>
              </header>
              <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 md:p-5">
                <PageEnter key={pathname}>{children}</PageEnter>
              </main>
            </div>
          </div>
        </AdminActivityProvider>
      </NotificationsProvider>
    </SnackbarProvider>
  );
}
