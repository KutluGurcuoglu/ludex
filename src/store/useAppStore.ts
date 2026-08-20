import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Category,
  JudgeEvaluation,
  Report,
  ReportStatus,
  User,
  UserRole,
} from "@/types";

const CATEGORIES: Category[] = [
  { id: "cat-yz", name: "Yapay Zeka", slug: "yapay-zeka" },
  { id: "cat-insansiz", name: "İnsansız Sistemler", slug: "insansiz-sistemler" },
  { id: "cat-siber", name: "Siber Güvenlik", slug: "siber-guvenlik" },
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
  },
  {
    id: "judge-2",
    name: "Kaan Demir",
    email: "kaan.demir@ludex.com",
    phone: "+90 533 222 33 44",
    role: "judge",
    categoryIds: ["cat-insansiz"],
    createdAt: "2026-06-02T09:30:00.000Z",
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

/** Demo amaçlı; gerçek bir backend'de asla düz metin şifre saklanmaz. */
const SEED_CREDENTIALS: Record<string, string> = {
  "admin@ludex.com": "demo1234",
  "elif.yilmaz@ludex.com": "demo1234",
  "kaan.demir@ludex.com": "demo1234",
  "mehmet.ozturk@example.com": "demo1234",
  "zeynep.kaya@example.com": "demo1234",
  "ali.vural@example.com": "demo1234",
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

interface PasswordResetRequest {
  userId: string;
  code: string;
  channel: "email" | "phone";
  destination: string;
  expiresAt: number;
}

interface AppState {
  categories: Category[];
  users: User[];
  credentials: Record<string, string>;
  reports: Report[];
  evaluations: JudgeEvaluation[];
  currentUserId: string | null;
  passwordResetRequest: PasswordResetRequest | null;

  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (input: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: Extract<UserRole, "contestant" | "judge">;
  }) => { success: boolean; error?: string };
  demoLogin: (role: UserRole) => void;
  logout: () => void;

  requestPasswordReset: (
    channel: "email" | "phone",
    identifier: string,
  ) => { success: boolean; error?: string; code?: string };
  resetPassword: (code: string, newPassword: string) => { success: boolean; error?: string };

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
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      categories: CATEGORIES,
      users: SEED_USERS,
      credentials: SEED_CREDENTIALS,
      reports: SEED_REPORTS,
      evaluations: [],
      currentUserId: null,
      passwordResetRequest: null,

      login: (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const { users, credentials } = get();
        const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

        if (!user || credentials[user.email] !== password) {
          return { success: false, error: "E-posta veya şifre hatalı." };
        }

        set({ currentUserId: user.id });
        return { success: true };
      },

      register: ({ name, email, phone, password, role }) => {
        const normalizedEmail = email.trim().toLowerCase();
        const { users } = get();

        if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
          return { success: false, error: "Bu e-posta ile zaten bir hesap var." };
        }

        const newUser: User = {
          id: `${role}-${Date.now()}`,
          name,
          email,
          phone,
          role,
          categoryIds: [],
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          users: [...state.users, newUser],
          credentials: { ...state.credentials, [email]: password },
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

      resetPassword: (code, newPassword) => {
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

        set((state) => ({
          credentials: { ...state.credentials, [user.email]: newPassword },
          passwordResetRequest: null,
        }));

        return { success: true };
      },

      demoLogin: (role) => {
        const user = get().users.find((u) => u.role === role);
        if (user) set({ currentUserId: user.id });
      },

      logout: () => set({ currentUserId: null }),

      addReport: (input) => {
        const newReport: Report = {
          id: `report-${Date.now()}`,
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
          reports: state.reports.map((r) => (r.id === reportId ? { ...r, status } : r)),
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
    }),
    {
      name: "ludex-storage",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : (undefined as unknown as Storage),
      ),
    },
  ),
);

export const useCurrentUser = () =>
  useAppStore((state) => state.users.find((u) => u.id === state.currentUserId) ?? null);

/** localStorage'dan rehydrate tamamlanana kadar false döner; SSR/CSR uyumsuzluğunu önler. */
export const useHasHydrated = () => {
  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAppStore.persist.hasHydrated());
    return unsub;
  }, []);

  return hydrated;
};
