"use client";

import { LogOut, Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { getPageTitle } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

type AppHeaderProps = {
  onMenuClick?: () => void;
};

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass-strong px-4 py-3 md:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 lg:hidden"
            onClick={onMenuClick}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-semibold tracking-tight md:text-xl">
              {title}
            </h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              Operacao em tempo real
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <Button type="button" variant="outline" size="sm" onClick={logout} className="gap-1.5">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
