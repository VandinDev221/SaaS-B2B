import Link from "next/link";
import { ArrowRight, MessageCircle, TrendingUp, Zap } from "lucide-react";
import { LandingHeader } from "@/components/landing-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen mesh-bg">
      <div className="pointer-events-none fixed inset-0 grid-pattern opacity-25" aria-hidden />
      <LandingHeader />

      <main className="relative mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-20">
        <section className="mx-auto max-w-3xl text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            Sistema Operacional Comercial
          </div>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Transforme atendimento em{" "}
            <span className="text-gradient">receita previsivel</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            CRM, inbox WhatsApp, orcamentos com IA, cobranca PIX e automacoes — verticalizado para CFTV,
            oficinas, clinicas e prestadores.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="w-full gap-2 sm:w-auto">
              <Link href="/login">
                Acessar demo <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="text-center text-sm text-muted-foreground sm:text-left">
              <code className="rounded-lg bg-muted px-2 py-1 text-xs">admin@flowos.local</code>
              <span className="mx-2">·</span>
              <code className="rounded-lg bg-muted px-2 py-1 text-xs">admin12345</code>
            </p>
          </div>
        </section>

        <section className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: MessageCircle,
              title: "WhatsApp Hub",
              desc: "Inbox unificado com IA, humano no loop e templates inteligentes.",
              gradient: "from-violet-500/20 to-primary/5"
            },
            {
              icon: TrendingUp,
              title: "CRM por nicho",
              desc: "Pipeline Kanban, score de leads e historico completo de interacoes.",
              gradient: "from-accent/20 to-cyan-500/5"
            },
            {
              icon: Zap,
              title: "Automacao comercial",
              desc: "Follow-up D+1/D+7, cobranca, alertas e pos-venda automatizados.",
              gradient: "from-primary/20 to-violet-500/5"
            }
          ].map(({ icon: Icon, title, desc, gradient }) => (
            <Card
              key={title}
              className={`group overflow-hidden border-border/50 bg-gradient-to-br ${gradient} transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
            >
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary transition group-hover:scale-110 group-hover:bg-primary/25">
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">{desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="mt-24 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 p-8 text-center sm:p-12">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Pronto para operar seu comercial?</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Configure em 15 minutos: nicho, WhatsApp e automacoes. Sem planilhas, sem caos.
          </p>
          <Button asChild size="lg" className="mt-8 gap-2">
            <Link href="/login">
              Iniciar agora <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
