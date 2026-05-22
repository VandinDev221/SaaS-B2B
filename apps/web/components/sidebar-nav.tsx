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
import clsx from "clsx";

const nav = [
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

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
              active ? "bg-primary/10 text-primary" : "hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
