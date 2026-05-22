import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "./audit.service";
import { EntitlementsService } from "./entitlements.service";
import { NotificationsStreamController } from "./notifications-stream.controller";
import { PlatformController } from "./platform.controller";

@Module({
  controllers: [PlatformController, NotificationsStreamController],
  providers: [PrismaService, EntitlementsService, AuditService],
  exports: [EntitlementsService, AuditService]
})
export class PlatformModule {}
