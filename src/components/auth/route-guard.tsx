"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCurrentUser, useHasHydrated } from "@/store/useAppStore";
import type { UserRole } from "@/types";

export function RouteGuard({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const hydrated = useHasHydrated();
  const { status } = useSession();
  const user = useCurrentUser();
  const router = useRouter();
  const ready = hydrated && status !== "loading";
  const authorized = !!user && allow.includes(user.role);

  useEffect(() => {
    if (ready && !authorized) {
      router.replace("/login");
    }
  }, [ready, authorized, router]);

  if (!ready || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
