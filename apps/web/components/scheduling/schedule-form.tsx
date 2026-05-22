"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ScheduleForm() {
  const router = useRouter();
  const [title, setTitle] = useState("Visita tecnica");
  const [startsAt, setStartsAt] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!startsAt) return;
    setBusy(true);
    try {
      const start = new Date(startsAt);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const res = await fetch("/api/scheduling/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, startsAt: start.toISOString(), endsAt: end.toISOString() })
      });
      if (!res.ok) throw new Error("Falha");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2 rounded-xl border border-border p-4 md:grid-cols-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titulo" />
      <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
      <Button disabled={busy || !startsAt} onClick={() => void create()}>
        {busy ? "Salvando..." : "Novo agendamento"}
      </Button>
    </div>
  );
}
