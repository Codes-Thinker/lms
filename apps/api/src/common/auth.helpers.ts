import { ForbiddenException } from "@nestjs/common";
import { AuthUser } from "./decorators/current-user.decorator";

export function isAdminOrStaff(user: AuthUser): boolean {
  return (
    user.accountType === "SUPER_ADMIN" ||
    user.accountType === "STAFF" ||
    user.roles?.includes("SUPER_ADMIN") ||
    user.roles?.includes("STAFF")
  );
}

export function assertAdminOrStaff(user: AuthUser): void {
  if (!isAdminOrStaff(user)) {
    throw new ForbiddenException("Staff or admin only");
  }
}

export function assertSelfOrStaff(user: AuthUser, userId: string): void {
  if (user.sub === userId || isAdminOrStaff(user)) return;
  throw new ForbiddenException("Not allowed");
}
