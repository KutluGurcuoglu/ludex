"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, FileText, Gavel, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import { ForgotPasswordDialog } from "@/components/auth/forgot-password-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { AmbientGlow } from "@/components/landing/ambient-glow";
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-background to-muted/40 px-4 py-12">
      <AmbientGlow className="-z-10" />

      <div className="absolute top-4 left-4 right-4 flex items-center justify-between md:top-6 md:left-6 md:right-6">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Ana sayfa
          </Link>
        </Button>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[var(--brand-glow-2)] text-primary-foreground shadow-lg shadow-primary/30">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-brand-gradient text-3xl font-extrabold tracking-[-0.02em]">Ludex</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            AI destekli akıllı yarışma rapor değerlendirme platformu
          </p>
        </div>

        <Card className="border-border/60 bg-card/80 shadow-xl backdrop-blur-sm">
          <CardContent className="pt-6">
            {awaitingVerification ? (
              <div className="space-y-4">
                <div className="space-y-1.5 text-center">
                  <p className="text-lg font-semibold">E-postanı Doğrula</p>
                  <p className="text-sm text-muted-foreground">
                    E-posta adresine gönderilen 6 haneli doğrulama kodunu gir. Bu adım tüm yeni
                    kayıtlar için zorunludur.
                  </p>
                </div>
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verify-code">Doğrulama Kodu</Label>
                    <Input
                      id="verify-code"
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value)}
                      placeholder="123456"
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
                    className="w-full gap-1.5 transition-transform active:scale-[0.98]"
                  >
                    {verifySubmitting && <Loader2 className="size-4 animate-spin" />}
                    {verifySubmitting ? "Doğrulanıyor..." : "Doğrula ve Devam Et"}
                  </Button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      className="text-muted-foreground underline-offset-4 hover:underline"
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
                <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Giriş Yap</TabsTrigger>
                <TabsTrigger value="register">Kayıt Ol</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-posta</Label>
                    <Input
                      id="login-email"
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="admin@ludex.com"
                    />
                  </div>
                  <div className="space-y-2">
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
                    />
                  </div>

                  {loginError && (
                    <Alert variant="destructive">
                      <AlertDescription>{loginError}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full transition-transform active:scale-[0.98]">
                    Giriş Yap
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Demo şifre tüm hesaplar için: <code className="font-mono">demo1234</code>
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Ad Soyad</Label>
                    <Input
                      id="register-name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Adınız Soyadınız"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">E-posta</Label>
                    <Input
                      id="register-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@mail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-phone">Telefon No</Label>
                    <Input
                      id="register-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+90 5xx xxx xx xx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Şifre</Label>
                    <Input
                      id="register-password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="En az 6 karakter"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Rolünüz</Label>
                    <RadioGroup
                      value={role}
                      onValueChange={(v) => setRole(v as "contestant" | "judge")}
                      className="grid grid-cols-2 gap-3"
                    >
                      <Label
                        htmlFor="role-contestant"
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                          role === "contestant" ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <RadioGroupItem value="contestant" id="role-contestant" />
                        <FileText className="size-4" />
                        Yarışmacı Girişi
                      </Label>
                      <Label
                        htmlFor="role-judge"
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                          role === "judge" ? "border-primary bg-primary/5" : "border-border"
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

                  <Button type="submit" className="w-full transition-transform active:scale-[0.98]">
                    Kayıt Ol
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6">
              <div className="relative flex items-center">
                <Separator className="flex-1" />
                <span className="mx-3 shrink-0 text-xs text-muted-foreground">
                  veya demo ile hızlı gir
                </span>
                <Separator className="flex-1" />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-1.5 py-3 transition-transform active:scale-[0.97]"
                  disabled={demoLoggingIn !== null}
                  onClick={() => handleDemoLogin("admin")}
                >
                  {demoLoggingIn === "admin" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                  <span className="text-xs">Admin</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-1.5 py-3 transition-transform active:scale-[0.97]"
                  disabled={demoLoggingIn !== null}
                  onClick={() => handleDemoLogin("judge")}
                >
                  {demoLoggingIn === "judge" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Gavel className="size-4" />
                  )}
                  <span className="text-xs">Hakem</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-1.5 py-3 transition-transform active:scale-[0.97]"
                  disabled={demoLoggingIn !== null}
                  onClick={() => handleDemoLogin("contestant")}
                >
                  {demoLoggingIn === "contestant" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  <span className="text-xs">Yarışmacı</span>
                </Button>
              </div>
            </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
