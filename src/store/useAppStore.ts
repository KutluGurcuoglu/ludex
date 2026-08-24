import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { hashPassword } from "@/lib/hash";
import type {
  AppNotification,
  Category,
  CompetitionDocument,
  FaqEntry,
  JudgeEvaluation,
  JudgeWorkStatus,
  Report,
  ReportStatus,
  ScoreCriterion,
  SupportMessage,
  User,
  UserRole,
} from "@/types";

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function createNotification(
  input: Omit<AppNotification, "id" | "createdAt" | "readAt">,
): AppNotification {
  return {
    ...input,
    id: `notif-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    readAt: null,
  };
}

/**
 * Bir raporun durumunu, ona atanmış hakemlerin gönderdiği değerlendirmelere bakarak
 * yeniden hesaplar. Birden fazla hakem atanmışsa "completed", hepsi puanlamayı
 * tamamladığında; herhangi biri elenme önerisiyle onaylanmışsa "disqualified" olur.
 */
function computeAggregateReportStatus(
  report: Report,
  evaluations: JudgeEvaluation[],
): ReportStatus {
  if (report.assignedJudgeIds.length === 0) return "pending_assignment";

  const relevantEvaluations = evaluations.filter(
    (e) => e.reportId === report.id && report.assignedJudgeIds.includes(e.judgeId),
  );
  const submitted = relevantEvaluations.filter((e) => e.status === "submitted");

  const anyUpheld = submitted.some(
    (e) => e.disqualificationRecommendation?.adminDecision === "upheld",
  );
  if (anyUpheld) return "disqualified";

  if (submitted.length > 0 && submitted.length >= report.assignedJudgeIds.length) {
    return "completed";
  }
  if (relevantEvaluations.length > 0) return "in_review";
  return "assigned";
}

const DASHBOARD_PATH_BY_ROLE: Record<UserRole, string> = {
  admin: "/admin",
  judge: "/judge",
  contestant: "/contestant",
};

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const CATEGORIES: Category[] = [
  {
    id: "cat-yz",
    name: "Yapay Zeka",
    slug: "yapay-zeka",
    createdAt: "2026-05-01T09:00:00.000Z",
  },
  {
    id: "cat-insansiz",
    name: "İnsansız Sistemler",
    slug: "insansiz-sistemler",
    createdAt: "2026-05-01T09:00:00.000Z",
  },
  {
    id: "cat-siber",
    name: "Siber Güvenlik",
    slug: "siber-guvenlik",
    createdAt: "2026-05-01T09:00:00.000Z",
  },
];

function seedFromString(value: string): number {
  let sum = 0;
  for (const ch of value) sum += ch.charCodeAt(0);
  return sum;
}

/**
 * Şartname yüklendiğinde tetiklenen sahte "AI tarama": gerçek bir doküman analizi yapmaz,
 * kategori kimliğinden türetilmiş sabit bir seçim yaparak her kategoriye kendi kriter
 * setini verir — aynı kategori her seferinde aynı sonucu üretir.
 */
const CRITERION_POOL: { label: string; description: string }[] = [
  {
    label: "Kritik Tasarım Raporu (KTR) Uygunluğu",
    description: "Şartnamede tanımlanan kritik tasarım gereksinimlerine uyum",
  },
  {
    label: "Ön Tasarım Raporu (ÖTR) Bütünlüğü",
    description: "Tasarım sürecinin ön rapor aşamasındaki tutarlılığı",
  },
  {
    label: "Teknik Yeterlilik Formu (TYF) Uyumu",
    description: "Teknik yeterlilik kriterlerinin karşılanma düzeyi",
  },
  { label: "Özgünlük ve Yenilikçilik", description: "Çözümün özgünlüğü ve mevcut yaklaşımlardan farkı" },
  { label: "Şartnameye Uygunluk", description: "Yarışma şartnamesinde belirtilen kurallara uyum" },
  { label: "Görev Performansı", description: "Görev senaryosundaki başarı ve performans" },
  { label: "Güvenlik ve Risk Yönetimi", description: "Olası risklerin öngörülmesi ve alınan önlemler" },
  { label: "Sunum ve Raporlama Kalitesi", description: "Raporun anlaşılırlığı, düzeni ve sunumu" },
  { label: "Maliyet ve Sürdürülebilirlik", description: "Çözümün maliyet etkinliği ve sürdürülebilirliği" },
  { label: "Test ve Doğrulama", description: "Yapılan testlerin kapsamı ve sonuçların güvenilirliği" },
];

const CRITERION_WEIGHT_SETS = [
  [30, 30, 20, 20],
  [35, 25, 25, 15],
  [25, 25, 25, 25],
  [40, 20, 20, 20],
];

function generateMockCriteriaFromSpecification(category: Pick<Category, "id" | "name">): ScoreCriterion[] {
  const seed = seedFromString(category.id + category.name);
  const startIdx = seed % CRITERION_POOL.length;
  const weights = CRITERION_WEIGHT_SETS[seed % CRITERION_WEIGHT_SETS.length];

  return weights.map((maxScore, i) => {
    const pick = CRITERION_POOL[(startIdx + i * 3) % CRITERION_POOL.length];
    return {
      id: `crit-${category.id}-${crypto.randomUUID()}`,
      label: pick.label,
      maxScore,
      description: pick.description,
    };
  });
}

/** Şartname yüklendiğinde önerilen gönderim penceresi: bugün açılır, 30 gün sonra kapanır. */
function generateMockSubmissionWindow(): { opensAt: string; closesAt: string } {
  const now = Date.now();
  return {
    opensAt: new Date(now).toISOString(),
    closesAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

const SCORE_CRITERIA: ScoreCriterion[] = [
  {
    id: "crit-content",
    label: "İçerik ve Özgünlük",
    maxScore: 30,
    description: "Projenin özgünlüğü ve içerik derinliği",
  },
  {
    id: "crit-technical",
    label: "Teknik Yeterlilik",
    maxScore: 30,
    description: "Uygulanan yöntemin teknik sağlamlığı",
  },
  {
    id: "crit-compliance",
    label: "Şartnameye Uygunluk",
    maxScore: 20,
    description: "Yarışma şartnamesine uyum",
  },
  {
    id: "crit-presentation",
    label: "Sunum ve Raporlama Kalitesi",
    maxScore: 20,
    description: "Raporun anlaşılırlığı ve sunumu",
  },
];

const SEED_FAQS: FaqEntry[] = [
  {
    id: "faq-judge-1",
    role: "judge",
    question: "Bana atanan bir rapor listede görünmüyor, ne yapmalıyım?",
    answer:
      "Rapor havuzuna admin tarafından eklenip sana atanmasını bekle. Kategori sekmelerini kontrol et; rapor farklı bir kategoride görünüyor olabilir.",
  },
  {
    id: "faq-judge-2",
    role: "judge",
    question: "Değerlendirmemi gönderdim ama yarışmacıya gitmedi, neden?",
    answer:
      "Gönderdiğin değerlendirme önce admin onayından geçer. Onaylanıp yayınlandığında hem sen hem yarışmacı bildirim alırsınız; bu genelde kısa sürer.",
  },
  {
    id: "faq-judge-3",
    role: "judge",
    question: "Hakem başvurum hâlâ 'Onay Bekliyor' görünüyor.",
    answer:
      "Admin başvuruları elden geçirdikçe onaylar. Başvurundan sonra biraz beklemen gerekebilir; onaylandığında bildirim alacaksın.",
  },
  {
    id: "faq-contestant-1",
    role: "contestant",
    question: "Raporum ne zaman değerlendirilecek?",
    answer:
      "Admin raporunu bir hakeme atadıktan sonra değerlendirme süreci başlar. Raporunun durumunu 'Raporlarım' sekmesindeki zaman çizelgesinden takip edebilirsin.",
  },
  {
    id: "faq-contestant-2",
    role: "contestant",
    question: "Değerlendirme tamamlandı ama puanları göremiyorum.",
    answer:
      "Hakem bitirdikten sonra sonuç önce admin onayından geçer. Onaylanıp yayınlanınca bildirim alır ve sonucu görebilirsin.",
  },
  {
    id: "faq-contestant-3",
    role: "contestant",
    question: "Yanlış kategoriye rapor gönderdim, düzeltebilir miyim?",
    answer: "Kendi başına düzenleyemezsin; aşağıdan admin'e destek talebi göndererek durumu bildir.",
  },
];

const SEED_USERS: User[] = [
  {
    id: "admin-1",
    name: "Admin Kullanıcı",
    email: "admin@ludex.com",
    phone: "+90 500 000 00 00",
    role: "admin",
    categoryIds: [],
    createdAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "judge-1",
    name: "Dr. Elif Yılmaz",
    email: "elif.yilmaz@ludex.com",
    phone: "+90 532 111 22 33",
    role: "judge",
    categoryIds: ["cat-yz", "cat-siber"],
    createdAt: "2026-06-02T09:00:00.000Z",
    judgeApprovalStatus: "approved",
    judgeWorkStatus: "working",
  },
  {
    id: "judge-2",
    name: "Kaan Demir",
    email: "kaan.demir@ludex.com",
    phone: "+90 533 222 33 44",
    role: "judge",
    categoryIds: ["cat-insansiz"],
    createdAt: "2026-06-02T09:30:00.000Z",
    judgeApprovalStatus: "approved",
    judgeWorkStatus: "studying",
  },
  {
    id: "contestant-1",
    name: "Mehmet Can Öztürk",
    email: "mehmet.ozturk@example.com",
    phone: "+90 541 333 44 55",
    role: "contestant",
    categoryIds: ["cat-yz"],
    createdAt: "2026-06-05T12:00:00.000Z",
  },
  {
    id: "contestant-2",
    name: "Zeynep Kaya",
    email: "zeynep.kaya@example.com",
    phone: "+90 542 444 55 66",
    role: "contestant",
    categoryIds: ["cat-insansiz"],
    createdAt: "2026-06-05T12:10:00.000Z",
  },
  {
    id: "contestant-3",
    name: "Ali Vural",
    email: "ali.vural@example.com",
    phone: "+90 543 555 66 77",
    role: "contestant",
    categoryIds: ["cat-siber"],
    createdAt: "2026-06-06T08:00:00.000Z",
  },
];

/**
 * Demo amaçlı; gerçek bir backend'de şifreler sunucu tarafında, tuzlanmış ve yavaş bir
 * algoritmayla (bcrypt/argon2) saklanır. Burada sadece localStorage'da düz metin durmasın
 * diye SHA-256 hash'i tutuyoruz — bu değer, "demo1234" şifresinin SHA-256 hash'idir.
 */
const DEMO_PASSWORD_HASH = "0ead2060b65992dca4769af601a1b3a35ef38cfad2c2c465bb160ea764157c5d";
const SEED_CREDENTIALS: Record<string, string> = {
  "admin@ludex.com": DEMO_PASSWORD_HASH,
  "elif.yilmaz@ludex.com": DEMO_PASSWORD_HASH,
  "kaan.demir@ludex.com": DEMO_PASSWORD_HASH,
  "mehmet.ozturk@example.com": DEMO_PASSWORD_HASH,
  "zeynep.kaya@example.com": DEMO_PASSWORD_HASH,
  "ali.vural@example.com": DEMO_PASSWORD_HASH,
};

const SEED_REPORTS: Report[] = [
  {
    id: "report-1",
    title: "Otonom Sürü Robotları için Yapay Zeka Tabanlı Yol Planlama",
    contestantId: "contestant-1",
    contestantName: "Mehmet Can Öztürk",
    categoryId: "cat-yz",
    fileName: "yz-rapor-mehmet-ozturk.pdf",
    fileSizeBytes: 4_200_000,
    pdfUrl: "/mock-pdfs/sample-report.pdf",
    status: "in_review",
    assignedJudgeIds: ["judge-1"],
    assignedAt: "2026-08-10T10:00:00.000Z",
    reviewStartedAt: "2026-08-10T15:00:00.000Z",
    submittedAt: "2026-08-08T14:32:00.000Z",
  },
  {
    id: "report-2",
    title: "İnsansız Hava Aracı Sürü Koordinasyon Sistemi",
    contestantId: "contestant-2",
    contestantName: "Zeynep Kaya",
    categoryId: "cat-insansiz",
    fileName: "ihasistem-zeynep-kaya.pdf",
    fileSizeBytes: 5_800_000,
    pdfUrl: "/mock-pdfs/sample-report.pdf",
    status: "assigned",
    assignedJudgeIds: ["judge-2"],
    assignedAt: "2026-08-12T11:00:00.000Z",
    submittedAt: "2026-08-11T09:15:00.000Z",
  },
  {
    id: "report-3",
    title: "Siber Güvenlik Olay Müdahale Otomasyonu",
    contestantId: "contestant-3",
    contestantName: "Ali Vural",
    categoryId: "cat-siber",
    fileName: "siber-rapor-ali-vural.pdf",
    fileSizeBytes: 3_100_000,
    pdfUrl: "/mock-pdfs/sample-report.pdf",
    status: "pending_assignment",
    assignedJudgeIds: [],
    submittedAt: "2026-08-15T16:45:00.000Z",
  },
  {
    id: "report-4",
    title: "Endüstriyel Tesislerde Anomali Tespiti için Derin Öğrenme",
    contestantId: "contestant-1",
    contestantName: "Mehmet Can Öztürk",
    categoryId: "cat-yz",
    fileName: "anomali-tespit-mehmet-ozturk.pdf",
    fileSizeBytes: 2_650_000,
    pdfUrl: "/mock-pdfs/sample-report.pdf",
    status: "completed",
    assignedJudgeIds: ["judge-1"],
    assignedAt: "2026-08-01T10:00:00.000Z",
    reviewStartedAt: "2026-08-02T09:00:00.000Z",
    submittedAt: "2026-07-30T13:00:00.000Z",
  },
];

const SEED_EVALUATIONS: JudgeEvaluation[] = [
  {
    id: "eval-report-4",
    reportId: "report-4",
    judgeId: "judge-1",
    criteriaScores: [
      {
        criterionId: "crit-content",
        score: 26,
        comment: "Özgün bir yaklaşım, literatür taraması güçlü.",
      },
      {
        criterionId: "crit-technical",
        score: 25,
        comment: "Model mimarisi sağlam, ancak test seti sınırlı.",
      },
      { criterionId: "crit-compliance", score: 18 },
      {
        criterionId: "crit-presentation",
        score: 17,
        comment: "Görselleştirmeler faydalı, anlatım akıcı.",
      },
    ],
    totalScore: 86,
    overallComment:
      "Genel olarak başarılı, teknik derinliği yüksek bir çalışma. Test verisinin genişletilmesi önerilir.",
    status: "submitted",
    visibleToContestant: true,
    updatedAt: "2026-08-05T15:00:00.000Z",
  },
];

interface PasswordResetRequest {
  userId: string;
  code: string;
  channel: "email" | "phone";
  destination: string;
  expiresAt: number;
}

interface EmailVerificationRequest {
  userId: string;
  code: string;
  expiresAt: number;
}

export interface AppState {
  categories: Category[];
  scoreCriteria: ScoreCriterion[];
  faqs: FaqEntry[];
  users: User[];
  /** Admin'in hakem atama/onay ekranlarının okuduğu, gerçek backend'den gelen hakem listesi. */
  judges: User[];
  credentials: Record<string, string>;
  reports: Report[];
  evaluations: JudgeEvaluation[];
  notifications: AppNotification[];
  supportMessages: SupportMessage[];
  currentUserId: string | null;
  passwordResetRequest: PasswordResetRequest | null;
  emailVerificationRequest: EmailVerificationRequest | null;

  /**
   * Gerçek backend'den çekilen veriyi store'a yazan setter'lar. Mock CRUD
   * action'larından farklı olarak bunlar sunucudan gelen veriyi olduğu gibi
   * yansıtır — sayfalar hâlâ bu store'dan okuduğu için (useAppStore
   * selector'ları), gerçek fetch sonuçlarının ekrana yansıması için
   * kullanılır (bkz. src/services/*.ts).
   */
  setReports: (reports: Report[]) => void;
  setCategories: (categories: Category[]) => void;
  setEvaluations: (evaluations: JudgeEvaluation[]) => void;
  setScoreCriteria: (criteria: ScoreCriterion[]) => void;
  setUsers: (users: User[]) => void;
  setJudges: (judges: User[]) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  sendSupportMessage: (userId: string, subject: string, message: string) => void;
  resolveSupportMessage: (id: string) => void;
  sendAnnouncement: (input: {
    audience: "contestants" | "judges" | "both" | "custom";
    userIds?: string[];
    categoryId?: string;
    title: string;
    body?: string;
  }) => number;

  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean; code?: string }>;
  register: (input: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: Extract<UserRole, "contestant" | "judge">;
  }) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean; code?: string }>;
  verifyEmail: (code: string) => { success: boolean; error?: string };
  resendEmailVerification: () => { success: boolean; error?: string; code?: string };
  /** Internal: yeni bir kod üretir, emailVerificationRequest'e yazar ve kodu döner. */
  issueEmailVerificationCode: (userId: string) => string;
  demoLogin: (role: UserRole) => void;
  logout: () => void;

  updateProfile: (
    userId: string,
    updates: Partial<
      Pick<
        User,
        | "name"
        | "phone"
        | "isTurkishCitizen"
        | "nationalId"
        | "gender"
        | "birthDate"
        | "referralSource"
        | "countryCode"
        | "country"
        | "city"
        | "district"
        | "address"
        | "educationLevel"
        | "school"
        | "faculty"
        | "department"
        | "grade"
        | "educationNote"
        | "jobTitle"
        | "notifyReportAssigned"
        | "notifyEvaluationUpdates"
        | "notifyEvaluationApproved"
        | "notifyNewJudgeApplication"
        | "notifyNewReportSubmission"
        | "notifyDisqualificationFlag"
        | "notifySupportRequest"
        | "notifyProductUpdates"
      >
    >,
  ) => void;
  deleteAccount: (userId: string) => void;

  requestPasswordReset: (
    channel: "email" | "phone",
    identifier: string,
  ) => { success: boolean; error?: string; code?: string };
  resetPassword: (code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;

  submitJudgeApplication: (
    userId: string,
    input: {
      categoryIds: string[];
      workStatus: JudgeWorkStatus;
      jobTitle?: string;
      department?: string;
      expertiseArea?: string;
      academicProfileUrl?: string;
      cvFileName?: string;
      customExpertiseTags?: string[];
      agreementAccepted?: boolean;
    },
  ) => void;

  addReport: (input: {
    contestantId: string;
    categoryId: string;
    title: string;
    fileName: string;
    fileSizeBytes: number;
    pdfUrl: string;
  }) => Report;
  assignReports: (reportIds: string[], judgeId: string) => void;
  unassignJudge: (reportId: string, judgeId: string) => void;
  saveEvaluation: (evaluation: JudgeEvaluation) => void;
  resolveDisqualification: (reportId: string, decision: "upheld" | "dismissed") => void;
  approveEvaluation: (evaluationId: string) => void;
  setCategoryReleaseDate: (categoryId: string, releaseAt: string | null) => void;
  releaseCategoryResults: (categoryId: string) => void;
  setCategoryEvaluationDeadline: (categoryId: string, deadline: string | null) => void;
  checkScheduledReleases: () => void;

  addCategory: (input: { name: string; description?: string }) => Category;
  updateCategory: (id: string, updates: Partial<Pick<Category, "name" | "description">>) => void;
  setCategorySpecification: (id: string, doc: CompetitionDocument) => void;
  setCategoryTemplate: (id: string, doc: CompetitionDocument) => void;
  regenerateCategoryCriteria: (categoryId: string) => ScoreCriterion[];
  addCategoryCriterion: (
    categoryId: string,
    input: { label: string; maxScore: number; description?: string },
  ) => ScoreCriterion;
  updateCategoryCriterion: (
    categoryId: string,
    criterionId: string,
    updates: Partial<Pick<ScoreCriterion, "label" | "maxScore" | "description">>,
  ) => void;
  deleteCategoryCriterion: (categoryId: string, criterionId: string) => void;
  setCategorySubmissionWindow: (
    categoryId: string,
    opensAt: string | null,
    closesAt: string | null,
  ) => void;

  addScoreCriterion: (input: {
    label: string;
    maxScore: number;
    description?: string;
  }) => ScoreCriterion;
  updateScoreCriterion: (
    id: string,
    updates: Partial<Pick<ScoreCriterion, "label" | "maxScore" | "description">>,
  ) => void;
  deleteScoreCriterion: (id: string) => void;
  addFaqEntry: (input: Omit<FaqEntry, "id">) => FaqEntry;
  updateFaqEntry: (id: string, updates: Partial<Pick<FaqEntry, "question" | "answer">>) => void;
  deleteFaqEntry: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      categories: CATEGORIES,
      scoreCriteria: SCORE_CRITERIA,
      faqs: SEED_FAQS,
      users: SEED_USERS.map((u) => ({ ...u, emailVerifiedAt: u.createdAt })),
      judges: [],
      credentials: SEED_CREDENTIALS,
      reports: SEED_REPORTS,
      evaluations: SEED_EVALUATIONS,
      notifications: [],
      supportMessages: [],
      currentUserId: null,
      passwordResetRequest: null,
      emailVerificationRequest: null,

      login: async (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const { users, credentials } = get();
        const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);
        const hashed = await hashPassword(password);

        if (!user || credentials[user.email] !== hashed) {
          return { success: false, error: "E-posta veya şifre hatalı." };
        }

        if (!user.emailVerifiedAt) {
          const code = get().issueEmailVerificationCode(user.id);
          return {
            success: false,
            error: "E-posta adresini henüz doğrulamadın. Sana yeni bir kod gönderdik.",
            requiresVerification: true,
            code,
          };
        }

        set({ currentUserId: user.id });
        return { success: true };
      },

      register: async ({ name, email, phone, password, role }) => {
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPhone = normalizePhone(phone);
        const { users } = get();

        if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
          return { success: false, error: "Bu e-posta ile zaten bir hesap var." };
        }
        if (normalizedPhone && users.some((u) => normalizePhone(u.phone) === normalizedPhone)) {
          return { success: false, error: "Bu telefon numarasıyla zaten bir hesap var." };
        }

        const newUser: User = {
          id: `${role}-${crypto.randomUUID()}`,
          name,
          email,
          phone,
          role,
          categoryIds: [],
          createdAt: new Date().toISOString(),
          emailVerifiedAt: null,
          ...(role === "judge" ? { judgeApprovalStatus: "pending" as const } : {}),
        };
        const hashed = await hashPassword(password);

        set((state) => ({
          users: [...state.users, newUser],
          credentials: { ...state.credentials, [email]: hashed },
        }));

        const code = get().issueEmailVerificationCode(newUser.id);
        return { success: true, requiresVerification: true, code };
      },

      issueEmailVerificationCode: (userId) => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        set({
          emailVerificationRequest: { userId, code, expiresAt: Date.now() + 10 * 60 * 1000 },
        });
        return code;
      },

      resendEmailVerification: () => {
        const pending = get().emailVerificationRequest;
        if (!pending) {
          return { success: false, error: "Bekleyen bir doğrulama isteği yok." };
        }
        const code = get().issueEmailVerificationCode(pending.userId);
        return { success: true, code };
      },

      verifyEmail: (code) => {
        const request = get().emailVerificationRequest;

        if (!request || request.expiresAt < Date.now()) {
          return { success: false, error: "Kodun süresi doldu, lütfen tekrar isteyin." };
        }
        if (request.code !== code.trim()) {
          return { success: false, error: "Girdiğiniz kod hatalı." };
        }

        const user = get().users.find((u) => u.id === request.userId);
        if (!user) {
          return { success: false, error: "Kullanıcı bulunamadı." };
        }

        set((state) => ({
          users: state.users.map((u) =>
            u.id === user.id ? { ...u, emailVerifiedAt: new Date().toISOString() } : u,
          ),
          emailVerificationRequest: null,
          currentUserId: user.id,
        }));

        return { success: true };
      },

      requestPasswordReset: (channel, identifier) => {
        const normalized = identifier.trim().toLowerCase();
        const user = get().users.find((u) =>
          channel === "email"
            ? u.email.toLowerCase() === normalized
            : u.phone.replace(/\s/g, "") === identifier.replace(/\s/g, ""),
        );

        if (!user) {
          return {
            success: false,
            error:
              channel === "email"
                ? "Bu e-posta adresine kayıtlı bir hesap bulunamadı."
                : "Bu telefon numarasına kayıtlı bir hesap bulunamadı.",
          };
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        set({
          passwordResetRequest: {
            userId: user.id,
            code,
            channel,
            destination: channel === "email" ? user.email : user.phone,
            expiresAt: Date.now() + 10 * 60 * 1000,
          },
        });

        return { success: true, code };
      },

      resetPassword: async (code, newPassword) => {
        const request = get().passwordResetRequest;

        if (!request || request.expiresAt < Date.now()) {
          return { success: false, error: "Kodun süresi doldu, lütfen tekrar isteyin." };
        }
        if (request.code !== code.trim()) {
          return { success: false, error: "Girdiğiniz kod hatalı." };
        }

        const user = get().users.find((u) => u.id === request.userId);
        if (!user) {
          return { success: false, error: "Kullanıcı bulunamadı." };
        }

        const hashed = await hashPassword(newPassword);
        set((state) => ({
          credentials: { ...state.credentials, [user.email]: hashed },
          passwordResetRequest: null,
        }));

        return { success: true };
      },

      changePassword: async (userId, currentPassword, newPassword) => {
        const { users, credentials } = get();
        const user = users.find((u) => u.id === userId);
        if (!user) return { success: false, error: "Kullanıcı bulunamadı." };
        if (credentials[user.email] !== (await hashPassword(currentPassword))) {
          return { success: false, error: "Mevcut şifren hatalı." };
        }

        const hashed = await hashPassword(newPassword);
        set((state) => ({
          credentials: { ...state.credentials, [user.email]: hashed },
        }));
        return { success: true };
      },

      submitJudgeApplication: (
        userId,
        {
          categoryIds,
          workStatus,
          jobTitle,
          department,
          expertiseArea,
          academicProfileUrl,
          cvFileName,
          customExpertiseTags,
          agreementAccepted,
        },
      ) => {
        set((state) => {
          const applicant = state.users.find((u) => u.id === userId);
          const admins = state.users.filter(
            (u) => u.role === "admin" && u.notifyNewJudgeApplication !== false,
          );

          return {
            users: state.users.map((u) =>
              u.id === userId
                ? {
                    ...u,
                    categoryIds,
                    judgeWorkStatus: workStatus,
                    judgeApprovalStatus: "pending",
                    ...(jobTitle !== undefined ? { jobTitle } : {}),
                    ...(department !== undefined ? { department } : {}),
                    ...(expertiseArea !== undefined ? { expertiseArea } : {}),
                    ...(academicProfileUrl !== undefined ? { academicProfileUrl } : {}),
                    ...(cvFileName !== undefined ? { cvFileName } : {}),
                    ...(customExpertiseTags !== undefined ? { customExpertiseTags } : {}),
                    ...(agreementAccepted
                      ? { judgeAgreementAcceptedAt: new Date().toISOString() }
                      : {}),
                  }
                : u,
            ),
            notifications: [
              ...admins.map((admin) =>
                createNotification({
                  userId: admin.id,
                  kind: "new_judge_application",
                  title: "Yeni hakem başvurusu",
                  body: applicant?.name,
                  link: "/admin/judge-applications",
                }),
              ),
              ...state.notifications,
            ],
          };
        });
      },

      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n,
          ),
        }));
      },

      markAllNotificationsRead: (userId) => {
        const now = new Date().toISOString();
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.userId === userId && !n.readAt ? { ...n, readAt: now } : n,
          ),
        }));
      },

      sendSupportMessage: (userId, subject, message) => {
        set((state) => {
          const sender = state.users.find((u) => u.id === userId);
          if (!sender) return state;

          const ticket: SupportMessage = {
            id: `support-${crypto.randomUUID()}`,
            userId,
            userName: sender.name,
            userRole: sender.role,
            subject,
            message,
            createdAt: new Date().toISOString(),
            resolvedAt: null,
          };

          const admins = state.users.filter(
            (u) => u.role === "admin" && u.notifySupportRequest !== false,
          );
          const notifications = admins.map((admin) =>
            createNotification({
              userId: admin.id,
              kind: "support_request",
              title: `Destek talebi: ${sender.name}`,
              body: subject,
              link: "/admin/support",
            }),
          );

          return {
            supportMessages: [ticket, ...state.supportMessages],
            notifications: [...notifications, ...state.notifications],
          };
        });
      },

      resolveSupportMessage: (id) => {
        set((state) => ({
          supportMessages: state.supportMessages.map((m) =>
            m.id === id ? { ...m, resolvedAt: new Date().toISOString() } : m,
          ),
        }));
      },

      sendAnnouncement: ({ audience, userIds, categoryId, title, body }) => {
        const state = get();
        let targets: User[];
        if (audience === "custom") {
          const idSet = new Set(userIds ?? []);
          targets = state.users.filter((u) => idSet.has(u.id));
        } else {
          targets = state.users.filter((u) => {
            if (audience === "contestants" && u.role !== "contestant") return false;
            if (audience === "judges" && u.role !== "judge") return false;
            if (audience === "both" && u.role !== "contestant" && u.role !== "judge") return false;
            if (categoryId && !u.categoryIds.includes(categoryId)) return false;
            return true;
          });
        }

        if (targets.length === 0) return 0;

        const notifications = targets.map((u) =>
          createNotification({
            userId: u.id,
            kind: "announcement",
            title,
            body,
            link: DASHBOARD_PATH_BY_ROLE[u.role],
          }),
        );
        set((s) => ({ notifications: [...notifications, ...s.notifications] }));
        return targets.length;
      },

      demoLogin: (role) => {
        const user = get().users.find((u) => u.role === role);
        if (user) set({ currentUserId: user.id });
      },

      // Gerçek oturumdan çekilmiş rapor/değerlendirme verisi yalnızca
      // currentUserId temizlenirse localStorage'da kalıcı kalır — paylaşılan
      // bir bilgisayarda bir sonraki kullanıcı, taze bir fetch üzerine
      // yazana kadar önceki kullanıcının gerçek verisini görebilir. Bu
      // yüzden çıkışta bu alanlar boşa sıfırlanır (seed/demo verisine
      // DEĞİL — signOut() tamamlanana kadar mevcut sayfa hâlâ mount'lu
      // kalabildiğinden, seed'e sıfırlamak kısa bir an için gerçek
      // kullanıcıya sahte veri gösterilmesine yol açıyordu).
      // categories/scoreCriteria (yarışmanın genel yapılandırması, kişiye
      // özel değil) ve users/credentials (hâlâ yalnızca test kapsamındaki
      // mock login/register akışının iç tutarlılığı için gerekli) kasıtlı
      // olarak dokunulmadan bırakılır.
      logout: () =>
        set({
          currentUserId: null,
          reports: [],
          evaluations: [],
        }),

      setReports: (reports) => set({ reports }),
      setCategories: (categories) => set({ categories }),
      setEvaluations: (evaluations) => set({ evaluations }),
      setScoreCriteria: (criteria) => set({ scoreCriteria: criteria }),
      setUsers: (users) => set({ users }),
      setJudges: (judges) => set({ judges }),

      updateProfile: (userId, updates) => {
        set((state) => ({
          users: state.users.map((u) => (u.id === userId ? { ...u, ...updates } : u)),
        }));
      },

      deleteAccount: (userId) => {
        set((state) => {
          const user = state.users.find((u) => u.id === userId);
          const credentials = { ...state.credentials };
          if (user) delete credentials[user.email];

          return {
            users: state.users.filter((u) => u.id !== userId),
            credentials,
            currentUserId: state.currentUserId === userId ? null : state.currentUserId,
          };
        });
      },

      addReport: (input) => {
        const newReport: Report = {
          id: `report-${crypto.randomUUID()}`,
          title: input.title,
          contestantId: input.contestantId,
          categoryId: input.categoryId,
          contestantName:
            get().users.find((u) => u.id === input.contestantId)?.name ?? "Bilinmeyen",
          fileName: input.fileName,
          fileSizeBytes: input.fileSizeBytes,
          pdfUrl: input.pdfUrl,
          status: "pending_assignment",
          assignedJudgeIds: [],
          submittedAt: new Date().toISOString(),
        };

        set((state) => {
          const admins = state.users.filter(
            (u) => u.role === "admin" && u.notifyNewReportSubmission !== false,
          );
          return {
            reports: [newReport, ...state.reports],
            notifications: [
              ...admins.map((admin) =>
                createNotification({
                  userId: admin.id,
                  kind: "new_report_submission",
                  title: "Yeni rapor gönderildi",
                  body: `${newReport.contestantName} · ${newReport.title}`,
                  link: "/admin/pool",
                }),
              ),
              ...state.notifications,
            ],
          };
        });
        return newReport;
      },

      assignReports: (reportIds, judgeId) => {
        const now = new Date().toISOString();
        set((state) => {
          const judge = state.users.find((u) => u.id === judgeId);
          const shouldNotify = judge && judge.notifyReportAssigned !== false;
          const targets = state.reports.filter(
            (r) => reportIds.includes(r.id) && !r.assignedJudgeIds.includes(judgeId),
          );
          const newNotifications = shouldNotify
            ? targets.map((r) =>
                createNotification({
                  userId: judgeId,
                  kind: "report_assigned",
                  title: "Yeni rapor atandı",
                  body: r.title,
                  link: "/judge",
                }),
              )
            : [];

          const reports = state.reports.map((r) => {
            if (!reportIds.includes(r.id) || r.assignedJudgeIds.includes(judgeId)) return r;
            const updated: Report = {
              ...r,
              assignedJudgeIds: [...r.assignedJudgeIds, judgeId],
              assignedAt: now,
            };
            return { ...updated, status: computeAggregateReportStatus(updated, state.evaluations) };
          });

          return { reports, notifications: [...newNotifications, ...state.notifications] };
        });
      },

      unassignJudge: (reportId, judgeId) => {
        set((state) => ({
          reports: state.reports.map((r) => {
            if (r.id !== reportId || !r.assignedJudgeIds.includes(judgeId)) return r;
            const updated: Report = {
              ...r,
              assignedJudgeIds: r.assignedJudgeIds.filter((id) => id !== judgeId),
            };
            return { ...updated, status: computeAggregateReportStatus(updated, state.evaluations) };
          }),
        }));
      },

      saveEvaluation: (evaluation) => {
        set((state) => {
          const previous = state.evaluations.find((e) => e.id === evaluation.id);
          const isFirstEvaluationForReport = !state.evaluations.some(
            (e) => e.reportId === evaluation.reportId,
          );
          const evaluations = previous
            ? state.evaluations.map((e) => (e.id === evaluation.id ? evaluation : e))
            : [...state.evaluations, evaluation];

          const reports = state.reports.map((r) => {
            if (r.id !== evaluation.reportId) return r;
            const withReviewStamp: Report =
              isFirstEvaluationForReport && !r.reviewStartedAt
                ? { ...r, reviewStartedAt: new Date().toISOString() }
                : r;
            return {
              ...withReviewStamp,
              status: computeAggregateReportStatus(withReviewStamp, evaluations),
            };
          });

          // Yarışmacıya bildirim burada gitmez: hakem bitirdiğinde sonuç henüz görünür
          // değildir (visibleToContestant), admin onaylayana ya da kategori toplu
          // yayınlanana kadar bekler (bkz. approveEvaluation / releaseCategoryResults).
          // Ama yeni bir elenme önerisi doğduysa admin hemen haberdar edilir.
          const isNewDisqualificationFlag =
            !!evaluation.disqualificationRecommendation &&
            !previous?.disqualificationRecommendation;
          const admins = isNewDisqualificationFlag
            ? state.users.filter(
                (u) => u.role === "admin" && u.notifyDisqualificationFlag !== false,
              )
            : [];
          const report = reports.find((r) => r.id === evaluation.reportId);

          return {
            evaluations,
            reports,
            notifications: isNewDisqualificationFlag
              ? [
                  ...admins.map((admin) =>
                    createNotification({
                      userId: admin.id,
                      kind: "disqualification_flag",
                      title: "Elenme önerisi",
                      body: report?.title,
                      link: "/admin/disqualifications",
                    }),
                  ),
                  ...state.notifications,
                ]
              : state.notifications,
          };
        });
      },

      resolveDisqualification: (reportId, decision) => {
        const now = new Date().toISOString();
        set((state) => {
          const evaluations = state.evaluations.map((e) =>
            e.reportId === reportId && e.disqualificationRecommendation
              ? {
                  ...e,
                  disqualificationRecommendation: {
                    ...e.disqualificationRecommendation,
                    adminDecision: decision,
                    adminDecidedAt: now,
                  },
                }
              : e,
          );

          const reports = state.reports.map((r) =>
            r.id === reportId ? { ...r, status: computeAggregateReportStatus(r, evaluations) } : r,
          );

          const report = reports.find((r) => r.id === reportId);
          const contestant = report
            ? state.users.find((u) => u.id === report.contestantId)
            : null;
          const shouldNotify =
            decision === "upheld" &&
            report &&
            contestant &&
            contestant.notifyEvaluationUpdates !== false;

          return {
            evaluations,
            reports,
            notifications: shouldNotify
              ? [
                  createNotification({
                    userId: contestant.id,
                    kind: "report_disqualified",
                    title: "Raporun elendi",
                    body: report.title,
                    link: "/contestant",
                  }),
                  ...state.notifications,
                ]
              : state.notifications,
          };
        });
      },

      approveEvaluation: (evaluationId) => {
        set((state) => {
          const evaluation = state.evaluations.find((e) => e.id === evaluationId);
          if (!evaluation || evaluation.status !== "submitted" || evaluation.visibleToContestant) {
            return state;
          }

          const evaluations = state.evaluations.map((e) =>
            e.id === evaluationId ? { ...e, visibleToContestant: true } : e,
          );

          const report = state.reports.find((r) => r.id === evaluation.reportId);
          const contestant = report
            ? state.users.find((u) => u.id === report.contestantId)
            : null;
          const judge = state.users.find((u) => u.id === evaluation.judgeId);

          const newNotifications: AppNotification[] = [];
          if (report && contestant && contestant.notifyEvaluationUpdates !== false) {
            newNotifications.push(
              createNotification({
                userId: contestant.id,
                kind: "evaluation_completed",
                title: "Raporun değerlendirildi",
                body: `${report.title} · ${evaluation.totalScore} puan`,
                link: "/contestant",
              }),
            );
          }
          if (report && judge && judge.notifyEvaluationApproved !== false) {
            newNotifications.push(
              createNotification({
                userId: judge.id,
                kind: "evaluation_approved",
                title: "Değerlendirmen yayınlandı",
                body: report.title,
                link: "/judge",
              }),
            );
          }

          return {
            evaluations,
            notifications: [...newNotifications, ...state.notifications],
          };
        });
      },

      setCategoryReleaseDate: (categoryId, releaseAt) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId ? { ...c, resultsReleaseAt: releaseAt } : c,
          ),
        }));
      },

      setCategoryEvaluationDeadline: (categoryId, deadline) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId ? { ...c, evaluationDeadline: deadline } : c,
          ),
        }));
      },

      releaseCategoryResults: (categoryId) => {
        set((state) => {
          const reportIdsInCategory = new Set(
            state.reports.filter((r) => r.categoryId === categoryId).map((r) => r.id),
          );

          const toRelease = state.evaluations.filter(
            (e) =>
              reportIdsInCategory.has(e.reportId) &&
              e.status === "submitted" &&
              !e.visibleToContestant,
          );
          if (toRelease.length === 0) return state;

          const evaluations = state.evaluations.map((e) =>
            toRelease.includes(e) ? { ...e, visibleToContestant: true } : e,
          );

          const newNotifications = toRelease.flatMap((e) => {
            const report = state.reports.find((r) => r.id === e.reportId);
            if (!report) return [];
            const contestant = state.users.find((u) => u.id === report.contestantId);
            const judge = state.users.find((u) => u.id === e.judgeId);
            const result: AppNotification[] = [];
            if (contestant && contestant.notifyEvaluationUpdates !== false) {
              result.push(
                createNotification({
                  userId: contestant.id,
                  kind: "evaluation_completed",
                  title: "Raporun değerlendirildi",
                  body: `${report.title} · ${e.totalScore} puan`,
                  link: "/contestant",
                }),
              );
            }
            if (judge && judge.notifyEvaluationApproved !== false) {
              result.push(
                createNotification({
                  userId: judge.id,
                  kind: "evaluation_approved",
                  title: "Değerlendirmen yayınlandı",
                  body: report.title,
                  link: "/judge",
                }),
              );
            }
            return result;
          });

          return {
            evaluations,
            categories: state.categories.map((c) =>
              c.id === categoryId ? { ...c, resultsReleasedAt: new Date().toISOString() } : c,
            ),
            notifications: [...newNotifications, ...state.notifications],
          };
        });
      },

      /** Planlanan yayın tarihi geçmiş kategorileri bulup sonuçlarını yayınlar; bir
       * ResultsReleaseWatcher tarafından periyodik olarak çağrılır. */
      checkScheduledReleases: () => {
        const now = Date.now();
        const due = get().categories.filter(
          (c) => c.resultsReleaseAt && new Date(c.resultsReleaseAt).getTime() <= now,
        );
        due.forEach((c) => get().releaseCategoryResults(c.id));
      },

      addCategory: ({ name, description }) => {
        const newCategory: Category = {
          id: `cat-${crypto.randomUUID()}`,
          name,
          slug: slugify(name),
          description,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ categories: [...state.categories, newCategory] }));
        return newCategory;
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));
      },

      setCategorySpecification: (id, doc) => {
        set((state) => ({
          categories: state.categories.map((c) => {
            if (c.id !== id) return c;
            const window = generateMockSubmissionWindow();
            return {
              ...c,
              specification: doc,
              criteria: generateMockCriteriaFromSpecification(c),
              submissionOpensAt: window.opensAt,
              submissionClosesAt: window.closesAt,
            };
          }),
        }));
      },

      setCategoryTemplate: (id, doc) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, reportTemplate: doc } : c,
          ),
        }));
      },

      regenerateCategoryCriteria: (categoryId) => {
        const category = get().categories.find((c) => c.id === categoryId);
        if (!category) return [];
        const criteria = generateMockCriteriaFromSpecification(category);
        set((state) => ({
          categories: state.categories.map((c) => (c.id === categoryId ? { ...c, criteria } : c)),
        }));
        return criteria;
      },

      addCategoryCriterion: (categoryId, { label, maxScore, description }) => {
        const newCriterion: ScoreCriterion = {
          id: `crit-${categoryId}-${crypto.randomUUID()}`,
          label,
          maxScore,
          description,
        };
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId ? { ...c, criteria: [...(c.criteria ?? []), newCriterion] } : c,
          ),
        }));
        return newCriterion;
      },

      updateCategoryCriterion: (categoryId, criterionId, updates) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  criteria: (c.criteria ?? []).map((cr) =>
                    cr.id === criterionId ? { ...cr, ...updates } : cr,
                  ),
                }
              : c,
          ),
        }));
      },

      deleteCategoryCriterion: (categoryId, criterionId) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId
              ? { ...c, criteria: (c.criteria ?? []).filter((cr) => cr.id !== criterionId) }
              : c,
          ),
        }));
      },

      setCategorySubmissionWindow: (categoryId, opensAt, closesAt) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId
              ? { ...c, submissionOpensAt: opensAt, submissionClosesAt: closesAt }
              : c,
          ),
        }));
      },

      addScoreCriterion: ({ label, maxScore, description }) => {
        const newCriterion: ScoreCriterion = {
          id: `crit-${crypto.randomUUID()}`,
          label,
          maxScore,
          description,
        };
        set((state) => ({ scoreCriteria: [...state.scoreCriteria, newCriterion] }));
        return newCriterion;
      },

      updateScoreCriterion: (id, updates) => {
        set((state) => ({
          scoreCriteria: state.scoreCriteria.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));
      },

      deleteScoreCriterion: (id) => {
        set((state) => ({
          scoreCriteria: state.scoreCriteria.filter((c) => c.id !== id),
        }));
      },

      addFaqEntry: ({ role, question, answer }) => {
        const newFaq: FaqEntry = { id: `faq-${crypto.randomUUID()}`, role, question, answer };
        set((state) => ({ faqs: [...state.faqs, newFaq] }));
        return newFaq;
      },

      updateFaqEntry: (id, updates) => {
        set((state) => ({
          faqs: state.faqs.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        }));
      },

      deleteFaqEntry: (id) => {
        set((state) => ({
          faqs: state.faqs.filter((f) => f.id !== id),
        }));
      },
    }),
    {
      name: "ludex-storage",
      /** Tarayıcı dışında (SSR, testler) sessizce hiçbir şey yapmayan bir depoya düşer; gerçek kalıcılık yalnızca istemcide gerçekleşir. */
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
      version: 3,
      /**
       * v0 -> v1: Report.assignedJudgeId (tekil) -> assignedJudgeIds (dizi), ve
       * credentials'taki düz metin şifreler SHA-256 hash'ine taşınır.
       * v1 -> v2: Sonuçlar artık admin onayı/yayınıyla görünür olur
       * (JudgeEvaluation.visibleToContestant); bu alan eklenmeden önce zaten
       * "submitted" olan değerlendirmeler eskiden anında görünür olduğundan,
       * geriye dönük olarak görünür sayılır — aksi halde bir kullanıcının daha
       * önce gördüğü bir sonuç bu güncellemeyle aniden gizlenmiş olurdu.
       * v2 -> v3: E-posta doğrulaması zorunlu hale geldi (User.emailVerifiedAt);
       * bu alan eklenmeden önce kayıt olmuş kullanıcılar geriye dönük olarak
       * doğrulanmış sayılır — aksi halde mevcut hesaplar aniden giriş yapamaz olurdu.
       */
      migrate: async (persistedState) => {
        const state = persistedState as {
          reports?: Array<Record<string, unknown>>;
          credentials?: Record<string, string>;
          evaluations?: Array<Record<string, unknown>>;
          users?: Array<Record<string, unknown>>;
        };

        if (Array.isArray(state.users)) {
          state.users = state.users.map((u) =>
            u.emailVerifiedAt === undefined ? { ...u, emailVerifiedAt: u.createdAt } : u,
          );
        }

        if (Array.isArray(state.reports)) {
          state.reports = state.reports.map((r) => {
            if (Array.isArray(r.assignedJudgeIds)) return r;
            const legacyId = r.assignedJudgeId as string | undefined;
            const rest = { ...r };
            delete rest.assignedJudgeId;
            return { ...rest, assignedJudgeIds: legacyId ? [legacyId] : [] };
          });
        }

        if (state.credentials) {
          const entries = await Promise.all(
            Object.entries(state.credentials).map(async ([email, value]) => {
              const looksHashed = /^[0-9a-f]{64}$/.test(value);
              return [email, looksHashed ? value : await hashPassword(value)] as const;
            }),
          );
          state.credentials = Object.fromEntries(entries);
        }

        if (Array.isArray(state.evaluations)) {
          state.evaluations = state.evaluations.map((e) =>
            e.status === "submitted" && e.visibleToContestant === undefined
              ? { ...e, visibleToContestant: true }
              : e,
          );
        }

        return state;
      },
    },
  ),
);

/** Bir kategorinin kendi kriterleri varsa onları, yoksa global varsayılan kriterleri döner. */
export function getEffectiveCriteria(
  category: Pick<Category, "criteria"> | null | undefined,
  globalCriteria: ScoreCriterion[],
): ScoreCriterion[] {
  return category?.criteria && category.criteria.length > 0 ? category.criteria : globalCriteria;
}

/**
 * Önce demoLogin ile ayarlanmış mock kullanıcıyı kontrol eder (geriye dönük
 * uyumluluk için); yoksa gerçek NextAuth oturumundan minimal bir User nesnesi
 * türetir. Gerçek oturumda yalnızca id/name/email/role bulunur — telefon,
 * adres, hakem onay durumu gibi genişletilmiş profil alanları henüz backend'de
 * yok (bilinen takip maddesi, bkz. proje notları); bu alanlar gerçek oturumlu
 * kullanıcılar için boş/varsayılan döner.
 */
export const useCurrentUser = (): User | null => {
  const mockUser = useAppStore((state) =>
    state.users.find((u) => u.id === state.currentUserId) ?? null,
  );
  const { data: session } = useSession();

  if (mockUser) return mockUser;
  if (session?.user) {
    return {
      id: session.user.id,
      name: session.user.name ?? "",
      email: session.user.email ?? "",
      phone: "",
      role: session.user.role,
      categoryIds: session.user.categoryIds,
      judgeApprovalStatus: session.user.judgeApprovalStatus,
      createdAt: "",
    };
  }
  return null;
};

/**
 * localStorage'dan rehydrate tamamlanana kadar false döner; SSR/CSR uyumsuzluğunu önler.
 * Başlangıç değeri her zaman false olmalı (render sırasında hasHydrated() çağırmak,
 * istemcide localStorage senkron döndüğü için sunucudan farklı bir ilk render'a
 * (hydration mismatch) yol açabilir); gerçek durum yalnızca effect içinde okunur.
 */
export const useHasHydrated = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAppStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  return hydrated;
};
