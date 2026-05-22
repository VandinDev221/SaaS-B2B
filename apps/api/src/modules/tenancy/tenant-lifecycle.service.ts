import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class TenantLifecycleService {
  private readonly logger = new Logger(TenantLifecycleService.name);

  constructor(private readonly prisma: PrismaService) {}

  async suspendExpiredTrials() {
    const now = new Date();
    const expired = await this.prisma.subscription.findMany({
      where: {
        status: "active",
        trialEndsAt: { lt: now }
      },
      select: { id: true, tenantId: true, trialEndsAt: true }
    });

    let suspended = 0;
    for (const sub of expired) {
      await this.prisma.$transaction([
        this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "trial_expired" }
        }),
        this.prisma.tenant.update({
          where: { id: sub.tenantId },
          data: { isActive: false }
        })
      ]);
      suspended += 1;
    }

    if (suspended > 0) {
      this.logger.warn(`Trials expirados: ${suspended} tenant(s) suspensos`);
    }

    return { suspended, scanned: expired.length };
  }
}
