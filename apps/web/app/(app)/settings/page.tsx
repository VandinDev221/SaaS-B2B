import { apiGet, ApiError } from "@/lib/api";
import { AutomationSettingsPanel } from "@/components/settings/automation-settings-panel";
import { EvolutionPanel } from "@/components/settings/evolution-panel";
import { WhitelabelForm } from "@/components/settings/whitelabel-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Branding = {
  brandName: string;
  primaryColor: string;
  accentColor: string;
  customDomain?: string | null;
  isWhiteLabel: boolean;
};

export default async function SettingsPage() {
  let branding: Branding | null = null;
  let err: ApiError | null = null;
  try {
    branding = await apiGet<Branding | null>("/v1/whitelabel/branding");
  } catch (e) {
    err = e as ApiError;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuracoes</CardTitle>
          <p className="text-sm text-muted-foreground">
            White-label, WhatsApp Evolution, automacoes e IA.
          </p>
          {err ? <p className="text-sm text-amber-600">Erro {err.status}</p> : null}
        </CardHeader>
        {branding ? (
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Marca atual:</span> {branding.brandName}
            </p>
          </CardContent>
        ) : null}
      </Card>
      <WhitelabelForm initial={branding} />
      <AutomationSettingsPanel />
      <EvolutionPanel />
    </div>
  );
}
