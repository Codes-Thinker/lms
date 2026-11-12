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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearSession, getAdminUser, getToken } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { PageEnter } from "@/components/ui/page-enter";
import { SnackbarProvider } from "@/components/ui/snackbar";
import { NotificationsProvider } from "@/components/ui/notifications-provider";
import { NotificationsBell } from "@/components/ui/notifications-bell";
import {
  ChatInboxProvider,
  useChatInbox,
} from "@/components/ui/chat-inbox-provider";

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

function NavLinks({ pathname }: { pathname: string }) {
  const { unreadMessages } = useChatInbox();
  return (
    <nav className="flex-1 space-y-1">
      {nav.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));
        const Icon = item.icon;
        const showBadge = item.href === "/inbox" && unreadMessages > 0;
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
            <span className="flex-1 truncate">{item.label}</span>
            {showBadge ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                  active ? "bg-white text-blue-700" : "bg-blue-600 text-white"
                )}
              >
                {unreadMessages > 99 ? "99+" : unreadMessages}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("Admin");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const user = getAdminUser();
    setName(user?.name || user?.fullName || user?.email || "Admin");
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Checking session…
      </div>
    );
  }

  return (
    <SnackbarProvider>
      <NotificationsProvider>
        <ChatInboxProvider>
        <div className="dashboard-shell flex min-h-screen bg-[#F8FAFC]">
          <aside className="fixed inset-y-0 left-0 z-20 flex w-[220px] flex-col border-r border-slate-200 bg-white px-3 py-4 md:w-[250px]">
            <div className="mb-6 flex items-center gap-2.5 px-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/app_icon.png"
                alt="Code's Thinker LMS"
                className="h-10 w-10 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
                  Code&apos;s Thinker LMS
                </p>
                <p className="text-[11px] font-medium text-slate-500">Admin</p>
              </div>
            </div>

            <NavLinks pathname={pathname} />

            <div className="mt-auto border-t border-slate-200 pt-3">
              <div className="flex items-center gap-3 px-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                  {name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                  <p className="truncate text-xs text-slate-500">Super Admin</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                  title="Sign out"
                  onClick={() => {
                    clearSession();
                    router.replace("/login");
                  }}
                >
                  <LogOut className="h-4 w-4" />
                </button>
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
                  Live
                </div>
                <NotificationsBell />
              </div>
            </header>
            <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
              <PageEnter key={pathname}>{children}</PageEnter>
            </main>
          </div>
        </div>
        </ChatInboxProvider>
      </NotificationsProvider>
    </SnackbarProvider>
  );
}
