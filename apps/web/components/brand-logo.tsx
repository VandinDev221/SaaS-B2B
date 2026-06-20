import { cn } from "@/lib/utils";

export function BrandLogo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl"
  };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-display font-bold text-primary-foreground shadow-lg glow-sm",
          size === "sm" ? "h-8 w-8 text-xs" : size === "md" ? "h-9 w-9 text-sm" : "h-11 w-11 text-base"
        )}
      >
        F
      </div>
      <span className={cn("font-display font-bold tracking-tight text-gradient", sizes[size])}>FLOWOS</span>
    </div>
  );
}
