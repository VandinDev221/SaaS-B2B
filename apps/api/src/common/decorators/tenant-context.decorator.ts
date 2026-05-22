import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type TenantRequestContext = {
  tenantId: string;
  userId: string;
  role: string;
};

export const TenantContext = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): TenantRequestContext => {
    const req = ctx.switchToHttp().getRequest();
    return {
      tenantId: req.user?.tenantId ?? "",
      userId: req.user?.sub ?? "",
      role: req.user?.role ?? "viewer"
    };
  }
);
