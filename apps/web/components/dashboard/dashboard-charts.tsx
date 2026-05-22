import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Channel = { source: string; count: number };
type PipelineStage = { stage: string; label: string; count: number };

function SimpleBarChart({
  items,
  valueKey,
  labelKey
}: {
  items: { [k: string]: string | number }[];
  valueKey: string;
  labelKey: string;
}) {
  const max = Math.max(1, ...items.map((i) => Number(i[valueKey]) || 0));

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados.</p>
      ) : (
        items.map((item, idx) => {
          const value = Number(item[valueKey]) || 0;
          const pct = Math.round((value / max) * 100);
          return (
            <div key={String(item[labelKey] ?? idx)}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="truncate pr-2">{String(item[labelKey])}</span>
                <span className="font-medium tabular-nums">{value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary/80" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export function DashboardCharts({
  channels,
  pipeline
}: {
  channels: Channel[];
  pipeline: PipelineStage[];
}) {
  const pipelineOrder = ["new", "qualified", "proposal_sent", "negotiation", "won", "lost"];
  const sortedPipeline = [...pipeline].sort(
    (a, b) => pipelineOrder.indexOf(a.stage) - pipelineOrder.indexOf(b.stage)
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funil comercial</CardTitle>
          <p className="text-xs text-muted-foreground">Leads por estagio do pipeline</p>
        </CardHeader>
        <CardContent>
          <SimpleBarChart items={sortedPipeline} valueKey="count" labelKey="label" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Canais de origem</CardTitle>
          <p className="text-xs text-muted-foreground">De onde vieram os leads</p>
        </CardHeader>
        <CardContent>
          <SimpleBarChart
            items={channels.map((c) => ({ label: c.source, count: c.count }))}
            valueKey="count"
            labelKey="label"
          />
        </CardContent>
      </Card>
    </div>
  );
}
