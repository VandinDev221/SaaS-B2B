"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type LeadEditorData = {
  id: string;
  name: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  score?: number;
};

type Props = {
  lead: LeadEditorData;
  onSaved?: () => void;
  onDeleted?: () => void;
  showDeleteLead?: boolean;
};

export function LeadEditor({ lead, onSaved, onDeleted, showDeleteLead = true }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(lead.name ?? "");
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [score, setScore] = useState(String(lead.score ?? 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    setName(lead.name ?? "");
    setPhone(lead.phone ?? "");
    setEmail(lead.email ?? "");
    setNotes(lead.notes ?? "");
    setScore(String(lead.score ?? 0));
  }, [lead]);

  async function save() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          notes: notes.trim() || null,
          score: Number(score) || 0
        })
      });
      const data = (await res.json()) as { message?: string | string[] };
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(", ") : data.message;
        throw new Error(msg ?? `Erro ${res.status}`);
      }
      setOk("Lead atualizado.");
      setOpen(false);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  async function removeLead() {
    if (
      !confirm(
        "Excluir este lead permanentemente? Conversas, mensagens e orcamentos vinculados serao removidos."
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, { method: "DELETE" });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? `Erro ${res.status}`);
      onDeleted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao excluir lead");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Editar lead
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Nome</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do lead" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Telefone (WhatsApp)</label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55..." />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">E-mail</label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Score (0-100)</label>
        <Input value={score} onChange={(e) => setScore(e.target.value)} type="number" min={0} max={100} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Notas</label>
        <textarea
          className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {ok ? <p className="text-xs text-primary">{ok}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy || !name.trim()} onClick={() => void save()}>
          {busy ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        {showDeleteLead ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            disabled={busy}
            onClick={() => void removeLead()}
          >
            Excluir lead
          </Button>
        ) : null}
      </div>
    </div>
  );
}
