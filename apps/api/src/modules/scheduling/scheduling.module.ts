import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SchedulingController } from "./scheduling.controller";
import { SchedulingService } from "./scheduling.service";

@Module({
  controllers: [SchedulingController],
  providers: [SchedulingService, PrismaService]
})
export class SchedulingModule {}
