"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BrainCircuit, FileText, Gavel, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { ReportScanVisual } from "@/components/landing/report-scan-visual";
import { AmbientGlow } from "@/components/landing/ambient-glow";
import { useCurrentUser, useHasHydrated } from "@/store/useAppStore";
import type { UserRole } from "@/types";

const DASHBOARD_PATH: Record<UserRole, string> = {
  admin: "/admin",
  judge: "/judge",
  contestant: "/contestant",
};

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "AI Destekli Analiz",
    desc: "Yüklenen raporlar yapay zekayla otomatik olarak taranır, hakemlere hazır bir özet ve ön değerlendirme sunulur.",
  },
  {
    icon: FileText,
    title: "Kolay Rapor Yükleme",
    desc: "Yarışmacılar PDF raporlarını sürükle-bırak ile saniyeler içinde, kategori seçerek teslim eder.",
  },
  {
    icon: Gavel,
    title: "Adil Hakem Değerlendirmesi",
    desc: "Hakemler kategori bazlı, şeffaf ve izlenebilir bir puanlama akışı üzerinden değerlendirme yapar.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const currentUser = useCurrentUser();

  useEffect(() => {
    if (hydrated && currentUser) {
      router.replace(DASHBOARD_PATH[currentUser.role]);
    }
  }, [hydrated, currentUser, router]);

  if (!hydrated || currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background to-muted/40">
      <AmbientGlow className="-z-10" />

      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <span className="text-brand-gradient text-xl font-extrabold tracking-tight">Ludex</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/login">
              Giriş Yap
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col items-center px-6 pt-16 pb-24 md:pt-20">
        <div className="grid w-full items-center gap-12 md:grid-cols-2 md:gap-8">
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
              <Sparkles className="size-4 animate-float-slow text-primary" />
              Yapay zeka destekli değerlendirme
            </div>

            <h1 className="animate-in fade-in slide-in-from-bottom-6 duration-700 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl md:text-6xl">
              Yarışma raporlarını
              <br />
              <span className="text-brand-gradient">saniyeler içinde</span> değerlendir
            </h1>

            <p className="animate-in fade-in slide-in-from-bottom-8 duration-700 mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Ludex; yarışmacı, hakem ve yönetici rollerini tek platformda birleştirir. AI
              analiziyle raporları özetler, hakemlere adil ve hızlı bir değerlendirme akışı sunar.
            </p>

            <div className="animate-in fade-in slide-in-from-bottom-10 duration-700 mt-10 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/30">
                <Link href="/login">
                  Hemen Başla
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Demo ile Gir</Link>
              </Button>
            </div>
          </div>

          <ReportScanVisual className="mx-auto w-full max-w-[320px] animate-in fade-in zoom-in-95 duration-1000 md:max-w-sm" />
        </div>

        <div className="mt-24 grid w-full gap-6 sm:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Card
              key={feature.title}
              style={{ animationDelay: `${150 * i}ms` }}
              className="animate-in fade-in slide-in-from-bottom-4 border-border/60 bg-card/70 text-left backdrop-blur-sm duration-700 fill-mode-both"
            >
              <CardContent className="pt-6">
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[var(--brand-glow-2)] text-primary-foreground">
                  <feature.icon className="size-5" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/60 px-6 py-6 text-center text-sm text-muted-foreground">
        Ludex — AI Destekli Akıllı Yarışma Rapor Değerlendirme Platformu
      </footer>
    </div>
  );
}
