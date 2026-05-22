"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

export function AppHeader() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border pb-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Funcionario Digital Comercial</p>
        <p className="text-sm text-foreground/80">Operacao em tempo real</p>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button type="button" variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </header>
  );
}
