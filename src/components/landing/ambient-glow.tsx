import { cn } from "@/lib/utils";

export function AmbientGlow({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      <span
        className="glow-blob animate-glow-drift-a left-[8%] top-[8%] size-[45%] bg-[var(--brand-glow-1)]/35"
      />
      <span
        className="glow-blob animate-glow-drift-b right-[5%] top-[22%] size-[42%] bg-[var(--brand-glow-2)]/30"
      />
      <span
        className="glow-blob animate-glow-drift-c bottom-[2%] left-[28%] size-[40%] bg-[var(--brand-glow-3)]/25"
      />
    </div>
  );
}
