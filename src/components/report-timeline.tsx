import { CheckCircle2, Clock, FileText, Gavel, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JudgeEvaluation, Report } from "@/types";

function formatShortDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
}

type StepState = "done" | "current" | "upcoming" | "failed";

interface Step {
  key: string;
  label: string;
  date: string | null;
  state: StepState;
  icon: typeof FileText;
}

/** Rapor yaşam döngüsünü (Gönderildi → Atandı → Değerlendirmede → Sonuç) görselleştiren kompakt çizelge. */
export function ReportTimeline({
  report,
  evaluation,
  compact = false,
  className,
}: {
  report: Report;
  evaluation?: JudgeEvaluation | null;
  /** Etiket/tarih olmadan sadece ikon + çizgi gösterir; dar tablo hücreleri için. */
  compact?: boolean;
  className?: string;
}) {
  const isDisqualified = report.status === "disqualified";
  const isFinished = report.status === "completed" || isDisqualified;
  const isInReview = report.status === "in_review";
  const isAssigned = report.status === "assigned" || isInReview || isFinished;

  const steps: Step[] = [
    {
      key: "submitted",
      label: "Gönderildi",
      date: formatShortDate(report.submittedAt),
      state: "done",
      icon: FileText,
    },
    {
      key: "assigned",
      label: "Atandı",
      date: formatShortDate(report.assignedAt),
      state: isAssigned ? "done" : "upcoming",
      icon: Gavel,
    },
    {
      key: "in_review",
      label: "Değerlendirmede",
      date: formatShortDate(report.reviewStartedAt),
      state: isFinished ? "done" : isInReview ? "current" : "upcoming",
      icon: Clock,
    },
    {
      key: "result",
      label: isDisqualified ? "Elendi" : "Tamamlandı",
      date: formatShortDate(evaluation?.updatedAt),
      state: isDisqualified ? "failed" : isFinished ? "done" : "upcoming",
      icon: isDisqualified ? XCircle : CheckCircle2,
    },
  ];

  return (
    <div className={cn("flex items-center", className)}>
      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <div key={step.key} className={cn("flex items-center", i === 0 ? "shrink-0" : "flex-1")}>
            {i > 0 && (
              <div
                className={cn(
                  "h-px flex-1",
                  step.state === "upcoming" ? "bg-border" : "bg-primary/40",
                )}
              />
            )}
            <div
              className={cn(
                "flex shrink-0 flex-col items-center gap-1",
                compact ? "px-0.5" : "px-1",
              )}
              title={`${step.label}${step.date ? ` · ${step.date}` : ""}`}
            >
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full border",
                  compact ? "size-3.5" : "size-5",
                  step.state === "done" &&
                    "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  step.state === "current" && "border-primary bg-primary/10 text-primary",
                  step.state === "failed" &&
                    "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400",
                  step.state === "upcoming" && "border-border text-muted-foreground/40",
                )}
              >
                <Icon className={compact ? "size-2" : "size-3"} />
              </div>
              {!compact && (
                <span
                  className={cn(
                    "text-[11px] leading-tight whitespace-nowrap",
                    step.state === "upcoming" ? "text-muted-foreground/50" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                  {step.date ? ` · ${step.date}` : ""}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
