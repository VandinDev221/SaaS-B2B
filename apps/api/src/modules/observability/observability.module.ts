import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { IntegrationsModule } from "../integrations/integrations.module";
import { ObservabilityController } from "./observability.controller";
import { HealthService } from "./health.service";
import { RequestLoggingMiddleware } from "./request-logging.middleware";

@Module({
  imports: [IntegrationsModule],
  controllers: [ObservabilityController],
  providers: [HealthService, PrismaService]
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes("*");
  }
}
