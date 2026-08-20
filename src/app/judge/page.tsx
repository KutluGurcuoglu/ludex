import { RouteGuard } from "@/components/auth/route-guard";
import { AppHeader } from "@/components/layout/app-header";

export default function JudgePage() {
  return (
    <RouteGuard allow={["judge"]}>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Hakem Paneli</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Bekleyen / Devam Eden / Tamamlanan sekmeleri bir sonraki adımda burada olacak.
        </p>
      </main>
    </RouteGuard>
  );
}
