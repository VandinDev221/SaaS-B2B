"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = {
  configured?: boolean;
  provider?: string;
  instance?: string;
  connectionState?: string;
  webhookUrl?: string;
  error?: string;
  message?: string;
};

type ConnectPayload = {
  base64?: string;
  pairingCode?: string | null;
  code?: string;
  qrcode?: { base64?: string; pairingCode?: string | null };
};

type SetupResult = {
  ok?: boolean;
  connectionState?: string;
  connect?: ConnectPayload;
  message?: string;
};

function toQrDataUrl(raw: string): string {
  const value = raw.trim();
  if (value.startsWith("data:image")) return value;
  return `data:image/png;base64,${value}`;
}

function qrFromConnect(connect?: ConnectPayload): string | null {
  if (!connect) return null;
  const raw = connect.base64 ?? connect.qrcode?.base64;
  return raw ? toQrDataUrl(raw) : null;
}

export function EvolutionPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadStatus() {
    try {
      const res = await fetch("/api/integrations/whatsapp/evolution/status");
      const data = (await res.json()) as Status;
      setStatus(data);
      if (data.error) setMsg(data.error);
    } catch {
      setStatus({ connectionState: "offline", error: "Nao foi possivel carregar o status." });
      setMsg("Nao foi possivel carregar o status. Verifique se a API esta na porta 4000.");
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function runDisconnect() {
    if (
      !window.confirm(
        "Desconectar o WhatsApp desta instancia? Voce precisara escanear o QR Code de novo para reconectar."
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/integrations/whatsapp/evolution/disconnect", {
        method: "POST"
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; connectionState?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Falha ao desconectar");
      setQrSrc(null);
      setMsg(data.message ?? "WhatsApp desconectado.");
      await loadStatus();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao desconectar");
    } finally {
      setBusy(false);
    }
  }

  async function runSetup() {
    setBusy(true);
    setMsg(null);
    setQrSrc(null);
    try {
      const res = await fetch("/api/integrations/whatsapp/evolution/setup", { method: "POST" });
      const data = (await res.json()) as SetupResult;
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Setup falhou");
      const qr = qrFromConnect(data.connect);
      if (qr) setQrSrc(qr);
      const pairing = data.connect?.pairingCode ?? data.connect?.qrcode?.pairingCode;
      if (pairing) {
        setMsg(`Codigo de pareamento: ${pairing}`);
      }
      setMsg((m) => m ?? `Estado: ${data.connectionState ?? "verifique o QR"}`);
      await loadStatus();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro no setup");
    } finally {
      setBusy(false);
    }
  }

  const connected =
    status?.connectionState === "open" || status?.connectionState === "connected";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          WhatsApp (Evolution API)
          {connected ? <Badge variant="success">Conectado</Badge> : <Badge variant="warning">Desconectado</Badge>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Conecte seu numero para enviar follow-ups e receber mensagens no Inbox.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {status ? (
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Provedor:</span> {status.provider ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Instancia:</span> {status.instance ?? "flowos"}
            </p>
            <p>
              <span className="text-muted-foreground">Estado:</span> {status.connectionState ?? status.error ?? "—"}
            </p>
            {status.webhookUrl ? (
              <p className="break-all text-xs text-muted-foreground">Webhook: {status.webhookUrl}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void loadStatus()}>
            Atualizar status
          </Button>
          <Button type="button" disabled={busy} onClick={() => void runSetup()}>
            {busy ? "Gerando QR..." : "Conectar / Gerar QR Code"}
          </Button>
          {connected ? (
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void runDisconnect()}
            >
              {busy ? "Desconectando..." : "Desconectar WhatsApp"}
            </Button>
          ) : null}
        </div>

        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}

        {qrSrc ? (
          <div className="rounded-xl border border-border bg-white p-4 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="QR Code WhatsApp" className="h-64 w-64" />
            <p className="mt-2 text-center text-xs text-muted-foreground">
              WhatsApp → Aparelhos conectados → Conectar aparelho
            </p>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          {status?.configured === false ? (
            <>
              <strong>Producao (Render):</strong> em <code className="text-xs">flowos-api → Environment</code> defina{" "}
              <code className="text-xs">WHATSAPP_PROVIDER=evolution</code>, <code className="text-xs">EVOLUTION_API_URL</code>{" "}
              (URL publica do servidor Evolution), <code className="text-xs">EVOLUTION_API_KEY</code>,{" "}
              <code className="text-xs">EVOLUTION_WEBHOOK_URL</code> (
              <code className="text-xs">https://SUA-API/v1/integrations/whatsapp/webhook/evolution</code>) e{" "}
              <code className="text-xs">EVOLUTION_WEBHOOK_SECRET</code>. Depois redeploy da API.
              <br />
              <strong>Local:</strong> rode <code className="text-xs">npm run setup:evolution</code> com Docker ativo.
            </>
          ) : status?.connectionState === "offline" || status?.error ? (
            <>
              Evolution configurado mas offline. Confira se o servidor Evolution esta no ar e se{" "}
              <code className="text-xs">EVOLUTION_API_KEY</code> confere com <code className="text-xs">AUTHENTICATION_API_KEY</code>{" "}
              do container.
            </>
          ) : (
            <>Escaneie o QR no WhatsApp → Aparelhos conectados → Conectar aparelho.</>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
