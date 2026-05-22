import { apiGet, ApiError } from "@/lib/api";
import { CsvImport } from "@/components/crm/csv-import";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

type Board = {
  columns: {
    stage: { id: string; name: string; color?: string | null; order: number };
    leads: {
      id: string;
      name: string;
      stage: string;
      score: number;
      tags: string[];
      source?: string | null;
      phone?: string | null;
      email?: string | null;
      notes?: string | null;
    }[];
  }[];
};

export default async function CrmPage() {
  let board: Board | null = null;
  let err: ApiError | null = null;

  try {
    board = await apiGet<Board>("/v1/crm/pipeline");
  } catch (e) {
    err = e as ApiError;
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>CRM — Pipeline Kanban</CardTitle>
          <p className="text-sm text-muted-foreground">Arraste leads entre estagios ou use os botoes rapidos.</p>
          {err ? <p className="text-sm text-amber-600">Erro ao carregar pipeline (status {err.status}).</p> : null}
        </CardHeader>
      </Card>
      <CsvImport />
      {board?.columns?.length ? <KanbanBoard columns={board.columns} /> : null}
    </div>
  );
}
