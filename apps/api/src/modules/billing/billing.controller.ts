import { Body, Controller, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { PaymentStatus, UserRole } from "@prisma/client";
import { IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { TenantContext, TenantRequestContext } from "../../common/decorators/tenant-context.decorator";
import { BillingWebhookDto } from "./dto/webhook.dto";
import { BillingService } from "./billing.service";

class CreateChargeDto {
  @IsIn(["stripe", "mercado_pago", "pix"])
  provider!: "stripe" | "mercado_pago" | "pix";

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  quoteId?: string;

  @IsOptional()
  @IsNumber()
  dueDays?: number;
}

class SubscriptionDto {
  @IsString()
  planCode!: string;
}

@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("payments")
  listPayments(
    @TenantContext() ctx: TenantRequestContext,
    @Query("status") status?: PaymentStatus
  ) {
    return this.billingService.listPayments(ctx.tenantId, status);
  }

  @Get("payments/:id")
  getPayment(@TenantContext() ctx: TenantRequestContext, @Param("id") id: string) {
    return this.billingService.getPayment(ctx.tenantId, id);
  }

  @Get("overdue")
  listOverdue(@TenantContext() ctx: TenantRequestContext) {
    return this.billingService.listOverdue(ctx.tenantId);
  }

  @Get("recovery-playbook")
  recoveryPlaybook() {
    return this.billingService.getRecoveryPlaybook();
  }

  @Post("charges")
  createCharge(
    @TenantContext() ctx: TenantRequestContext,
    @Headers("x-idempotency-key") idempotencyKey: string | undefined,
    @Body() body: CreateChargeDto
  ) {
    return this.billingService.createCharge({ tenantId: ctx.tenantId, idempotencyKey, ...body });
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Post("payments/:id/mark-paid")
  markPaid(@TenantContext() ctx: TenantRequestContext, @Param("id") id: string) {
    return this.billingService.markPaid(ctx.tenantId, id);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Post("overdue/sync")
  syncOverdue(@TenantContext() ctx: TenantRequestContext) {
    return this.billingService.markOverdue(ctx.tenantId);
  }

  @Roles(UserRole.owner, UserRole.admin)
  @Post("subscriptions")
  createSubscription(@TenantContext() ctx: TenantRequestContext, @Body() body: SubscriptionDto) {
    return this.billingService.createSubscription({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      planCode: body.planCode
    });
  }

  @Public()
  @Post("webhooks/:provider")
  processWebhook(
    @Param("provider") provider: string,
    @Headers("x-flowos-signature") signature: string,
    @Headers("x-flowos-timestamp") timestamp: string,
    @Body() body: BillingWebhookDto
  ) {
    return this.billingService.processWebhook({ provider, signature, timestamp, body });
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Post("outbox/dispatch")
  dispatchOutbox(@TenantContext() ctx: TenantRequestContext) {
    return this.billingService.dispatchPendingOutbox(ctx.tenantId);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent)
  @Post("payments/:id/send-whatsapp")
  sendPaymentWhatsApp(@TenantContext() ctx: TenantRequestContext, @Param("id") id: string) {
    return this.billingService.sendPaymentLinkWhatsApp(ctx.tenantId, id);
  }

  @Public()
  @Post("webhooks/mercadopago")
  mercadoPagoWebhook(
    @Body() body: Record<string, unknown>,
    @Headers("x-signature") xSignature?: string,
    @Headers("x-request-id") xRequestId?: string
  ) {
    return this.billingService.processMercadoPagoWebhook(
      body as { data?: { id?: string }; action?: string },
      { xSignature, xRequestId }
    );
  }
}
