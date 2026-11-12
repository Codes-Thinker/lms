/** Human labels for account types in admin UI. */
export function roleLabel(accountType?: string | null): string {
  switch ((accountType || "").toUpperCase()) {
    case "STUDENT":
      return "Student";
    case "INTERN":
      return "Intern";
    case "STAFF":
      return "Teacher";
    case "SUPER_ADMIN":
      return "Super Admin";
    default:
      return accountType || "User";
  }
}

export function roleTone(accountType?: string | null): string {
  switch ((accountType || "").toUpperCase()) {
    case "STUDENT":
      return "bg-blue-50 text-blue-700";
    case "INTERN":
      return "bg-sky-50 text-sky-700";
    case "STAFF":
      return "bg-emerald-50 text-emerald-700";
    case "SUPER_ADMIN":
      return "bg-violet-50 text-violet-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function initials(name?: string | null, email?: string | null): string {
  const raw = (name || email || "?").trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return raw.slice(0, 2).toUpperCase();
}
