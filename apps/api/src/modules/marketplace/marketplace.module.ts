import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceProvisionService } from "./marketplace-provision.service";
import { MarketplaceService } from "./marketplace.service";

@Module({
  controllers: [MarketplaceController],
  providers: [MarketplaceService, MarketplaceProvisionService, PrismaService]
})
export class MarketplaceModule {}
