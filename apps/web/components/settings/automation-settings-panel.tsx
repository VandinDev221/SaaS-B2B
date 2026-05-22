"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SettingsPayload = {
  automation: {
    automationsEnabled: boolean;
    followupD1Enabled: boolean;
    followupD1ScheduleOnInbound: boolean;
    followupD1ScanEnabled: boolean;
    followupD7Enabled: boolean;
    billingRecoveryEnabled: boolean;
    postSaleEnabled: boolean;
  };
  ai: {
    autoCreateQuoteFromChat: boolean;
    autoSendQuotePdf: boolean;
  };
};

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border p-3">
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </span>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export function AutomationSettingsPanel() {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/settings/automation")
      .then(async (r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json() as Promise<SettingsPayload>;
      })
      .then((d) => setData(d))
      .catch(() => setMsg("Nao foi possivel carregar as configuracoes."));
  }, []);

  async function save() {
    if (!data) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/automation", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...data.automation, ...data.ai })
      });
      if (!res.ok) throw new Error("Falha ao salvar");
      const saved = (await res.json()) as SettingsPayload;
      setData(saved);
      setMsg("Configuracoes salvas.");
    } catch {
      setMsg("Erro ao salvar configuracoes.");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <p className={`text-sm ${msg ? "text-amber-600" : "text-muted-foreground"}`}>
        {msg ?? "Carregando automacoes..."}
      </p>
    );
  }

  const master = data.automation.automationsEnabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Automacoes e IA</CardTitle>
        <p className="text-sm text-muted-foreground">
          Controle o que o sistema envia automaticamente no WhatsApp.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Toggle
          label="Automacoes ativas"
          hint="Desliga todas as automacoes do tenant."
          checked={data.automation.automationsEnabled}
          onChange={(v) =>
            setData((s) => s && { ...s, automation: { ...s.automation, automationsEnabled: v } })
          }
        />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Follow-up comercial</p>
          <Toggle
            label="Follow-up D+1"
            hint="Permite envio manual pelo Kanban e automacoes abaixo."
            checked={data.automation.followupD1Enabled}
            disabled={!master}
            onChange={(v) =>
              setData((s) => s && { ...s, automation: { ...s.automation, followupD1Enabled: v } })
            }
          />
          <Toggle
            label="Agendar D+1 ao receber mensagem"
            hint="24h apos cada WhatsApp — reagenda se o cliente voltar a falar."
            checked={data.automation.followupD1ScheduleOnInbound}
            disabled={!master || !data.automation.followupD1Enabled}
            onChange={(v) =>
              setData((s) =>
                s && { ...s, automation: { ...s.automation, followupD1ScheduleOnInbound: v } }
              )
            }
          />
          <Toggle
            label="Scan automatico D+1 (horario)"
            hint="Varre leads sem resposta ha 24h. Pode enviar para leads antigos."
            checked={data.automation.followupD1ScanEnabled}
            disabled={!master || !data.automation.followupD1Enabled}
            onChange={(v) =>
              setData((s) => s && { ...s, automation: { ...s.automation, followupD1ScanEnabled: v } })
            }
          />
          <Toggle
            label="Reativacao D+7"
            checked={data.automation.followupD7Enabled}
            disabled={!master}
            onChange={(v) =>
              setData((s) => s && { ...s, automation: { ...s.automation, followupD7Enabled: v } })
            }
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Cobranca e pos-venda</p>
          <Toggle
            label="Recuperacao de inadimplencia"
            checked={data.automation.billingRecoveryEnabled}
            disabled={!master}
            onChange={(v) =>
              setData((s) => s && { ...s, automation: { ...s.automation, billingRecoveryEnabled: v } })
            }
          />
          <Toggle
            label="Pos-venda 7/14/30"
            checked={data.automation.postSaleEnabled}
            disabled={!master}
            onChange={(v) =>
              setData((s) => s && { ...s, automation: { ...s.automation, postSaleEnabled: v } })
            }
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">IA no WhatsApp</p>
          <Toggle
            label="Orcamento automatico na conversa"
            hint="Responde ou gera orcamento quando detecta intencao de compra."
            checked={data.ai.autoCreateQuoteFromChat}
            disabled={!master}
            onChange={(v) => setData((s) => s && { ...s, ai: { ...s.ai, autoCreateQuoteFromChat: v } })}
          />
          <Toggle
            label="Enviar PDF automaticamente"
            checked={data.ai.autoSendQuotePdf}
            disabled={!master}
            onChange={(v) => setData((s) => s && { ...s, ai: { ...s.ai, autoSendQuotePdf: v } })}
          />
        </div>

        <Button disabled={busy} onClick={() => void save()}>
          {busy ? "Salvando..." : "Salvar configuracoes"}
        </Button>
        {msg ? <p className="text-xs text-primary">{msg}</p> : null}
      </CardContent>
    </Card>
  );
}
