import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job, Queue, Worker } from "bullmq";
import type IORedis from "ioredis";
import { createRedisClient } from "../../common/utils/redis-connection";
import { BillingRecoveryService } from "../billing/billing-recovery.service";
import { AUTOMATION_QUEUE_NAME, AutomationJobName } from "./automation.constants";
import { FollowupD1Service } from "./followup-d1.service";
import { FollowupD7Service } from "./followup-d7.service";
import { PostSaleExecutorService } from "./postsale-executor.service";
import { TenantLifecycleService } from "../tenancy/tenant-lifecycle.service";

type FollowupExecutePayload = { tenantId: string; leadId: string };
type BillingRecoveryPayload = { tenantId: string; paymentId: string; stepKind: string };
type PostSalePayload = { runId: string };

@Injectable()
export class AutomationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationService.name);
  private readonly queueConnection: IORedis;
  private readonly workerConnection: IORedis;
  private readonly queue: Queue;
  private worker?: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly followupD1: FollowupD1Service,
    private readonly followupD7: FollowupD7Service,
    private readonly billingRecovery: BillingRecoveryService,
    private readonly postSale: PostSaleExecutorService,
    private readonly tenantLifecycle: TenantLifecycleService
  ) {
    const redisUrl = config.get<string>("REDIS_URL", "redis://localhost:6379");
    this.queueConnection = createRedisClient(redisUrl);
    this.workerConnection = createRedisClient(redisUrl);
    this.queue = new Queue(AUTOMATION_QUEUE_NAME, { connection: this.queueConnection });
  }

  get isEnabled(): boolean {
    return this.config.get<string>("AUTOMATION_ENABLED", "true") !== "false";
  }

  async onModuleInit() {
    if (!this.isEnabled) {
      this.logger.warn("Automacoes desabilitadas (AUTOMATION_ENABLED=false)");
      return;
    }

    try {
      this.worker = new Worker(AUTOMATION_QUEUE_NAME, (job) => this.processJob(job), {
        connection: this.workerConnection,
        concurrency: Number(this.config.get<string>("AUTOMATION_WORKER_CONCURRENCY", "5"))
      });

      this.worker.on("failed", (job, err) => {
        this.logger.error(`Job ${job?.name} falhou: ${err.message}`);
      });

      await this.scheduleFollowupD1Scan();
      await this.scheduleFollowupD7Scan();
      await this.scheduleBillingRecoveryScan();
      await this.schedulePostSaleScan();
      await this.scheduleTrialExpiryScan();
      this.logger.log("Worker BullMQ ativo (flowos-automation)");
    } catch (err) {
      this.logger.error("Erro crítico ao inicializar automações BullMQ (Redis/Upstash):", err);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue.close();
    await this.queueConnection.quit();
    await this.workerConnection.quit();
  }

  private async processJob(job: Job) {
    switch (job.name) {
      case AutomationJobName.FOLLOWUP_D1_SCAN:
        return this.runFollowupD1Scan(job);
      case AutomationJobName.FOLLOWUP_D1_EXECUTE:
        return this.runFollowupD1Execute(job.data as FollowupExecutePayload);
      case AutomationJobName.FOLLOWUP_D7_SCAN:
        return this.runFollowupD7Scan(job);
      case AutomationJobName.FOLLOWUP_D7_EXECUTE:
        return this.runFollowupD7Execute(job.data as FollowupExecutePayload);
      case AutomationJobName.BILLING_RECOVERY_SCAN:
        return this.runBillingRecoveryScan(job);
      case AutomationJobName.BILLING_RECOVERY_EXECUTE:
        return this.billingRecovery.executeStep(
          (job.data as BillingRecoveryPayload).tenantId,
          (job.data as BillingRecoveryPayload).paymentId,
          (job.data as BillingRecoveryPayload).stepKind
        );
      case AutomationJobName.POSTSALE_SCAN:
        return this.runPostSaleScan(job);
      case AutomationJobName.POSTSALE_EXECUTE:
        return this.postSale.executeRun((job.data as PostSalePayload).runId);
      case AutomationJobName.TRIAL_EXPIRY_SCAN:
        return this.tenantLifecycle.suspendExpiredTrials();
      case AutomationJobName.GENERIC_EVENT: {
        const data = job.data as Record<string, unknown>;
        const eventName = String(data.eventName ?? "");
        if (eventName.startsWith("billing.")) {
          return this.billingRecovery.handleAutomationEvent(data);
        }
        this.logger.log(`Evento ${eventName} tenant=${data.tenantId}`);
        return { ok: true };
      }
      default:
        this.logger.warn(`Job desconhecido: ${job.name}`);
        return { skipped: true };
    }
  }

  private async runBillingRecoveryScan(_job: Job) {
    const scans = await this.billingRecovery.scanAllTenants();
    let enqueued = 0;
    for (const scan of scans) {
      for (const item of scan.due) {
        await this.queue.add(
          AutomationJobName.BILLING_RECOVERY_EXECUTE,
          {
            tenantId: scan.tenantId,
            paymentId: item.paymentId,
            stepKind: item.step.kind
          },
          { removeOnComplete: true, attempts: 3 }
        );
        enqueued++;
      }
    }
    return { enqueued };
  }

  private async scheduleBillingRecoveryScan() {
    const cron = this.config.get<string>("BILLING_RECOVERY_CRON", "0 10 * * *");
    await this.queue.add(
      AutomationJobName.BILLING_RECOVERY_SCAN,
      { source: "scheduler" },
      {
        jobId: "billing-recovery-scan-repeatable",
        repeat: { pattern: cron },
        removeOnComplete: 50
      }
    );
    this.logger.log(`Agendamento cobranca D-1/D+1/D+7: cron="${cron}"`);
  }

  private async runPostSaleScan(_job: Job) {
    const runs = await this.postSale.scanDueRuns();
    for (const run of runs) {
      await this.queue.add(
        AutomationJobName.POSTSALE_EXECUTE,
        { runId: run.id },
        { removeOnComplete: true, attempts: 3 }
      );
    }
    return { enqueued: runs.length };
  }

  private async schedulePostSaleScan() {
    const cron = this.config.get<string>("POSTSALE_CRON", "0 11 * * *");
    await this.queue.add(
      AutomationJobName.POSTSALE_SCAN,
      { source: "scheduler" },
      {
        jobId: "postsale-scan-repeatable",
        repeat: { pattern: cron },
        removeOnComplete: 50
      }
    );
    this.logger.log(`Agendamento pos-venda 7/14/30: cron="${cron}"`);
  }

  private async runFollowupD1Scan(job: Job) {
    const scans = await this.followupD1.scanAllTenants();
    let enqueued = 0;

    for (const scan of scans) {
      for (const leadId of scan.leadIds) {
        await this.enqueueFollowupD1(scan.tenantId, leadId);
        enqueued += 1;
      }
    }

    this.logger.log(
      `Scan D+1 job=${job.id}: tenants=${scans.length} enfileirados=${enqueued}`
    );
    return { tenants: scans.length, enqueued, scans };
  }

  private async runFollowupD1Execute(data: FollowupExecutePayload) {
    if (!data?.tenantId || !data?.leadId) {
      throw new Error("Payload invalido para followup.d1.execute");
    }
    return this.followupD1.execute(data.tenantId, data.leadId);
  }

  private async scheduleFollowupD1Scan() {
    const cron = this.config.get<string>("FOLLOWUP_D1_CRON", "0 * * * *");
    await this.queue.add(
      AutomationJobName.FOLLOWUP_D1_SCAN,
      { source: "scheduler" },
      {
        jobId: "followup-d1-scan-repeatable",
        repeat: { pattern: cron },
        removeOnComplete: 50,
        removeOnFail: 20
      }
    );
    this.logger.log(`Agendamento follow-up D+1: cron="${cron}"`);
  }

  private async scheduleTrialExpiryScan() {
    const cron = this.config.get<string>("TRIAL_EXPIRY_CRON", "0 6 * * *");
    await this.queue.add(
      AutomationJobName.TRIAL_EXPIRY_SCAN,
      { source: "scheduler" },
      {
        jobId: "trial-expiry-scan-repeatable",
        repeat: { pattern: cron },
        removeOnComplete: 20,
        removeOnFail: 10
      }
    );
    this.logger.log(`Agendamento trial expiry: cron="${cron}"`);
  }

  private async scheduleFollowupD7Scan() {
    const cron = this.config.get<string>("FOLLOWUP_D7_CRON", "0 9 * * *");
    await this.queue.add(
      AutomationJobName.FOLLOWUP_D7_SCAN,
      { source: "scheduler" },
      {
        jobId: "followup-d7-scan-repeatable",
        repeat: { pattern: cron },
        removeOnComplete: 50,
        removeOnFail: 20
      }
    );
    this.logger.log(`Agendamento reativacao D+7: cron="${cron}"`);
  }

  private async runFollowupD7Scan(job: Job) {
    const scans = await this.followupD7.scanAllTenants();
    let enqueued = 0;
    for (const scan of scans) {
      for (const leadId of scan.leadIds) {
        await this.enqueueFollowupD7(scan.tenantId, leadId);
        enqueued += 1;
      }
    }
    this.logger.log(`Scan D+7 job=${job.id}: enfileirados=${enqueued}`);
    return { enqueued, scans };
  }

  private async runFollowupD7Execute(data: FollowupExecutePayload) {
    if (!data?.tenantId || !data?.leadId) throw new Error("Payload invalido followup.d7");
    return this.followupD7.execute(data.tenantId, data.leadId);
  }

  async enqueueFollowupD7(tenantId: string, leadId: string, delayMs = 0) {
    return this.queue.add(
      AutomationJobName.FOLLOWUP_D7_EXECUTE,
      { tenantId, leadId, source: "scan" },
      {
        jobId: `followup-d7-immediate:${tenantId}:${leadId}:${Date.now()}`,
        delay: delayMs,
        removeOnComplete: true,
        attempts: 3
      }
    );
  }

  async triggerFollowupD7Scan() {
    return this.queue.add(AutomationJobName.FOLLOWUP_D7_SCAN, { source: "manual" }, {
      removeOnComplete: true
    });
  }

  async enqueue(eventName: string, payload: Record<string, unknown>) {
    await this.queue.add(
      AutomationJobName.GENERIC_EVENT,
      { ...payload, eventName },
      {
        jobId: `${eventName}:${payload.tenantId ?? "global"}:${Date.now()}`,
        removeOnComplete: true,
        attempts: 3
      }
    );
  }

  scheduledFollowupD1JobId(tenantId: string, leadId: string) {
    return `followup-d1-scheduled:${tenantId}:${leadId}`;
  }

  async removeScheduledFollowupD1(tenantId: string, leadId: string) {
    const jobId = this.scheduledFollowupD1JobId(tenantId, leadId);
    const existing = await this.queue.getJob(jobId);
    if (existing) await existing.remove();
  }

  async enqueueFollowupD1Scheduled(tenantId: string, leadId: string, delayMs: number) {
    const jobId = this.scheduledFollowupD1JobId(tenantId, leadId);
    const existing = await this.queue.getJob(jobId);
    if (existing) await existing.remove();

    return this.queue.add(
      AutomationJobName.FOLLOWUP_D1_EXECUTE,
      { tenantId, leadId, source: "scheduled" },
      {
        jobId,
        delay: delayMs,
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 }
      }
    );
  }

  async enqueueFollowupD1(tenantId: string, leadId: string, delayMs = 0) {
    const jobId = `followup-d1-immediate:${tenantId}:${leadId}:${Date.now()}`;

    return this.queue.add(
      AutomationJobName.FOLLOWUP_D1_EXECUTE,
      { tenantId, leadId, source: "scan" },
      {
        jobId,
        delay: delayMs,
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 }
      }
    );
  }

  async triggerFollowupD1Scan() {
    return this.queue.add(AutomationJobName.FOLLOWUP_D1_SCAN, { source: "manual" }, {
      removeOnComplete: true
    });
  }
}
