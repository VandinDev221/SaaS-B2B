import { apiGet, ApiError } from "@/lib/api";
import { ScheduleForm } from "@/components/scheduling/schedule-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Appointment = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  location?: string | null;
  lead?: { name: string };
};

export default async function SchedulePage() {
  let appointments: Appointment[] = [];
  let err: ApiError | null = null;
  try {
    appointments = await apiGet<Appointment[]>("/v1/scheduling/appointments");
  } catch (e) {
    err = e as ApiError;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agendamento</CardTitle>
          <p className="text-sm text-muted-foreground">Visitas tecnicas, lembretes e calendario operacional.</p>
          {err ? <p className="text-sm text-amber-600">Erro {err.status}</p> : null}
        </CardHeader>
      </Card>
      <ScheduleForm />
      <div className="space-y-3">
        {appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum agendamento cadastrado.</p>
        ) : (
          appointments.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.lead?.name ?? "Sem lead"} · {new Date(a.startsAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Badge variant="secondary">{a.status}</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
