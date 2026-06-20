"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Menu } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function LandingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/40 glass-strong">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <BrandLogo />
          <div className="hidden items-center gap-2 sm:flex">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/login">
                Comecar <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2 sm:hidden">
            <ThemeToggle />
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col gap-4 p-6 pt-14">
          <Button asChild className="w-full" size="lg" onClick={() => setOpen(false)}>
            <Link href="/login">Comecar agora</Link>
          </Button>
          <Button asChild variant="outline" className="w-full" size="lg" onClick={() => setOpen(false)}>
            <Link href="/login">Entrar</Link>
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
