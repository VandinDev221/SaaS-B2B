import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type MercadoPagoPixResult = {
  paymentId: string;
  status: string;
  copyPaste: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
};

@Injectable()
export class MercadoPagoClient {
  private readonly logger = new Logger(MercadoPagoClient.name);

  constructor(private readonly config: ConfigService) {}

  get isConfigured(): boolean {
    return Boolean(this.config.get<string>("MERCADOPAGO_ACCESS_TOKEN"));
  }

  async createPixPayment(input: {
    amount: number;
    description: string;
    externalReference: string;
    payerEmail?: string;
  }): Promise<MercadoPagoPixResult | null> {
    const token = this.config.get<string>("MERCADOPAGO_ACCESS_TOKEN");
    if (!token) return null;

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-idempotency-key": input.externalReference
      },
      body: JSON.stringify({
        transaction_amount: input.amount,
        description: input.description.slice(0, 200),
        payment_method_id: "pix",
        external_reference: input.externalReference,
        payer: {
          email: input.payerEmail ?? "cliente@flowos.local"
        }
      })
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      this.logger.error(`Mercado Pago PIX falhou: ${res.status} ${err.slice(0, 300)}`);
      return null;
    }

    const data = (await res.json()) as {
      id: number;
      status: string;
      point_of_interaction?: {
        transaction_data?: {
          qr_code?: string;
          qr_code_base64?: string;
          ticket_url?: string;
        };
      };
    };

    const tx = data.point_of_interaction?.transaction_data;
    if (!tx?.qr_code) return null;

    return {
      paymentId: String(data.id),
      status: data.status,
      copyPaste: tx.qr_code,
      qrCodeBase64: tx.qr_code_base64,
      ticketUrl: tx.ticket_url
    };
  }

  async getPaymentStatus(mpPaymentId: string): Promise<string | null> {
    const token = this.config.get<string>("MERCADOPAGO_ACCESS_TOKEN");
    if (!token) return null;

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
      headers: { authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: string };
    return data.status ?? null;
  }
}
