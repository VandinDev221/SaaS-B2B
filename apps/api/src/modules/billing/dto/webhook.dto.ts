import { IsIn, IsOptional, IsString } from "class-validator";

export class BillingWebhookDto {
  @IsString()
  tenantId!: string;

  @IsString()
  eventId!: string;

  @IsIn(["payment.paid", "payment.failed", "payment.overdue"])
  eventType!: "payment.paid" | "payment.failed" | "payment.overdue";

  @IsOptional()
  @IsString()
  paymentId?: string;
}
