import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";

type TokenUser = { id: string; tenantId: string; role: string; sessionVersion: number };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Credenciais invalidas");
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant?.isActive) {
      throw new UnauthorizedException("Conta suspensa");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Credenciais invalidas");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return user;
  }

  private async signTokens(user: TokenUser) {
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      sv: user.sessionVersion
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.config.get<string>("JWT_ACCESS_EXPIRES_IN", "15m")
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>("JWT_REFRESH_SECRET"),
      expiresIn: this.config.get<string>("JWT_REFRESH_EXPIRES_IN", "7d")
    });
    return { accessToken, refreshToken };
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    return this.signTokens({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
      sessionVersion: user.sessionVersion
    });
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        tenantId: string;
        role: string;
        sv?: number;
      }>(refreshToken, { secret: this.config.get<string>("JWT_REFRESH_SECRET") });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user?.isActive) throw new UnauthorizedException("Refresh token invalido");

      const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
      if (!tenant?.isActive) throw new UnauthorizedException("Conta suspensa");

      if ((payload.sv ?? 0) !== user.sessionVersion) {
        throw new UnauthorizedException("Sessao encerrada");
      }

      return this.signTokens({
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
        sessionVersion: user.sessionVersion
      });
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException("Refresh token invalido");
    }
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.config.get<string>("JWT_REFRESH_SECRET")
      });
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { sessionVersion: { increment: 1 } }
      });
      return { ok: true };
    } catch {
      return { ok: true };
    }
  }

  async assertSession(userId: string, sessionVersion: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive) throw new UnauthorizedException("Usuario inativo");
    if (user.sessionVersion !== sessionVersion) {
      throw new UnauthorizedException("Sessao encerrada");
    }
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant?.isActive) throw new UnauthorizedException("Conta suspensa");
    return user;
  }
}
