"use client";

import { useState, type ReactNode } from "react";
import { BrandLogo } from "./brand-logo";
import { AppHeader } from "./app-header";
import { SidebarNav } from "./sidebar-nav";
import { Sheet, SheetContent } from "./ui/sheet";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative min-h-screen mesh-bg">
      <div className="pointer-events-none fixed inset-0 grid-pattern opacity-[0.35]" aria-hidden />

      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col border-r border-border/60 glass-strong p-5 lg:flex">
          <div className="mb-8">
            <BrandLogo />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Sistema operacional comercial
            </p>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto pr-1">
            <SidebarNav />
          </div>
          <div className="mt-4 rounded-xl border border-border/50 bg-muted/30 p-3">
            <p className="text-xs font-medium text-foreground">Plano Pro ativo</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Tenant demo · CFTV</p>
          </div>
        </aside>

        {/* Mobile drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent className="flex flex-col p-5 pt-14">
            <BrandLogo className="mb-6" />
            <div className="scrollbar-thin flex-1 overflow-y-auto">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 space-y-6 p-4 pb-8 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
