// Ludex - Domain tipleri

export type UserRole = "admin" | "judge" | "contestant";

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  /** contestant: tek kategori (ilk eleman) · judge: uzmanlık alanları (çoklu) */
  categoryIds: string[];
  createdAt: string;
}

export type ReportStatus =
  | "pending_assignment" // Gönderildi, admin havuzunda bekliyor
  | "assigned" // Hakeme atandı, hakem henüz açmadı
  | "in_review" // Hakem değerlendirmeye başladı
  | "completed"; // Hakem puanlamayı tamamladı

export interface Report {
  id: string;
  title: string;
  contestantId: string;
  contestantName: string;
  categoryId: string;
  fileName: string;
  fileSizeBytes: number;
  pdfUrl: string;
  status: ReportStatus;
  assignedJudgeId?: string;
  assignedAt?: string;
  submittedAt: string;
}

export type Severity = "low" | "medium" | "high";

export interface Evidence {
  id: string;
  page: number;
  excerpt: string;
  note?: string;
}

export interface RedFlag {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  evidenceIds: string[];
}

export interface ComplianceCheckItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  evidenceIds: string[];
}

export interface SimilarityMatch {
  id: string;
  sourceLabel: string;
  matchPercentage: number;
  excerpt: string;
  evidenceIds: string[];
}

export interface AIWritingRisk {
  score: number; // 0-100
  verdict: Severity;
  explanation: string;
  evidenceIds: string[];
}

export interface AIAnalysisResult {
  reportId: string;
  generatedAt: string;
  redFlags: RedFlag[];
  specCompliance: ComplianceCheckItem[];
  templateCompliance: ComplianceCheckItem[];
  contentAnalysisSummary: string;
  similarityScore: number; // 0-100, genel benzerlik oranı
  similarityMatches: SimilarityMatch[];
  aiWritingRisk: AIWritingRisk;
  suggestedScore?: number;
  evidences: Evidence[];
}

export interface ScoreCriterion {
  id: string;
  label: string;
  maxScore: number;
  description?: string;
}

export interface CriterionScore {
  criterionId: string;
  score: number;
  comment?: string;
}

export type EvaluationStatus = "draft" | "submitted";

export interface JudgeEvaluation {
  id: string;
  reportId: string;
  judgeId: string;
  criteriaScores: CriterionScore[];
  totalScore: number;
  overallComment: string;
  status: EvaluationStatus;
  updatedAt: string;
}

export interface CopilotChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}