import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { AuthUser } from "../decorators/current-user.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    if (!user) throw new ForbiddenException("Unauthorized");
    const ok =
      user.roles?.some((r) => required.includes(r)) ||
      required.includes(user.accountType) ||
      user.accountType === "SUPER_ADMIN" ||
      user.roles?.includes("SUPER_ADMIN");
    if (!ok) throw new ForbiddenException("Insufficient permissions");
    return true;
  }
}
