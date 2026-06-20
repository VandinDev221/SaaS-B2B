"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Brain,
  BriefcaseBusiness,
  Calendar,
  CreditCard,
  FileText,
  MessageCircle,
  Package,
  Rocket,
  Settings,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

export const navItems = [
  { href: "/onboarding", label: "Onboarding", icon: Rocket },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/inbox", label: "WhatsApp", icon: MessageCircle },
  { href: "/ai", label: "IA Comercial", icon: Brain },
  { href: "/quotes", label: "Orcamentos", icon: FileText },
  { href: "/billing", label: "Cobranca", icon: CreditCard },
  { href: "/schedule", label: "Agenda", icon: Calendar },
  { href: "/postsale", label: "Pos-venda", icon: BriefcaseBusiness },
  { href: "/marketplace", label: "Marketplace", icon: Package },
  { href: "/operations", label: "Operacao", icon: BriefcaseBusiness },
  { href: "/alerts", label: "Alertas", icon: Bell },
  { href: "/settings", label: "White-label", icon: Settings }
] as const;

const pageTitles: Record<string, string> = {
  "/onboarding": "Onboarding",
  "/dashboard": "Dashboard",
  "/crm": "CRM",
  "/inbox": "WhatsApp Hub",
  "/ai": "IA Comercial",
  "/quotes": "Orcamentos",
  "/billing": "Cobranca",
  "/schedule": "Agenda",
  "/postsale": "Pos-venda",
  "/marketplace": "Marketplace",
  "/operations": "Operacao",
  "/alerts": "Alertas",
  "/settings": "Configuracoes"
};

export function getPageTitle(pathname: string): string {
  const match = Object.entries(pageTitles).find(
    ([path]) => pathname === path || pathname.startsWith(`${path}/`)
  );
  return match?.[1] ?? "FLOWOS";
}

type SidebarNavProps = {
  onNavigate?: () => void;
  compact?: boolean;
};

export function SidebarNav({ onNavigate, compact }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("space-y-0.5", compact ? "px-1" : "")}>
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {active ? (
              <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-accent" />
            ) : null}
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
