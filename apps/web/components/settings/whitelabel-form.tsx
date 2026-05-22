"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Branding = {
  brandName: string;
  primaryColor: string;
  accentColor: string;
  customDomain?: string | null;
  isWhiteLabel: boolean;
};

export function WhitelabelForm({ initial }: { initial: Branding | null }) {
  const [form, setForm] = useState<Branding>({
    brandName: initial?.brandName ?? "FLOWOS",
    primaryColor: initial?.primaryColor ?? "#2563eb",
    accentColor: initial?.accentColor ?? "#3b82f6",
    customDomain: initial?.customDomain ?? "",
    isWhiteLabel: initial?.isWhiteLabel ?? false
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initial) setForm({ ...initial, customDomain: initial.customDomain ?? "" });
  }, [initial]);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/whitelabel/branding", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandName: form.brandName,
          primaryColor: form.primaryColor,
          accentColor: form.accentColor,
          customDomain: form.customDomain || null,
          isWhiteLabel: form.isWhiteLabel
        })
      });
      if (!res.ok) throw new Error("Falha ao salvar");
      setMsg("Branding salvo.");
    } catch {
      setMsg("Erro ao salvar. Apenas owner/admin podem editar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Editar marca</CardTitle>
        <p className="text-sm text-muted-foreground">Nome, cores e dominio exibidos ao cliente.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="block text-sm">
          <span className="text-muted-foreground">Nome da marca</span>
          <Input
            className="mt-1"
            value={form.brandName}
            onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-muted-foreground">Cor primaria</span>
            <Input
              type="color"
              className="mt-1 h-10"
              value={form.primaryColor}
              onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Cor destaque</span>
            <Input
              type="color"
              className="mt-1 h-10"
              value={form.accentColor}
              onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-muted-foreground">Dominio customizado</span>
          <Input
            className="mt-1"
            placeholder="app.suaempresa.com.br"
            value={form.customDomain ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, customDomain: e.target.value }))}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isWhiteLabel}
            onChange={(e) => setForm((f) => ({ ...f, isWhiteLabel: e.target.checked }))}
          />
          Modo white-label ativo
        </label>
        <Button disabled={busy} onClick={() => void save()}>
          {busy ? "Salvando..." : "Salvar branding"}
        </Button>
        {msg ? <p className="text-xs text-primary">{msg}</p> : null}
      </CardContent>
    </Card>
  );
}
