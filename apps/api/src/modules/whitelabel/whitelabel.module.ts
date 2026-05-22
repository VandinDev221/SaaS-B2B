import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { WhitelabelController } from "./whitelabel.controller";
import { WhitelabelService } from "./whitelabel.service";

@Module({
  controllers: [WhitelabelController],
  providers: [WhitelabelService, PrismaService],
  exports: [WhitelabelService]
})
export class WhitelabelModule {}
