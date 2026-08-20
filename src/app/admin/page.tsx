import { RouteGuard } from "@/components/auth/route-guard";
import { AppHeader } from "@/components/layout/app-header";

export default function AdminPage() {
  return (
    <RouteGuard allow={["admin"]}>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Admin Paneli</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Rapor havuzu, hakem listesi ve dağıtım mekanizması bir sonraki adımda burada olacak.
        </p>
      </main>
    </RouteGuard>
  );
}
