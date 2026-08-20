"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Mail, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import * as authService from "@/services/auth.service";

type Step = "request" | "verify" | "done";
type Channel = "email" | "phone";

export function ForgotPasswordDialog() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("request");
  const [channel, setChannel] = useState<Channel>("email");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setStep("request");
      setChannel("email");
      setIdentifier("");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }

  async function handleRequestSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await authService.requestPasswordReset(channel, identifier);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Bir hata oluştu.");
      return;
    }

    toast.info(`Demo doğrulama kodu: ${result.code}`, {
      description:
        channel === "email"
          ? "Gerçek sistemde bu kod e-postana gönderilir."
          : "Gerçek sistemde bu kod SMS ile gönderilir.",
    });
    setStep("verify");
  }

  async function handleVerifySubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Şifreler birbiriyle uyuşmuyor.");
      return;
    }

    setSubmitting(true);
    const result = await authService.resetPassword(code, newPassword);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Bir hata oluştu.");
      return;
    }
    setStep("done");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Şifremi unuttum
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        {step === "request" && (
          <>
            <DialogHeader>
              <DialogTitle>Şifreni Sıfırla</DialogTitle>
              <DialogDescription>
                Doğrulama kodunun nereye gönderileceğini seç.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={channel === "email" ? "default" : "outline"}
                className="gap-1.5"
                onClick={() => setChannel("email")}
              >
                <Mail className="size-4" />
                E-posta
              </Button>
              <Button
                type="button"
                variant={channel === "phone" ? "default" : "outline"}
                className="gap-1.5"
                onClick={() => setChannel("phone")}
              >
                <Phone className="size-4" />
                Telefon
              </Button>
            </div>

            <form onSubmit={handleRequestSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="reset-identifier">
                  {channel === "email" ? "E-posta adresin" : "Telefon numaran"}
                </Label>
                <Input
                  id="reset-identifier"
                  type={channel === "email" ? "email" : "tel"}
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={channel === "email" ? "ornek@mail.com" : "+90 5xx xxx xx xx"}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full gap-1.5 transition-transform active:scale-[0.98]"
                >
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  {submitting ? "Gönderiliyor..." : "Doğrulama Kodu Gönder"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {step === "verify" && (
          <>
            <DialogHeader>
              <DialogTitle>Kodu Doğrula</DialogTitle>
              <DialogDescription>
                {channel === "email" ? "E-postana" : "Telefonuna"} gönderilen 6 haneli kodu ve
                yeni şifreni gir.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-code">Doğrulama Kodu</Label>
                <Input
                  id="reset-code"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-new-password">Yeni Şifre</Label>
                <Input
                  id="reset-new-password"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirm-password">Yeni Şifre (Tekrar)</Label>
                <Input
                  id="reset-confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Şifreni tekrar gir"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="ghost" onClick={() => setStep("request")}>
                  Geri
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="gap-1.5 transition-transform active:scale-[0.98]"
                >
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  {submitting ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle>Şifren Güncellendi</DialogTitle>
              <DialogDescription>Yeni şifrenle giriş yapabilirsin.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                className="w-full transition-transform active:scale-[0.98]"
                onClick={() => handleOpenChange(false)}
              >
                Giriş Ekranına Dön
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
