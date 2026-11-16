/** Sidebar active state — Courses must not match /courses/requests. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/courses/requests") {
    return (
      pathname === "/courses/requests" ||
      pathname.startsWith("/courses/requests/")
    );
  }
  if (href === "/courses") {
    if (
      pathname === "/courses/requests" ||
      pathname.startsWith("/courses/requests/")
    ) {
      return false;
    }
    if (pathname === "/courses" || pathname === "/courses/new") return true;
    return /^\/courses\/[^/]+$/.test(pathname);
  }
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}