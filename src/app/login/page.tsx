"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Gavel,
  Loader2,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import { ForgotPasswordDialog } from "@/components/auth/forgot-password-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCurrentUser, useHasHydrated } from "@/store/useAppStore";
import {
  login,
  register,
  verifyEmail,
  resendEmailVerification,
} from "@/services/auth.service";
import type { UserRole } from "@/types";

const DASHBOARD_PATH: Record<UserRole, string> = {
  admin: "/admin",
  judge: "/judge",
  contestant: "/contestant",
};

/**
 * Demo butonları gerçek seed hesaplarıyla gerçek NextAuth girişini tetikler
 * (bkz. src/lib/repositories/user-repository.ts) — mock/sahte bir oturum
 * DEĞİLDİR, bu yüzden giriş sonrası tüm gerçek API çağrıları normal şekilde çalışır.
 */
const DEMO_CREDENTIALS: Record<UserRole, string> = {
  admin: "admin@ludex.com",
  judge: "elif.yilmaz@ludex.com",
  contestant: "mehmet.ozturk@example.com",
};
const DEMO_PASSWORD = "demo1234";

const SPRING = { type: "spring" as const, stiffness: 400, damping: 30 };

const PILL_INPUT_CLASS = "h-auto rounded-full px-4 py-2.5 focus-visible:ring-0";

const DEMO_ROLES: { role: UserRole; label: string; icon: LucideIcon }[] = [
  { role: "judge", label: "Hakem", icon: Gavel },
  { role: "contestant", label: "Yarışmacı", icon: Sparkles },
  { role: "admin", label: "Admin", icon: ShieldCheck },
];

function GoogleGIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.344 4.337-17.694 10.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.193 5.237C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const { status: sessionStatus } = useSession();
  const currentUser = useCurrentUser();
  const ready = hydrated && sessionStatus !== "loading";

  useEffect(() => {
    if (ready && currentUser) {
      router.replace(DASHBOARD_PATH[currentUser.role]);
    }
  }, [ready, currentUser, router]);

  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "register") {
      setAuthTab("register");
    }
  }, []);
  const authTabsMeasureRef = useRef<HTMLDivElement>(null);
  const [authTabsHeight, setAuthTabsHeight] = useState<number>();

  useEffect(() => {
    const el = authTabsMeasureRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h) setAuthTabsHeight(h);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"contestant" | "judge">("contestant");
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [demoLoggingIn, setDemoLoggingIn] = useState<UserRole | null>(null);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const result = await login(loginEmail, loginPassword);
    if (!result.success) {
      setLoginError(result.error ?? "Giriş başarısız.");
      if (result.requiresVerification) {
        if (result.code) toast.info(`Demo doğrulama kodu: ${result.code}`);
        setAwaitingVerification(true);
      }
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setRegisterError(null);

    const result = await register({ name, email, phone, password, role });
    if (!result.success) {
      setRegisterError(result.error ?? "Kayıt başarısız.");
      return;
    }
    // Gerçek kayıt e-posta doğrulaması istemez ve otomatik oturum açar — bu
    // ekran yalnızca (mock'tan kalma) result.code/requiresVerification varsa gösterilir.
    if (result.code) {
      toast.info(`Demo doğrulama kodu: ${result.code}`, {
        description: "Gerçek sistemde bu kod e-postana gönderilir.",
      });
    }
    if (result.code || result.requiresVerification) {
      setAwaitingVerification(true);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setVerifyError(null);
    setVerifySubmitting(true);
    const result = await verifyEmail(verifyCode);
    setVerifySubmitting(false);
    if (!result.success) {
      setVerifyError(result.error ?? "Doğrulama başarısız.");
      return;
    }
  }

  async function handleResendVerification() {
    setResending(true);
    const result = await resendEmailVerification();
    setResending(false);
    if (result.success && result.code) {
      toast.info(`Demo doğrulama kodu: ${result.code}`);
    } else if (!result.success) {
      toast.error(result.error ?? "Kod tekrar gönderilemedi.");
    }
  }

  async function handleDemoLogin(demoRole: UserRole) {
    setDemoLoggingIn(demoRole);
    const result = await login(DEMO_CREDENTIALS[demoRole], DEMO_PASSWORD);
    setDemoLoggingIn(null);
    if (!result.success) {
      toast.error(result.error ?? "Demo giriş başarısız.");
    }
  }

  if (!ready || currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen items-start justify-center bg-background px-4 pt-16 pb-6 md:pt-20">
      <div className="absolute top-4 left-4 flex w-[calc(100%-2rem)] items-center justify-between md:top-6 md:left-6 md:w-[calc(100%-3rem)]">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Ana sayfa
          </Link>
        </Button>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-4">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Ludex&apos;e Giriş Yap</h1>
          <p className="mx-auto max-w-sm text-sm font-normal text-muted-foreground">
            Yarışma raporu değerlendirme ve karar destek platformu
          </p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-xl backdrop-blur-sm">
          {awaitingVerification ? (
            <div className="space-y-3">
              <div className="space-y-1 text-center">
                <p className="text-base font-semibold">E-postanı Doğrula</p>
                <p className="text-sm text-muted-foreground">
                  E-posta adresine gönderilen 6 haneli doğrulama kodunu gir. Bu adım yalnızca
                  doğrulama gerektiren kayıt akışlarında gösterilir.
                </p>
              </div>
              <form onSubmit={handleVerify} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="verify-code">Doğrulama Kodu</Label>
                  <Input
                    id="verify-code"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="123456"
                    className={PILL_INPUT_CLASS}
                  />
                </div>

                {verifyError && (
                  <Alert variant="destructive">
                    <AlertDescription>{verifyError}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={verifySubmitting}
                  className="w-full gap-1.5 py-2.5 transition-transform active:scale-[0.98]"
                >
                  {verifySubmitting && <Loader2 className="size-4 animate-spin" />}
                  {verifySubmitting ? "Doğrulanıyor..." : "Doğrula ve Devam Et"}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    onClick={() => setAwaitingVerification(false)}
                  >
                    Geri dön
                  </button>
                  <button
                    type="button"
                    disabled={resending}
                    className="font-medium text-primary underline-offset-4 hover:underline disabled:opacity-60"
                    onClick={handleResendVerification}
                  >
                    {resending ? "Gönderiliyor..." : "Kodu tekrar gönder"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled
                title="Google OAuth bu ortamda bağlı değil"
                className="flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black opacity-60"
              >
                <GoogleGIcon className="size-5" />
                Google ile devam et
                <span className="text-xs font-medium text-zinc-500">(yakında)</span>
              </button>

              <div className="my-3 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs tracking-widest text-muted-foreground uppercase">
                  veya e-posta ile
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as "login" | "register")}>
                <div className="relative mx-auto flex w-full max-w-sm items-center overflow-hidden rounded-full border border-border/60 bg-muted p-1 dark:border-white/10 dark:bg-[#141416]">
                  {(["login", "register"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setAuthTab(tab)}
                      className={`relative z-10 box-border flex h-9 flex-1 cursor-pointer items-center justify-center rounded-full border border-transparent text-sm font-medium transition-all duration-200 ${
                        authTab === tab
                          ? "text-foreground dark:text-white"
                          : "text-muted-foreground hover:text-foreground dark:text-zinc-400 dark:hover:text-white"
                      }`}
                    >
                      {authTab === tab && (
                        <motion.span
                          layoutId="auth-tab-pill"
                          transition={SPRING}
                          className="absolute inset-0 -z-10 rounded-full border border-border/60 bg-background shadow-sm dark:border-white/15 dark:bg-white/10"
                        />
                      )}
                      <span className="relative z-10">{tab === "login" ? "Giriş Yap" : "Kayıt Ol"}</span>
                    </button>
                  ))}
                </div>

                <div
                  className="overflow-hidden transition-[height] duration-200 ease-in-out"
                  style={{ height: authTabsHeight }}
                >
                  <div ref={authTabsMeasureRef}>
                    <TabsContent
                      value="login"
                      forceMount
                      className="mt-3 data-[state=inactive]:hidden"
                    >
                      <form onSubmit={handleLogin} className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="login-email">E-posta</Label>
                          <Input
                            id="login-email"
                            type="email"
                            required
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="admin@ludex.com"
                            className={PILL_INPUT_CLASS}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="login-password">Şifre</Label>
                            <ForgotPasswordDialog />
                          </div>
                          <Input
                            id="login-password"
                            type="password"
                            required
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            className={PILL_INPUT_CLASS}
                          />
                        </div>

                        {loginError && (
                          <Alert variant="destructive">
                            <AlertDescription>{loginError}</AlertDescription>
                          </Alert>
                        )}

                        <Button
                          type="submit"
                          className="mt-2 w-full py-2.5 transition-transform active:scale-[0.98]"
                        >
                          Giriş Yap
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent
                      value="register"
                      forceMount
                      className="mt-3 data-[state=inactive]:hidden"
                    >
                      <form onSubmit={handleRegister} className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="register-name">Ad Soyad</Label>
                          <Input
                            id="register-name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Adınız Soyadınız"
                            className={PILL_INPUT_CLASS}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="register-email">E-posta</Label>
                          <Input
                            id="register-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ornek@mail.com"
                            className={PILL_INPUT_CLASS}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="register-phone">Telefon No</Label>
                          <Input
                            id="register-phone"
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+90 5xx xxx xx xx"
                            className={PILL_INPUT_CLASS}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="register-password">Şifre</Label>
                          <Input
                            id="register-password"
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="En az 6 karakter"
                            className={PILL_INPUT_CLASS}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Rolünüz</Label>
                          <RadioGroup
                            value={role}
                            onValueChange={(v) => setRole(v as "contestant" | "judge")}
                            className="grid grid-cols-2 gap-3"
                          >
                            <Label
                              htmlFor="role-contestant"
                              className={`flex cursor-pointer items-center gap-2 rounded-2xl border p-2.5 text-sm transition-colors ${
                                role === "contestant"
                                  ? "border-primary bg-primary/5"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              <RadioGroupItem value="contestant" id="role-contestant" />
                              <FileText className="size-4" />
                              Yarışmacı Girişi
                            </Label>
                            <Label
                              htmlFor="role-judge"
                              className={`flex cursor-pointer items-center gap-2 rounded-2xl border p-2.5 text-sm transition-colors ${
                                role === "judge"
                                  ? "border-primary bg-primary/5"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              <RadioGroupItem value="judge" id="role-judge" />
                              <Gavel className="size-4" />
                              Hakem Girişi
                            </Label>
                          </RadioGroup>
                        </div>

                        {registerError && (
                          <Alert variant="destructive">
                            <AlertDescription>{registerError}</AlertDescription>
                          </Alert>
                        )}

                        <Button
                          type="submit"
                          className="w-full py-2.5 transition-transform active:scale-[0.98]"
                        >
                          Kayıt Ol
                        </Button>
                      </form>
                    </TabsContent>
                  </div>
                </div>
              </Tabs>

              <div className="mt-3">
                <p className="mb-1.5 text-center text-xs tracking-widest text-muted-foreground uppercase">
                  Demo ile hızlı gir
                </p>
                <div className="flex w-full rounded-full border border-border/60 bg-muted p-1">
                  {DEMO_ROLES.map(({ role: demoRole, label, icon: Icon }) => (
                    <button
                      key={demoRole}
                      type="button"
                      disabled={demoLoggingIn !== null}
                      onClick={() => handleDemoLogin(demoRole)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60"
                    >
                      {demoLoggingIn === demoRole ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Icon className="size-3.5" />
                      )}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Demo şifre tüm hesaplar için: <code className="font-mono">demo1234</code>
              </p>
            </>
          )}
        </div>

        {!awaitingVerification && (
          <p className="text-center text-xs text-muted-foreground">
            Kayıt olarak{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
              Kullanım Şartları
            </Link>
            &apos;nı ve{" "}
            <Link href="/kvkk" className="underline underline-offset-2 hover:text-foreground">
              KVKK Aydınlatma Metni
            </Link>
            &apos;ni kabul etmiş olursunuz.
          </p>
        )}
      </div>
    </main>
  );
}
