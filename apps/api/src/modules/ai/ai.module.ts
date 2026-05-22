import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PlatformModule } from "../platform/platform.module";
import { AiController } from "./ai.controller";
import { AiKnowledgeController } from "./ai-knowledge.controller";
import { AiKnowledgeService } from "./ai-knowledge.service";
import { AiService } from "./ai.service";

@Module({
  imports: [PlatformModule],
  controllers: [AiController, AiKnowledgeController],
  providers: [AiService, AiKnowledgeService, PrismaService],
  exports: [AiService, AiKnowledgeService]
})
export class AiModule {}
