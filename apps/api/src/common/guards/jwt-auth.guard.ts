import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization as string | undefined;
    const token = auth?.startsWith("Bearer ") ? auth.substring(7) : undefined;
    if (!token) throw new UnauthorizedException("Token ausente");

    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        tenantId: string;
        role: string;
        sv?: number;
      }>(token, {
        secret: this.config.get<string>("JWT_ACCESS_SECRET")
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user?.isActive) throw new UnauthorizedException("Usuario inativo");
      if (user.sessionVersion !== (payload.sv ?? 0)) {
        throw new UnauthorizedException("Sessao encerrada");
      }

      const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
      if (!tenant?.isActive) throw new UnauthorizedException("Conta suspensa");

      req.user = payload;
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException("Token invalido");
    }
  }
}
