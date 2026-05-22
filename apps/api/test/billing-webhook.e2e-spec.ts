import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ConfigModule } from "@nestjs/config";
import { BillingController } from "../src/modules/billing/billing.controller";
import { BillingService } from "../src/modules/billing/billing.service";
import { AutomationService } from "../src/modules/automation/automation.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { signWebhookPayload } from "../src/common/security/webhook-signature.util";
import { MercadoPagoClient } from "../src/modules/integrations/mercado-pago.client";
import { WhatsappOutboundQueue } from "../src/modules/integrations/whatsapp-outbound.queue";

describe("Billing Webhook (e2e)", () => {
  let app: INestApplication;
  const inboxFindUnique = jest.fn().mockResolvedValue(null);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [BillingController],
      providers: [
        BillingService,
        {
          provide: PrismaService,
          useValue: {
            payment: {
              findFirst: jest.fn(),
              create: jest.fn()
            },
            inboxEvent: {
              findUnique: inboxFindUnique,
              create: jest.fn()
            },
            outboxEvent: {
              create: jest.fn()
            }
            ,
            $transaction: async (cb: (tx: any) => Promise<void>) =>
              cb({
                inboxEvent: { create: jest.fn() },
                outboxEvent: { create: jest.fn() }
              })
          }
        },
        {
          provide: AutomationService,
          useValue: { enqueue: jest.fn() }
        },
        {
          provide: MercadoPagoClient,
          useValue: { isConfigured: false, createPixPayment: jest.fn(), getPaymentStatus: jest.fn() }
        },
        {
          provide: WhatsappOutboundQueue,
          useValue: { enqueue: jest.fn() }
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejeita assinatura invalida", async () => {
    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    await request(app.getHttpServer())
      .post("/billing/webhooks/stripe")
      .set("x-flowos-signature", "deadbeef")
      .set("x-flowos-timestamp", timestamp)
      .send({ tenantId: "tenant_1", eventId: "evt_1", eventType: "payment.paid" })
      .expect(403);
  });

  it("aceita assinatura valida", async () => {
    const body = { tenantId: "tenant_1", eventId: "evt_2", eventType: "payment.failed" };
    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const signature = signWebhookPayload("dev-webhook-secret", timestamp, body);

    const response = await request(app.getHttpServer())
      .post("/billing/webhooks/mercado_pago")
      .set("x-flowos-signature", signature)
      .set("x-flowos-timestamp", timestamp)
      .send(body)
      .expect(201);

    expect(response.body.received).toBe(true);
  });

  it("retorna duplicated=true para eventId ja recebido", async () => {
    inboxFindUnique.mockResolvedValueOnce({
      id: "inbox_1",
      tenantId: "tenant_1",
      provider: "stripe",
      eventId: "evt_dup"
    });

    const body = { tenantId: "tenant_1", eventId: "evt_dup", eventType: "payment.paid" };
    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const signature = signWebhookPayload("dev-webhook-secret", timestamp, body);

    const response = await request(app.getHttpServer())
      .post("/billing/webhooks/stripe")
      .set("x-flowos-signature", signature)
      .set("x-flowos-timestamp", timestamp)
      .send(body)
      .expect(201);

    expect(response.body.duplicated).toBe(true);
  });
});
