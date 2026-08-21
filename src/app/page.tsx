"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Gavel,
  Gauge,
  Layers,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

const SPRING = { type: "spring" as const, stiffness: 400, damping: 30 };

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ ...SPRING, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const PIPELINE_STEPS = [
  {
    no: "01",
    title: "Dil & Şartname",
    metric: "92%",
    tag: "Uygun",
    tone: "ok" as const,
    desc: "Rapor dili ve şartnamedeki yasak/zorunlu maddeler otomatik taranır, ihlal riski taşıyan bulgular işaretlenir.",
  },
  {
    no: "02",
    title: "Şablon Denetimi",
    metric: "100%",
    tag: "Tam",
    tone: "ok" as const,
    desc: "Zorunlu bölümler, sayfa sınırı ve biçim kuralları rapor şablonuyla karşılaştırılır.",
  },
  {
    no: "03",
    title: "İçerik Analizi",
    metric: "4/5",
    tag: "Güçlü",
    tone: "info" as const,
    desc: "Güçlü yönler, zayıf yönler ve geliştirme önerileri çıkarılıp hakemin özetine hazır sunulur.",
  },
  {
    no: "04",
    title: "Kategori & Benzerlik",
    metric: "41%",
    tag: "İncelensin",
    tone: "warn" as const,
    desc: "Rapor, seçtiği kategoriyle ve önceki başvurularla bölüm bölüm karşılaştırılır.",
  },
  {
    no: "05",
    title: "AI Yazım Riski",
    metric: "Düşük",
    tag: "Bilgi",
    tone: "info" as const,
    desc: "Yapay zeka ile üretilmiş metinlere özgü kalıplar taranır — kesin tespit değil, ek inceleme işaretidir.",
  },
];

const TONE_CLASS: Record<"ok" | "info" | "warn", string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  warn: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
};

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
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      {/* NAV */}
      <header className="glass-toolbar sticky top-0 z-40">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 md:px-12">
          <span className="text-brand-gradient text-lg font-extrabold tracking-tight">Ludex</span>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#nasil-calisir" className="transition-colors hover:text-foreground">
              Nasıl Çalışır
            </a>
            <a href="#kanit" className="transition-colors hover:text-foreground">
              Kanıtlı Değerlendirme
            </a>
            <a href="#panel" className="transition-colors hover:text-foreground">
              Hakem Paneli
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/login">
                Giriş Yap
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <AmbientGlow className="-z-10" />
        <div className="mx-auto flex max-w-6xl flex-col items-center px-6 pt-16 pb-24 md:pt-20">
          <div className="grid w-full items-center gap-12 md:grid-cols-2 md:gap-8">
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SPRING}
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm"
              >
                <span className="size-1.5 rounded-full bg-primary" />
                Yarışma raporları için karar desteği
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.05 }}
                className="text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl md:text-6xl"
              >
                Rapor başına saatler harcamak yerine,
                <br />
                <span className="text-brand-gradient">şartnameye uygunluğu, özgünlüğü ve riski</span>
                <br />
                tek bakışta gör.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.1 }}
                className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
              >
                Ludex, yarışma raporlarını şartname, şablon, içerik ve benzerlik
                boyutlarıyla analiz edip hakeme kanıtlı bir karar desteği sunar. Nihai
                kararı her zaman hakem verir.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.15 }}
                className="mt-10 flex flex-wrap items-center justify-center gap-3 md:justify-start"
              >
                <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/30">
                  <Link href="/login">
                    Sistemi Keşfet
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/login">Demo ile Gir</Link>
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ...SPRING, delay: 0.25 }}
                className="mt-8 font-mono text-xs tracking-widest text-muted-foreground/70 uppercase"
              >
                Şartname · Şablon · İçerik · Kategori · Benzerlik
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...SPRING, delay: 0.2 }}
            >
              <ReportScanVisual className="mx-auto w-full max-w-[320px] md:max-w-sm" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* PROBLEM (dark band) */}
      <section className="relative overflow-hidden bg-zinc-950 py-28 text-zinc-50">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(60% 50% at 15% 20%, color-mix(in oklch, var(--brand-glow-1) 35%, transparent), transparent), radial-gradient(50% 40% at 90% 70%, color-mix(in oklch, var(--brand-glow-2) 25%, transparent), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-6 text-center md:px-12">
          <Reveal>
            <p className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
              Bugünkü tablo
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 text-3xl font-bold tracking-[-0.03em] sm:text-4xl md:text-5xl">
              40 sayfalık rapor. Onlarca kriter.
              <br />
              Yüzlerce başvuru.
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mx-auto mt-6 max-w-md text-lg text-zinc-400">
              Sınırlı süre içinde hakemin dikkatinden{" "}
              <span className="font-medium text-zinc-50">kritik bir detay</span> kolayca
              kaçabilir.
            </p>
          </Reveal>
        </div>
      </section>

      {/* NASIL ÇALIŞIR — gerçek Ludex analiz hattı */}
      <section id="nasil-calisir" className="bg-muted/30 py-28">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Nasıl çalışır
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              Ludex raporu sizinle birlikte okur.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Rapor yüklendiği anda beş katman sırayla işler. Her katman, hakemin
              dakikalar harcadığı bir kontrolü saniyelere indirir.
            </p>
          </Reveal>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PIPELINE_STEPS.map((step, i) => (
              <Reveal key={step.no} delay={i * 0.05}>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  transition={SPRING}
                  className="flex h-full flex-col rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur-sm hover:shadow-xl hover:shadow-black/5"
                >
                  <span className="font-mono text-xs tracking-widest text-muted-foreground">
                    {step.no} / 05
                  </span>
                  <h3 className="mt-3 text-base font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold tabular-nums">
                      {step.metric}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[step.tone]}`}
                    >
                      {step.tag}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* KANITLI DEĞERLENDİRME */}
      <section id="kanit" className="py-28">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <Reveal className="max-w-2xl">
            <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Kanıtlı değerlendirme
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              Sadece &ldquo;ne&rdquo; olduğunu değil,
              <br />
              &ldquo;neden&rdquo; olduğunu da gösterir.
            </h2>
          </Reveal>

          <div className="mt-14 grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal delay={0.05}>
              <div className="rounded-2xl border border-border/60 bg-card/70 p-8 shadow-xl shadow-black/5 backdrop-blur-sm">
                <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  Kriter 02 · AI ön değerlendirme
                </p>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight">
                  Uygulanabilirlik
                </h3>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-mono text-6xl font-bold tabular-nums">6</span>
                  <span className="text-xl text-muted-foreground">/ 10</span>
                </div>
                <p className="mt-1 font-mono text-sm tracking-wide text-muted-foreground">
                  Düşük saha doğrulaması
                </p>
                <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">
                  Neden?
                  <ArrowRight className="size-3.5" />
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="rounded-2xl border border-border/60 bg-muted/40 p-8">
                <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  Sayfa 11 — Yöntem
                </p>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  Sistemin toprak nemi ve hava sıcaklığı verilerini birlikte işleyen
                  karar algoritması geliştirilmiştir.{" "}
                  <mark className="rounded-sm bg-amber-300/70 px-0.5 text-foreground dark:bg-amber-400/40">
                    Prototip sistem yalnızca laboratuvar ortamında test edilmiştir
                  </mark>{" "}
                  ve sulama kararlarının doğruluğu kontrollü koşullarda ölçülmüştür.
                </p>
                <p className="mt-6 font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  Sayfa 18 — Sonuçlar
                </p>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  Elde edilen sonuçlar su tüketiminde belirgin bir azalma olduğunu
                  gösteriyor;{" "}
                  <mark className="rounded-sm bg-amber-300/70 px-0.5 text-foreground dark:bg-amber-400/40">
                    gerçek saha testi henüz gerçekleştirilmemiştir
                  </mark>
                  .
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* HAKEM PANELİ ÖNİZLEME */}
      <section id="panel" className="bg-muted/30 py-28">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <Reveal className="max-w-2xl">
            <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Hakem paneli
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              Analiz, hakemin çalıştığı ekranın içinde.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Rapor solda, Ludex analizi sağda. Hakem sayfalar arasında kaybolmadan
              kendi değerlendirmesini yapar.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-14">
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/10">
              <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
                <span className="size-2.5 rounded-full bg-destructive/60" />
                <span className="size-2.5 rounded-full bg-[var(--brand-glow-3)]/60" />
                <span className="size-2.5 rounded-full bg-primary/60" />
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  Hakem Değerlendirme — R-2026-0184
                </span>
              </div>
              <div className="grid gap-px bg-border/60 md:grid-cols-[7fr_3fr]">
                <div className="space-y-2.5 bg-muted/40 p-6">
                  <div className="h-4 w-1/2 rounded-full bg-muted-foreground/20" />
                  {[92, 78, 85, 60, 88, 70].map((w, i) => (
                    <div
                      key={i}
                      className="h-2.5 rounded-full bg-muted-foreground/15"
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>
                <div className="space-y-4 bg-card p-6">
                  <p className="flex items-center gap-1.5 text-xs font-medium tracking-tight text-muted-foreground">
                    <Sparkles className="size-3 text-primary opacity-80" />
                    Ludex Özeti
                  </p>
                  {[
                    { label: "Şartname", value: 92, tone: "ok" as const },
                    { label: "Şablon", value: 100, tone: "ok" as const },
                    { label: "Kategori", value: 94, tone: "ok" as const },
                    { label: "Benzerlik", value: 41, tone: "warn" as const },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3 text-sm">
                      <span className="w-20 shrink-0 text-muted-foreground">{row.label}</span>
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className={`block h-full rounded-full ${
                            row.tone === "ok" ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${row.value}%` }}
                        />
                      </span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        %{row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* HUMAN IN THE LOOP */}
      <section className="py-28">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Karar yetkisi
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              Son kararı yapay zekâ değil, hakem verir.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <Reveal delay={0.05}>
              <div className="flex h-full flex-col justify-between rounded-2xl bg-zinc-950 p-8 text-zinc-50">
                <div>
                  <p className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
                    Ludex önerisi
                  </p>
                  <div className="mt-6 flex items-baseline gap-2 font-mono">
                    <span className="text-6xl font-bold tabular-nums">76</span>
                    <span className="text-xl text-zinc-500">/ 100</span>
                  </div>
                </div>
                <p className="mt-8 text-sm leading-relaxed text-zinc-400">
                  Bu puan bir öneridir. Hakemin puanının yerine geçmez, yalnızca
                  başlangıç noktası olarak sunulur.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="flex h-full flex-col justify-between rounded-2xl border border-border/60 bg-card/70 p-8 backdrop-blur-sm">
                <div>
                  <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                    Hakemin kendi değerlendirmesi
                  </p>
                  <div className="mt-6 flex items-baseline gap-2 font-mono">
                    <span className="text-6xl font-bold tabular-nums">86</span>
                    <span className="text-xl text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <p className="mt-8 flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  +10 fark — hakem son kararı verdi
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ÖZELLİK ŞERİDİ */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 sm:grid-cols-3 md:px-12">
          {[
            { icon: BrainCircuit, title: "AI Destekli Analiz", desc: "Şartname, şablon, içerik ve benzerlik tek akışta." },
            { icon: ShieldCheck, title: "Kanıt Gösterir", desc: "Her bulgu, raporun ilgili sayfasına ve cümlesine bağlanır." },
            { icon: Gavel, title: "Kararı Hakem Verir", desc: "Ludex sadece öneri sunar, nihai puanlama hakemde kalır." },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <div className="flex flex-col items-start gap-3 text-left">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[var(--brand-glow-2)] text-primary-foreground">
                  <f.icon className="size-5" />
                </div>
                <h3 className="font-semibold tracking-tight">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FINAL CTA (dark) */}
      <section className="relative overflow-hidden bg-zinc-950 py-28 text-center text-zinc-50">
        <div
          className="pointer-events-none absolute left-1/2 top-1/3 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--brand-glow-1) 45%, transparent), transparent 65%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 md:px-12">
          <Reveal>
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/10">
              <Gauge className="size-6" />
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-6 text-3xl font-bold tracking-[-0.03em] sm:text-4xl md:text-5xl">
              Raporu analiz eder.
              <br />
              Kanıtı gösterir.
              <br />
              Kararı hakeme bırakır.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-5 font-mono text-sm tracking-wide text-zinc-500">
              AI destekli akıllı yarışma rapor değerlendirme platformu
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <motion.div whileHover={{ scale: 1.03 }} transition={SPRING} className="mt-10 inline-block">
              <Button asChild size="lg" className="gap-2 bg-white text-zinc-950 hover:bg-white/90">
                <Link href="/login">
                  Ludex&apos;i Keşfet
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </motion.div>
          </Reveal>

          <div className="mt-20 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 font-mono text-[11px] tracking-widest text-zinc-600 uppercase sm:flex-row">
            <span className="flex items-center gap-1.5">
              <Layers className="size-3" />
              Ludex
            </span>
            <span className="flex items-center gap-1.5">
              <Trophy className="size-3" />
              Yarışmacı · Hakem · Yönetici tek platformda
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
