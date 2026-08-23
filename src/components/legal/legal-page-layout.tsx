"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/landing/site-footer";
import type { ReactNode } from "react";

export function LegalPageLayout({
  title,
  updatedAt,
  backLabel = "Geri Dön",
  children,
}: {
  title: string;
  updatedAt: string;
  backLabel?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-6">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 gap-1.5 text-muted-foreground"
            onClick={handleBack}
          >
            <ArrowLeft className="size-4" />
            {backLabel}
          </Button>
          <span className="text-brand-gradient text-base font-extrabold tracking-tight">Ludex</span>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Son güncelleme: {updatedAt}</p>

          <div className="prose-legal mt-10 space-y-8">{children}</div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
