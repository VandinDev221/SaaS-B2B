"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Payment = {
  id: string;
  provider: string;
  amount: number | string;
  status: string;
  dueDate?: string | null;
  quote?: { number: string } | null;
  pix?: { copyPaste?: string; qrCodeData?: string; qrCodeBase64?: string | null } | null;
  paymentLink?: string;
};

function PixQr({ value, base64 }: { value: string; base64?: string | null }) {
  const src =
    base64 && base64.startsWith("data:")
      ? base64
      : base64
        ? `data:image/png;base64,${base64}`
        : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(value)}`;

  return (
    <img src={src} alt="QR Code PIX" className="mx-auto h-[200px] w-[200px] rounded-lg border border-border bg-white p-2" />
  );
}

export function BillingPanel({
  payments,
  overdue,
  playbook
}: {
  payments: Payment[];
  overdue: Payment[];
  playbook: { name: string; steps: { day: number; channel: string; template: string }[] };
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("2500");
  const [provider, setProvider] = useState<"mercado_pago" | "pix">("mercado_pago");
  const [lastCharge, setLastCharge] = useState<Payment | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function createCharge() {
    const res = await fetch("/api/billing/charges", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, amount: Number(amount) })
    });
    const data = (await res.json()) as Payment;
    setLastCharge(data);
    router.refresh();
  }

  async function markPaid(id: string) {
    await fetch(`/api/billing/payments/${id}/mark-paid`, { method: "POST" });
    router.refresh();
  }

  async function sendWhatsApp(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/billing/payments/${id}/send-whatsapp`, { method: "POST" });
    } finally {
      setBusy(null);
    }
  }

  const pixCode = lastCharge?.pix?.copyPaste ?? lastCharge?.pix?.qrCodeData;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <input
            className="h-10 rounded-xl border border-border px-3 text-sm"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Valor"
          />
          <select
            className="h-10 rounded-xl border border-border px-3 text-sm"
            value={provider}
            onChange={(e) => setProvider(e.target.value as typeof provider)}
          >
            <option value="mercado_pago">Mercado Pago PIX</option>
            <option value="pix">PIX (via Mercado Pago)</option>
          </select>
          <Button onClick={() => void createCharge()}>Gerar cobranca</Button>
        </CardContent>
      </Card>

      {pixCode ? (
        <Card>
          <CardContent className="space-y-3 p-4 text-center">
            <p className="text-sm font-medium">PIX gerado</p>
            <PixQr value={pixCode} base64={lastCharge?.pix?.qrCodeBase64} />
            <p className="break-all text-xs text-muted-foreground">{pixCode}</p>
            {lastCharge?.paymentLink ? (
              <p className="text-xs text-primary">{lastCharge.paymentLink}</p>
            ) : null}
            {lastCharge?.id ? (
              <Button size="sm" variant="outline" disabled={busy === lastCharge.id} onClick={() => void sendWhatsApp(lastCharge.id)}>
                {busy === lastCharge.id ? "Enviando..." : "Enviar link no WhatsApp"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {overdue.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-amber-600">Inadimplencia ({overdue.length})</p>
            <p className="mt-1 text-xs text-muted-foreground">Playbook ativo: {playbook.name}</p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {playbook.steps.map((s) => (
                <li key={s.day}>
                  D{s.day}: {s.channel} — {s.template}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {payments.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">
                  {p.provider.toUpperCase()} — R$ {Number(p.amount).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.quote?.number ? `Orcamento ${p.quote.number}` : "Avulso"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={p.status === "paid" ? "success" : p.status === "overdue" ? "destructive" : "secondary"}>
                  {p.status}
                </Badge>
                {p.status !== "paid" ? (
                  <>
                    <Button size="sm" onClick={() => void markPaid(p.id)}>
                      Marcar pago
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => void sendWhatsApp(p.id)}>
                      WhatsApp
                    </Button>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
