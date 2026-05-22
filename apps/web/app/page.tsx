import Link from "next/link";
import { ArrowRight, MessageCircle, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-2xl font-bold text-transparent">
          FLOWOS
        </span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild variant="outline">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/login">Comecar agora</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-8">
        <section className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">Sistema Operacional Comercial</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">
            Transforme WhatsApp e atendimento em uma maquina de receita
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            CRM, inbox, orcamentos, cobranca e automacao verticalizados para CFTV, oficinas, clinicas e prestadores.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login">
                Acessar demo <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="self-center text-sm text-muted-foreground">admin@flowos.local / admin12345 apos setup</p>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            { icon: MessageCircle, title: "WhatsApp Hub", desc: "Inbox centralizado, IA + humano, templates." },
            { icon: TrendingUp, title: "CRM por nicho", desc: "Pipeline Kanban, score e historico." },
            { icon: Zap, title: "Automacao comercial", desc: "Alertas, cobranca e operacoes em tempo real." }
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="h-8 w-8 text-primary" />
                <CardTitle className="mt-2">{title}</CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
