"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadEditor } from "@/components/crm/lead-editor";
import { LeadTimeline } from "@/components/crm/lead-timeline";

type Lead = {
  id: string;
  name: string;
  stage: string;
  score: number;
  tags: string[];
  source?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
};

type Stage = { id: string; name: string; color?: string | null; order: number };

type Column = { stage: Stage; leads: Lead[] };

const STAGE_ORDER = ["new", "qualified", "proposal_sent", "negotiation", "won", "lost"] as const;
const STAGE_BY_ORDER = STAGE_ORDER;

export function KanbanBoard({ columns }: { columns: Column[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dragLead, setDragLead] = useState<string | null>(null);
  const [expandedTimeline, setExpandedTimeline] = useState<string | null>(null);

  async function runFollowup(leadId: string, kind: "d1" | "d7") {
    setBusy(`fu-${kind}-${leadId}`);
    setToast(null);
    try {
      const path =
        kind === "d1"
          ? `/api/automation/followup-d1/leads/${leadId}/run`
          : `/api/automation/followup-d7/leads/${leadId}/run`;
      const res = await fetch(path, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error("Falha no follow-up");
      setToast(
        kind === "d1"
          ? `Follow-up D+1: ${(data as { status?: string }).status ?? "ok"}`
          : `Reativacao D+7: ${(data as { status?: string }).status ?? "ok"}`
      );
      router.refresh();
    } catch {
      setToast("Erro ao enviar follow-up");
    } finally {
      setBusy(null);
    }
  }

  async function moveLead(leadId: string, stage: string) {
    setBusy(leadId);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/stage`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stage })
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      {toast ? <p className="text-sm text-muted-foreground">{toast}</p> : null}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const stageKey = STAGE_BY_ORDER[col.stage.order] ?? "new";
          return (
          <div
            key={col.stage.id}
            className="min-w-[280px] flex-shrink-0"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragLead) void moveLead(dragLead, stageKey);
              setDragLead(null);
            }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{col.stage.name}</span>
                  <Badge variant="secondary">{col.leads.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {col.leads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragLead(lead.id)}
                    onDragEnd={() => setDragLead(null)}
                    className="cursor-grab rounded-xl border border-border bg-background p-3 text-sm shadow-sm active:cursor-grabbing"
                  >
                    <div className="font-medium">{lead.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {lead.tags.slice(0, 2).map((t) => (
                        <Badge key={t} variant="default">
                          {t}
                        </Badge>
                      ))}
                      <Badge variant="secondary">score {lead.score}</Badge>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-1 h-7 px-2 text-xs"
                      onClick={() =>
                        setExpandedTimeline((id) => (id === lead.id ? null : lead.id))
                      }
                    >
                      {expandedTimeline === lead.id ? "Ocultar timeline" : "Timeline"}
                    </Button>
                    {expandedTimeline === lead.id ? (
                      <div className="mt-2">
                        <LeadTimeline leadId={lead.id} />
                      </div>
                    ) : null}
                    <div className="mt-2">
                      <LeadEditor
                        lead={{
                          id: lead.id,
                          name: lead.name,
                          phone: lead.phone,
                          email: lead.email,
                          notes: lead.notes,
                          score: lead.score
                        }}
                        onSaved={() => router.refresh()}
                        onDeleted={() => router.refresh()}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {lead.stage !== "won" && lead.stage !== "lost" ? (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!!busy}
                            onClick={() => void runFollowup(lead.id, "d1")}
                          >
                            {busy === `fu-d1-${lead.id}` ? "..." : "Follow-up D+1"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!!busy}
                            onClick={() => void runFollowup(lead.id, "d7")}
                          >
                            {busy === `fu-d7-${lead.id}` ? "..." : "D+7"}
                          </Button>
                        </>
                      ) : null}
                      {STAGE_ORDER.filter((s) => s !== lead.stage).slice(0, 3).map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant="outline"
                          disabled={busy === lead.id}
                          onClick={() => moveLead(lead.id, s)}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          );
        })}
      </div>
    </div>
  );
}
