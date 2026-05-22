import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AiModule } from "../ai/ai.module";
import { AutomationSettingsService } from "./automation-settings.service";
import { SettingsController } from "./settings.controller";

@Module({
  imports: [AiModule],
  controllers: [SettingsController],
  providers: [AutomationSettingsService, PrismaService],
  exports: [AutomationSettingsService]
})
export class SettingsModule {}
