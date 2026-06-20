import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job, Queue, Worker } from "bullmq";
import type IORedis from "ioredis";
import { createRedisClient } from "../../common/utils/redis-connection";
import { WhatsappAdapterService } from "./whatsapp-adapter.service";

export const WHATSAPP_OUTBOUND_QUEUE = "flowos-whatsapp-outbound";

export type WhatsappOutboundJob = {
  tenantId: string;
  to: string;
  templateName: string;
  body?: string;
  documentUrl?: string;
  fileName?: string;
};

@Injectable()
export class WhatsappOutboundQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappOutboundQueue.name);
  private readonly connection: IORedis;
  private readonly queue: Queue;
  private worker?: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly adapter: WhatsappAdapterService
  ) {
    const redisUrl = config.get<string>("REDIS_URL", "redis://localhost:6379");
    this.connection = createRedisClient(redisUrl);
    this.queue = new Queue(WHATSAPP_OUTBOUND_QUEUE, { connection: this.connection });
  }

  async onModuleInit() {
    if (this.config.get<string>("AUTOMATION_ENABLED", "true") === "false") return;

    this.worker = new Worker(
      WHATSAPP_OUTBOUND_QUEUE,
      (job) => this.process(job),
      { connection: this.connection, concurrency: 3 }
    );
    this.logger.log("Fila WhatsApp outbound ativa");
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue.close();
    await this.connection.quit();
  }

  async enqueue(payload: WhatsappOutboundJob, delayMs = 0) {
    return this.queue.add("send", payload, {
      delay: delayMs,
      attempts: 4,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: 100
    });
  }

  private async process(job: Job<WhatsappOutboundJob>) {
    const data = job.data;
    return this.adapter.sendTemplateMessage({
      tenantId: data.tenantId,
      to: data.to,
      templateName: data.templateName,
      body: data.body
    });
  }
}
