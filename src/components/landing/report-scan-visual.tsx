import { BrainCircuit, FileText, Gavel, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const LINE_WIDTHS = [92, 78, 85, 60, 88, 70];

export function ReportScanVisual({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div
        className="absolute inset-4 -z-10 rounded-[32px] bg-gradient-to-br from-primary/30 to-[var(--brand-glow-2)]/30 blur-2xl"
        aria-hidden="true"
      />

      <div className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card/90 shadow-2xl inset-shadow-sm inset-shadow-white/10 backdrop-blur-md dark:border-white/10 dark:bg-black/40">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 dark:border-white/10">
          <span className="size-2.5 rounded-full bg-destructive/60" />
          <span className="size-2.5 rounded-full bg-[var(--brand-glow-3)]/60" />
          <span className="size-2.5 rounded-full bg-primary/60" />
          <span className="ml-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="size-3.5" />
            rapor-yz-2026.pdf
          </span>
        </div>

        <div className="relative space-y-2.5 overflow-hidden p-5">
          {LINE_WIDTHS.map((width, i) => (
            <div key={i} className="h-2.5 rounded-full bg-muted" style={{ width: `${width}%` }} />
          ))}

          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-12 animate-scan-beam bg-gradient-to-b from-primary/0 via-primary/25 to-primary/0"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="absolute -right-4 top-6 animate-float-slow rounded-full border border-border/60 bg-card/90 px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur-md sm:-right-8 dark:border-white/15 dark:bg-black/40">
        <span className="flex items-center gap-1.5 text-primary">
          <BrainCircuit className="size-3.5" />
          AI Skoru: 92
        </span>
      </div>

      <div
        className="absolute -left-4 bottom-16 animate-float-slow rounded-full border border-border/60 bg-card/90 px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur-md sm:-left-8 dark:border-white/15 dark:bg-black/40"
        style={{ animationDelay: "1s" }}
      >
        <span className="flex items-center gap-1.5 text-[var(--brand-glow-2)]">
          <ShieldCheck className="size-3.5" />
          Şartnameye Uygun
        </span>
      </div>

      <div
        className="absolute -right-2 bottom-0 animate-float-slow rounded-full border border-border/60 bg-card/90 px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur-md sm:-right-6 dark:border-white/15 dark:bg-black/40"
        style={{ animationDelay: "1.8s" }}
      >
        <span className="flex items-center gap-1.5 text-[var(--brand-glow-3)]">
          <Gavel className="size-3.5" />
          Hakem Onayladı
        </span>
      </div>
    </div>
  );
}
