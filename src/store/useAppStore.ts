import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { hashPassword } from "@/lib/hash";
import type {
  Category,
  CompetitionDocument,
  JudgeApprovalStatus,
  JudgeEvaluation,
  JudgeWorkStatus,
  Report,
  ReportStatus,
  ScoreCriterion,
  User,
  UserRole,
} from "@/types";

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
    assignedJudgeId: "judge-1",
    assignedAt: "2026-08-10T10:00:00.000Z",
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
    assignedJudgeId: "judge-2",
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
    assignedJudgeId: "judge-1",
    assignedAt: "2026-08-01T10:00:00.000Z",
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

export interface AppState {
  categories: Category[];
  scoreCriteria: ScoreCriterion[];
  users: User[];
  credentials: Record<string, string>;
  reports: Report[];
  evaluations: JudgeEvaluation[];
  currentUserId: string | null;
  passwordResetRequest: PasswordResetRequest | null;

  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (input: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: Extract<UserRole, "contestant" | "judge">;
  }) => Promise<{ success: boolean; error?: string }>;
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
  reviewJudgeApplication: (
    userId: string,
    decision: Exclude<JudgeApprovalStatus, "pending">,
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
  setReportStatus: (reportId: string, status: ReportStatus) => void;
  saveEvaluation: (evaluation: JudgeEvaluation) => void;
  resolveDisqualification: (reportId: string, decision: "upheld" | "dismissed") => void;

  addCategory: (input: { name: string; description?: string }) => Category;
  updateCategory: (id: string, updates: Partial<Pick<Category, "name" | "description">>) => void;
  setCategorySpecification: (id: string, doc: CompetitionDocument) => void;
  setCategoryTemplate: (id: string, doc: CompetitionDocument) => void;

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
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      categories: CATEGORIES,
      scoreCriteria: SCORE_CRITERIA,
      users: SEED_USERS,
      credentials: SEED_CREDENTIALS,
      reports: SEED_REPORTS,
      evaluations: SEED_EVALUATIONS,
      currentUserId: null,
      passwordResetRequest: null,

      login: async (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const { users, credentials } = get();
        const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);
        const hashed = await hashPassword(password);

        if (!user || credentials[user.email] !== hashed) {
          return { success: false, error: "E-posta veya şifre hatalı." };
        }

        set({ currentUserId: user.id });
        return { success: true };
      },

      register: async ({ name, email, phone, password, role }) => {
        const normalizedEmail = email.trim().toLowerCase();
        const { users } = get();

        if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
          return { success: false, error: "Bu e-posta ile zaten bir hesap var." };
        }

        const newUser: User = {
          id: `${role}-${crypto.randomUUID()}`,
          name,
          email,
          phone,
          role,
          categoryIds: [],
          createdAt: new Date().toISOString(),
          ...(role === "judge" ? { judgeApprovalStatus: "pending" as const } : {}),
        };
        const hashed = await hashPassword(password);

        set((state) => ({
          users: [...state.users, newUser],
          credentials: { ...state.credentials, [email]: hashed },
          currentUserId: newUser.id,
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
        set((state) => ({
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
        }));
      },

      reviewJudgeApplication: (userId, decision) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId ? { ...u, judgeApprovalStatus: decision } : u,
          ),
        }));
      },

      demoLogin: (role) => {
        const user = get().users.find((u) => u.role === role);
        if (user) set({ currentUserId: user.id });
      },

      logout: () => set({ currentUserId: null }),

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
          submittedAt: new Date().toISOString(),
        };

        set((state) => ({ reports: [newReport, ...state.reports] }));
        return newReport;
      },

      assignReports: (reportIds, judgeId) => {
        const now = new Date().toISOString();
        set((state) => ({
          reports: state.reports.map((r) =>
            reportIds.includes(r.id)
              ? { ...r, assignedJudgeId: judgeId, status: "assigned", assignedAt: now }
              : r,
          ),
        }));
      },

      setReportStatus: (reportId, status) => {
        set((state) => ({
          reports: state.reports.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status,
                  ...(status === "in_review" && !r.reviewStartedAt
                    ? { reviewStartedAt: new Date().toISOString() }
                    : {}),
                }
              : r,
          ),
        }));
      },

      saveEvaluation: (evaluation) => {
        set((state) => {
          const exists = state.evaluations.some((e) => e.id === evaluation.id);
          const evaluations = exists
            ? state.evaluations.map((e) => (e.id === evaluation.id ? evaluation : e))
            : [...state.evaluations, evaluation];

          const reports =
            evaluation.status === "submitted"
              ? state.reports.map((r) =>
                  r.id === evaluation.reportId ? { ...r, status: "completed" as const } : r,
                )
              : state.reports;

          return { evaluations, reports };
        });
      },

      resolveDisqualification: (reportId, decision) => {
        const now = new Date().toISOString();
        set((state) => ({
          evaluations: state.evaluations.map((e) =>
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
          ),
          reports: state.reports.map((r) =>
            r.id === reportId && decision === "upheld"
              ? { ...r, status: "disqualified" as const }
              : r,
          ),
        }));
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
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, specification: doc } : c,
          ),
        }));
      },

      setCategoryTemplate: (id, doc) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, reportTemplate: doc } : c,
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
    },
  ),
);

export const useCurrentUser = () =>
  useAppStore((state) => state.users.find((u) => u.id === state.currentUserId) ?? null);

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
