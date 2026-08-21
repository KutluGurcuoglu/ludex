// Ludex - Domain tipleri

export type UserRole = "admin" | "judge" | "contestant";

/** Hakem başvurusunun admin tarafından onay durumu. */
export type JudgeApprovalStatus = "pending" | "approved" | "rejected";

/** Hakemin çalışma/eğitim durumu — admin başvuruyu değerlendirirken kullanır. */
export type JudgeWorkStatus = "working" | "studying" | "both";

export interface CompetitionDocument {
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  specification?: CompetitionDocument;
  reportTemplate?: CompetitionDocument;
  createdAt: string;
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

  // Kişisel bilgiler
  isTurkishCitizen?: boolean;
  nationalId?: string;
  gender?: string;
  birthDate?: string;
  referralSource?: string;

  // İletişim bilgileri
  countryCode?: string;
  country?: string;
  city?: string;
  district?: string;
  address?: string;

  // Eğitim bilgileri (yarışmacı/hakem)
  educationLevel?: string;
  school?: string;
  faculty?: string;
  department?: string;
  grade?: string;
  educationNote?: string;

  // Görev bilgileri (yönetici)
  jobTitle?: string;

  // Hakem başvuru/onay bilgileri
  judgeApprovalStatus?: JudgeApprovalStatus;
  judgeWorkStatus?: JudgeWorkStatus;
  /** Bölüm / uzmanlık dalı (Örn: Bilgisayar Mühendisliği) — jobTitle/department'tan ayrı. */
  expertiseArea?: string;
  /** LinkedIn profili veya akademik özgeçmiş (YÖK Akademik / Google Scholar) linki. */
  academicProfileUrl?: string;
  /** Başvuruda yüklenen CV dosyasının adı (demo amaçlı; dosya içeriği saklanmaz). */
  cvFileName?: string;
  /** Sabit kategori listesinde olmayan, kullanıcının kendi eklediği uzmanlık etiketleri. */
  customExpertiseTags?: string[];
  /** KVKK Aydınlatma Metni ve Hakemlik Sözleşmesi'nin onaylandığı zaman. */
  judgeAgreementAcceptedAt?: string;

  // Bildirim tercihleri (varsayılan: açık)
  notifyReportAssigned?: boolean;
  notifyEvaluationUpdates?: boolean;
  notifyProductUpdates?: boolean;
}

export type ReportStatus =
  | "pending_assignment" // Gönderildi, admin havuzunda bekliyor
  | "assigned" // Hakeme atandı, hakem henüz açmadı
  | "in_review" // Hakem değerlendirmeye başladı
  | "completed" // Hakem puanlamayı tamamladı
  | "disqualified"; // Hakemin elenme önerisi admin tarafından onaylandı

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

export interface WritingStyleFlag {
  page: number;
  note: string;
}

export interface AIWritingRisk {
  score: number; // 0-100
  verdict: Severity;
  explanation: string;
  evidenceIds: string[];
  flaggedSections: WritingStyleFlag[];
}

/** Rapor dili otomatik tespiti ve beklenen dille karşılaştırması. */
export interface LanguageCheck {
  detectedLanguage: string;
  expectedLanguage: string;
  passed: boolean;
  confidence: number; // 0-100
}

/** Projenin seçtiği kategoriyle içerik olarak ne kadar örtüştüğüne dair AI kontrolü. */
export interface CategoryFitCheck {
  matchedCategoryId: string;
  matchScore: number; // 0-100
  passed: boolean;
  explanation: string;
}

/** Şartnameden çıkarılan yapılandırılmış kural profili (yasaklar/zorunluluklar/teknik kurallar). */
export interface RuleProfile {
  prohibitions: string[];
  requirements: string[];
  technicalRules: string[];
}

/** "KRİTİK ŞARTNAME BULGUSU" — şartname ihlali ihtimali yüksek, hakemin karar vermesi gereken bulgu. */
export interface CriticalSpecFinding {
  id: string;
  ruleText: string;
  findingText: string;
  probability: Severity;
  evidenceId: string;
}

export interface ContentAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
}

export interface SimilarityBreakdownItem {
  sectionLabel: string;
  matchPercentage: number;
}

export interface SimilarReportMatch {
  id: string;
  reportLabel: string;
  matchPercentage: number;
  breakdown: SimilarityBreakdownItem[];
}

export interface AIAnalysisResult {
  reportId: string;
  generatedAt: string;
  languageCheck: LanguageCheck;
  categoryFitCheck: CategoryFitCheck;
  ruleProfile: RuleProfile;
  criticalFindings: CriticalSpecFinding[];
  redFlags: RedFlag[];
  specCompliance: ComplianceCheckItem[];
  templateCompliance: ComplianceCheckItem[];
  contentAnalysis: ContentAnalysis;
  similarityScore: number; // 0-100, genel benzerlik oranı
  similarReports: SimilarReportMatch[];
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

/** Hakemin bir kritik şartname bulgusu için "Elemeyi Öner" seçince kaydedilen karar. */
export interface DisqualificationRecommendation {
  findingId: string;
  ruleText: string;
  findingText: string;
  evidenceId: string | null;
  decidedAt: string;
  /** Admin'in hakemin elenme önerisi hakkındaki nihai kararı; admin henüz karar vermediyse boş. */
  adminDecision?: "upheld" | "dismissed";
  adminDecidedAt?: string;
}

export interface JudgeEvaluation {
  id: string;
  reportId: string;
  judgeId: string;
  criteriaScores: CriterionScore[];
  totalScore: number;
  overallComment: string;
  status: EvaluationStatus;
  disqualificationRecommendation?: DisqualificationRecommendation | null;
  updatedAt: string;
}

export interface CopilotChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}