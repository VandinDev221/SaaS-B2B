"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const NICHES = [
  "cftv",
  "oficina",
  "clinica",
  "barbearia",
  "solar",
  "delivery",
  "contabilidade",
  "petshop",
  "academia"
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [niche, setNiche] = useState("cftv");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function applyNiche() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/ai/knowledge/apply-niche/${niche}`, { method: "POST" });
      if (!res.ok) throw new Error("Falha ao aplicar nicho");
      setMsg("Catalogo e IA configurados para o nicho.");
      setStep(1);
    } catch {
      setMsg("Erro ao aplicar pacote do nicho.");
    } finally {
      setBusy(false);
    }
  }

  async function installTemplate(slug: string) {
    setBusy(true);
    await fetch(`/api/marketplace/install/${slug}`, { method: "POST" });
    setBusy(false);
    setStep(2);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding — 15 minutos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pipeline + automacoes + catalogo do seu segmento.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 ? (
            <>
              <p className="text-sm font-medium">1. Escolha seu nicho</p>
              <select
                className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              >
                {NICHES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <Button disabled={busy} onClick={() => void applyNiche()}>
                {busy ? "Configurando..." : "Aplicar catalogo + IA"}
              </Button>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <p className="text-sm font-medium">2. Instalar template do marketplace</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void installTemplate("cftv-pipeline-pro")}>
                  Pipeline CFTV
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void installTemplate("oficina-followup")}>
                  Oficina follow-up
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void installTemplate(`barbearia-growth`)}>
                  Barbearia
                </Button>
              </div>
              <Button onClick={() => setStep(2)}>Continuar</Button>
            </>
          ) : null}

          {step >= 2 ? (
            <>
              <p className="text-sm font-medium text-primary">Pronto para operar!</p>
              <p className="text-sm text-muted-foreground">
                Conecte o WhatsApp em Configuracoes, abra o Inbox e ative o Redis para automacoes.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => router.push("/inbox")}>Abrir Inbox</Button>
                <Button variant="outline" onClick={() => router.push("/settings")}>
                  WhatsApp
                </Button>
              </div>
            </>
          ) : null}

          {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
