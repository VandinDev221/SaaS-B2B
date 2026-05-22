import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next || "/dashboard";
  const hasError = params.error === "1";
  const apiDown = params.error === "api";
  const sessionExpired = params.error === "session";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 px-6">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Entrar no FLOWOS</CardTitle>
          <CardDescription>Acesse seu tenant. Demo: admin@flowos.local / admin12345</CardDescription>
        </CardHeader>
        <CardContent>
          {apiDown ? (
            <p className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              API offline. Inicie com <code className="text-xs">npm run dev</code> na raiz (API na porta 4000).
            </p>
          ) : null}
          {sessionExpired ? (
            <p className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              Sessao expirada. Entre novamente com suas credenciais.
            </p>
          ) : null}
          {hasError ? (
            <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">Credenciais invalidas.</p>
          ) : null}
          <form className="space-y-4" action="/api/auth/login" method="post">
            <input type="hidden" name="next" value={next} />
            <div className="space-y-1">
              <label className="text-sm" htmlFor="email">
                Email
              </label>
              <Input id="email" name="email" type="email" required defaultValue="admin@flowos.local" />
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="password">
                Senha
              </label>
              <Input id="password" name="password" type="password" required minLength={8} defaultValue="admin12345" />
            </div>
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/" className="text-primary hover:underline">
              Voltar ao inicio
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
