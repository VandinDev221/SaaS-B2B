"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 font-sans">
        <h1 className="text-2xl font-bold">FLOWOS</h1>
        <p className="text-sm text-neutral-600">Erro critico na aplicacao.</p>
        <pre className="max-w-lg overflow-auto rounded bg-neutral-100 p-3 text-xs">
          {error.message}
        </pre>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
          onClick={() => reset()}
        >
          Recarregar
        </button>
      </body>
    </html>
  );
}
