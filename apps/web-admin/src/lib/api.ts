const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

const TOKEN_KEY = "lms_admin_token";
const REFRESH_KEY = "lms_admin_refresh";
const USER_KEY = "lms_admin_user";

export type AdminUser = {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  role?: string;
  accountType?: string;
  roles?: string[];
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getAdminUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function setSession(
  token: string,
  user: AdminUser,
  refreshToken?: string | null
) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken?: string;
        user: AdminUser;
      };
      setSession(data.accessToken, data.user, data.refreshToken ?? refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
  _retried = false
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  const messageFromBody = () => {
    if (typeof data === "object" && data && "message" in data) {
      const m = (data as { message: unknown }).message;
      if (Array.isArray(m) && m.length) return String(m[0]);
      if (typeof m === "string" && m.trim()) return m;
    }
    if (typeof data === "object" && data && "error" in data) {
      return String((data as { error: unknown }).error);
    }
    return `Request failed (${res.status})`;
  };

  if (res.status === 401) {
    const onAuth =
      path.includes("/auth/login") ||
      path.includes("/auth/refresh") ||
      path.includes("/auth/forgot");
    if (!onAuth && !_retried) {
      const ok = await tryRefreshSession();
      if (ok) return api<T>(path, options, true);
    }
    if (!onAuth) {
      clearSession();
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/login")
      ) {
        window.location.href = "/login";
      }
      throw new Error("Your session has expired. Please sign in again.");
    }
    throw new Error(messageFromBody());
  }

  if (!res.ok) {
    throw new Error(messageFromBody());
  }

  return data as T;
}

export async function loginAdmin(email: string, password: string) {
  const data = await api<{
    accessToken: string;
    refreshToken?: string;
    user: AdminUser;
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const role = data.user.role || data.user.accountType;
  if (
    role !== "SUPER_ADMIN" &&
    !(data.user.roles || []).includes("SUPER_ADMIN")
  ) {
    throw new Error("Admin access only");
  }
  setSession(data.accessToken, data.user, data.refreshToken);
  return data.user;
}

export async function requestPasswordReset(email: string) {
  return api<{ ok: boolean; message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string) {
  return api<{ ok: boolean; message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}
