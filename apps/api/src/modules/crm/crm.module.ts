import { Module } from "@nestjs/common";
import { AutomationModule } from "../automation/automation.module";
import { CrmController } from "./crm.controller";
import { CrmService } from "./crm.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  imports: [AutomationModule],
  controllers: [CrmController],
  providers: [CrmService, PrismaService]
})
export class CrmModule {}
