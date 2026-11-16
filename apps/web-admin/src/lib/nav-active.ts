/**
 * Exact sidebar active matching.
 * Only one item should be active for any pathname.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  const path = pathname.split("?")[0] || "/";

  // Dashboard only on home
  if (href === "/") return path === "/";

  // Enrollments — exact /courses/requests only
  if (href === "/courses/requests") {
    return path === "/courses/requests" || path.startsWith("/courses/requests/");
  }

  // Courses — never when on enrollments
  if (href === "/courses") {
    if (path === "/courses/requests" || path.startsWith("/courses/requests/")) {
      return false;
    }
    return (
      path === "/courses" ||
      path === "/courses/new" ||
      /^\/courses\/[^/]+$/.test(path)
    );
  }

  // Exact segment match: /students active on /students and /students/...,
  // but /staff must not match something else.
  if (path === href) return true;
  if (path.startsWith(`${href}/`)) return true;
  return false;
}
