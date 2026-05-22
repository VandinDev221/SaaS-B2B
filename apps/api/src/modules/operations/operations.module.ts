import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AlertsController } from "./alerts.controller";
import { AlertsService } from "./alerts.service";
import { OperationsController } from "./operations.controller";

@Module({
  controllers: [AlertsController, OperationsController],
  providers: [PrismaService, AlertsService],
  exports: [AlertsService]
})
export class OperationsModule {}

