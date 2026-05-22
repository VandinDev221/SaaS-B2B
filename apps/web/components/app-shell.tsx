import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { SidebarNav } from "./sidebar-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-4 md:p-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-border bg-card/80 p-4 backdrop-blur">
          <div className="mb-6 bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-2xl font-bold text-transparent">
            FLOWOS
          </div>
          <SidebarNav />
        </aside>
        <main className="space-y-6">
          <AppHeader />
          {children}
        </main>
      </div>
    </div>
  );
}
