import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
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
    <div className="relative flex min-h-screen mesh-bg">
      <div className="pointer-events-none fixed inset-0 grid-pattern opacity-30" aria-hidden />

      {/* Painel esquerdo — desktop */}
      <div className="relative hidden w-1/2 flex-col justify-between border-r border-border/50 p-10 lg:flex xl:p-14">
        <BrandLogo size="lg" />
        <div className="max-w-md space-y-6 animate-slide-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Funcionario digital comercial
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Uma maquina de receita no seu{" "}
            <span className="text-gradient">WhatsApp</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            CRM, inbox, orcamentos, cobranca e IA — tudo em um so lugar para pequenos negocios.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">© FLOWOS · Vertical SaaS B2B</p>
      </div>

      {/* Formulario */}
      <div className="relative flex flex-1 flex-col">
        <div className="flex justify-end p-4 sm:p-6">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-8">
          <Card className="w-full max-w-md glass-strong glow-sm">
            <CardHeader className="space-y-2 text-center sm:text-left">
              <div className="lg:hidden">
                <BrandLogo className="mb-4 justify-center sm:justify-start" />
              </div>
              <CardTitle className="text-2xl">Bem-vindo de volta</CardTitle>
              <CardDescription>
                Demo: <span className="font-medium text-foreground">admin@flowos.local</span> / admin12345
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apiDown ? (
                <p className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                  API offline. Verifique se a API Render esta no ar.
                </p>
              ) : null}
              {sessionExpired ? (
                <p className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                  Sessao expirada. Entre novamente.
                </p>
              ) : null}
              {hasError ? (
                <p className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Credenciais invalidas.
                </p>
              ) : null}
              <form className="space-y-5" action="/api/auth/login" method="post">
                <input type="hidden" name="next" value={next} />
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="email">
                    Email
                  </label>
                  <Input id="email" name="email" type="email" required defaultValue="admin@flowos.local" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="password">
                    Senha
                  </label>
                  <Input id="password" name="password" type="password" required minLength={8} defaultValue="admin12345" />
                </div>
                <Button type="submit" className="w-full gap-2" size="lg">
                  Entrar no FLOWOS
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link href="/" className="font-medium text-primary transition hover:underline">
                  Voltar ao inicio
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
