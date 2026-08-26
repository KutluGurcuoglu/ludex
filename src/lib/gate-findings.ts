import type { AIAnalysisResult, Severity } from "@/types";

export type GateFindingKind = "critical" | "language" | "spec";

export interface GateFinding {
  id: string;
  kind: GateFindingKind;
  title: string;
  ruleText: string;
  findingText: string;
  probability: Severity;
  evidenceId: string | null;
  allowsElimination: boolean;
  sourceLabel?: string;
}

/**
 * Hakemin karar vermeden geçemeyeceği tüm bulgular: kritik şartname bulguları,
 * dil denetimi başarısızlığı ve genel şartname (specCompliance) ihlalleri.
 */
export function buildGateFindings(analysis: AIAnalysisResult): GateFinding[] {
  const findings: GateFinding[] = analysis.criticalFindings.map((f) => ({
    id: f.id,
    kind: "critical",
    title: "KRİTİK ŞARTNAME BULGUSU",
    ruleText: f.ruleText,
    findingText: f.findingText,
    probability: f.probability,
    evidenceId: f.evidenceId,
    allowsElimination: f.classification === "disqualification",
    sourceLabel: f.sourceLabel,
  }));
  const criticalFindingIds = new Set(analysis.criticalFindings.map((finding) => finding.id));

  if (!analysis.languageCheck.passed) {
    findings.push({
      id: "language-check",
      kind: "language",
      title: "DİL DENETİMİ UYARISI",
      ruleText: `Rapor, şartnamede belirtilen ${analysis.languageCheck.expectedLanguage} dilinde yazılmalıdır.`,
      findingText: `Tespit edilen dil: ${analysis.languageCheck.detectedLanguage} (güven: %${analysis.languageCheck.confidence})`,
      probability: analysis.languageCheck.confidence >= 80 ? "high" : "medium",
      evidenceId: null,
      allowsElimination: false,
    });
  }

  analysis.specCompliance
    .filter((item) => !item.passed && !criticalFindingIds.has(item.id))
    .forEach((item) => {
      findings.push({
        id: item.id,
        kind: "spec",
        title: "ŞARTNAMEYE AYKIRI DURUM",
        ruleText: item.label,
        findingText: item.detail,
        probability: "medium",
        evidenceId: item.evidenceIds[0] ?? null,
        allowsElimination: item.decisionSupport === "disqualification",
        sourceLabel: item.sourceLabel,
      });
    });

  return findings;
}
