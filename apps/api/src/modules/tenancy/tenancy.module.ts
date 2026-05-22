import { Global, Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { TenantLifecycleService } from "./tenant-lifecycle.service";

@Global()
@Module({
  providers: [TenantLifecycleService, PrismaService],
  exports: [TenantLifecycleService]
})
export class TenancyModule {}
