import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const tenantHeader = (req.headers["x-tenant-id"] as string | undefined) ?? "";
    const tokenTenant = (req.user?.tenantId as string | undefined) ?? "";

    // MVP: se o token já carrega tenantId, o header é opcional.
    // Quando o header estiver presente (ex.: chamadas server-to-server), validamos consistência.
    if (!tokenTenant) {
      throw new ForbiddenException("Contexto de tenant invalido");
    }
    if (tenantHeader && tenantHeader !== tokenTenant) {
      throw new ForbiddenException("Contexto de tenant invalido");
    }

    return true;
  }
}
