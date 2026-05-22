import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MarketplaceProvisionService } from "./marketplace-provision.service";

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provision: MarketplaceProvisionService
  ) {}

  listTemplates(niche?: string) {
    return this.prisma.marketplaceTemplate.findMany({
      where: { isPublic: true, ...(niche ? { niche } : {}) },
      orderBy: { installs: "desc" }
    });
  }

  listInstalled(tenantId: string) {
    return this.prisma.marketplaceInstall.findMany({
      where: { tenantId, status: "active" },
      include: { template: true }
    });
  }

  async install(tenantId: string, templateSlug: string) {
    const template = await this.prisma.marketplaceTemplate.findUnique({ where: { slug: templateSlug } });
    if (!template) throw new NotFoundException("Template nao encontrado");

    const install = await this.prisma.marketplaceInstall.upsert({
      where: { tenantId_templateId: { tenantId, templateId: template.id } },
      create: { tenantId, templateId: template.id },
      update: { status: "active" }
    });

    await this.prisma.marketplaceTemplate.update({
      where: { id: template.id },
      data: { installs: { increment: 1 } }
    });

    const provisioned = await this.provision.provision(tenantId, templateSlug);

    return { install, template, provisioned };
  }

  preview(slug: string) {
    return this.provision.previewDefinition(slug);
  }
}
