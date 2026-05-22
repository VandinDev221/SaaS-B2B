"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold">Algo deu errado</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Ocorreu um erro inesperado. Tente novamente ou volte ao dashboard.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Tentar novamente</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
          Ir ao dashboard
        </Button>
      </div>
    </div>
  );
}
