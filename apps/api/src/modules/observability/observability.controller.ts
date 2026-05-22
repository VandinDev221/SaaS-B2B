import { Controller, Get, Header, HttpCode, HttpStatus } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { Registry, collectDefaultMetrics } from "prom-client";
import { HealthService } from "./health.service";

const registry = new Registry();
collectDefaultMetrics({ register: registry });

@Controller("observability")
export class ObservabilityController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get("live")
  live() {
    return this.healthService.live();
  }

  @Public()
  @Get("health")
  @HttpCode(HttpStatus.OK)
  async health() {
    return this.healthService.ready();
  }

  @Public()
  @Get("ready")
  async ready() {
    return this.healthService.ready();
  }

  @Public()
  @Get("metrics")
  metrics() {
    return {
      uptimeSeconds: process.uptime(),
      memoryRss: process.memoryUsage().rss
    };
  }

  @Public()
  @Get("metrics/prometheus")
  @Header("content-type", registry.contentType)
  async prometheus() {
    return await registry.metrics();
  }
}
