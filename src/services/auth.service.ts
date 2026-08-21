import { signIn, signOut } from "next-auth/react";
import { useAppStore, type AppState } from "@/store/useAppStore";
import type { UserRole } from "@/types";

interface AuthActionResult {
  success: boolean;
  error?: string;
  // Gerçek backend'de e-posta doğrulaması henüz yok; bu alanlar login sayfasındaki
  // (şu an kullanılmayan) doğrulama akışıyla tip uyumluluğu için duruyor, hiçbir
  // zaman dolu dönmez.
  requiresVerification?: boolean;
  code?: string;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  const result = await signIn("credentials", { email, password, redirect: false });
  if (result?.error) {
    return { success: false, error: "E-posta veya şifre hatalı." };
  }
  return { success: true };
}

export async function register(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Extract<UserRole, "contestant" | "judge">;
}): Promise<AuthActionResult> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await response.json();
  if (!response.ok) {
    return { success: false, error: data.error ?? "Kayıt başarısız oldu." };
  }

  // Kayıt sonrası otomatik giriş yapılır — register endpoint'i oturum açmıyor.
  const signInResult = await signIn("credentials", {
    email: input.email,
    password: input.password,
    redirect: false,
  });
  if (signInResult?.error) {
    return { success: false, error: "Kayıt oluştu ancak otomatik giriş başarısız oldu." };
  }
  return { success: true };
}

/**
 * E-posta doğrulaması gerçek backend'de henüz yok (bilinen takip maddesi).
 * Bu iki fonksiyon yalnızca mock store'daki (artık login/register'dan
 * tetiklenmeyen, ölü) doğrulama ekranıyla tip uyumluluğu için duruyor.
 */
export function verifyEmail(code: string): Promise<ReturnType<AppState["verifyEmail"]>> {
  return Promise.resolve(useAppStore.getState().verifyEmail(code));
}

export function resendEmailVerification(): Promise<
  ReturnType<AppState["resendEmailVerification"]>
> {
  return Promise.resolve(useAppStore.getState().resendEmailVerification());
}

/**
 * Demo/kısayol girişi — kimlik bilgisi doğrulaması yapmaz, yalnızca mock store
 * üzerinde çalışır. Gerçek backend'de güvenli bir karşılığı olmadığı için
 * bilerek gerçek oturuma bağlanmadı (bkz. ekip kararı).
 */
export function demoLogin(role: UserRole): Promise<void> {
  useAppStore.getState().demoLogin(role);
  return Promise.resolve();
}

export async function logout(): Promise<void> {
  // Hem gerçek NextAuth oturumunu hem de (varsa) demoLogin'den kalan mock
  // durumunu temizler — hangi yoldan giriş yapılmış olursa olsun çıkış tam olsun diye.
  useAppStore.getState().logout();
  await signOut({ redirect: false });
}

export function requestPasswordReset(
  channel: "email" | "phone",
  identifier: string,
): Promise<ReturnType<AppState["requestPasswordReset"]>> {
  return Promise.resolve(useAppStore.getState().requestPasswordReset(channel, identifier));
}

export async function resetPassword(
  code: string,
  newPassword: string,
): Promise<Awaited<ReturnType<AppState["resetPassword"]>>> {
  return Promise.resolve(useAppStore.getState().resetPassword(code, newPassword));
}
