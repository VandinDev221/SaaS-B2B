import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PostSaleController } from "./postsale.controller";
import { PostSaleService } from "./postsale.service";

@Module({
  controllers: [PostSaleController],
  providers: [PostSaleService, PrismaService]
})
export class PostSaleModule {}
