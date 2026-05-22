import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class WhitelabelService {
  constructor(private readonly prisma: PrismaService) {}

  getBranding(tenantId: string) {
    return this.prisma.tenantBranding.findUnique({ where: { tenantId } });
  }

  async upsertBranding(
    tenantId: string,
    input: {
      brandName: string;
      logoUrl?: string;
      primaryColor?: string;
      accentColor?: string;
      customDomain?: string;
      supportEmail?: string;
      isWhiteLabel?: boolean;
    }
  ) {
    return this.prisma.tenantBranding.upsert({
      where: { tenantId },
      create: { tenantId, ...input },
      update: input
    });
  }
}
