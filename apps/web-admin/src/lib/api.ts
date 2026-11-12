const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

const TOKEN_KEY = "lms_admin_token";
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

export function setSession(token: string, user: AdminUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
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

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "message" in data
        ? Array.isArray((data as { message: unknown }).message)
          ? String((data as { message: string[] }).message[0])
          : String((data as { message: string }).message)
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

export async function loginAdmin(email: string, password: string) {
  const data = await api<{ accessToken: string; user: AdminUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const role = data.user.role || data.user.accountType;
  if (role !== "SUPER_ADMIN" && !(data.user.roles || []).includes("SUPER_ADMIN")) {
    throw new Error("Admin access only");
  }
  setSession(data.accessToken, data.user);
  return data.user;
}
