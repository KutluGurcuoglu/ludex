"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, LifeBuoy, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppStore } from "@/store/useAppStore";
import * as supportService from "@/services/support.service";
import { useViewMode } from "../_lib/shared";

const ROLE_LABEL: Record<string, string> = {
  admin: "Yönetici",
  judge: "Hakem",
  contestant: "Yarışmacı",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSupportPage() {
  const supportMessages = useAppStore((s) => s.supportMessages);
  const { viewMode } = useViewMode();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const { pending, resolved } = useMemo(() => {
    const sorted = [...supportMessages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return {
      pending: sorted.filter((m) => !m.resolvedAt),
      resolved: sorted.filter((m) => m.resolvedAt),
    };
  }, [supportMessages]);

  async function handleResolve(id: string) {
    setResolvingId(id);
    await supportService.resolveSupportMessage(id);
    setResolvingId(null);
    toast.success("Destek talebi çözüldü olarak işaretlendi.");
  }

  return (
    <div className="space-y-6">
      <p className="text-base text-muted-foreground">
        {pending.length} bekleyen destek talebi &middot; {resolved.length} çözüldü
      </p>

      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-base text-muted-foreground">
          Bekleyen destek talebi yok.
        </p>
      ) : (
        <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          {pending.map((m) => {
            if (viewMode === "list") {
              return (
                <Card key={m.id} className="border-amber-300 py-0 dark:border-amber-900">
                  <CardContent className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <Avatar>
                      <AvatarFallback>{m.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold">{m.subject}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {m.userName} ({ROLE_LABEL[m.userRole] ?? m.userRole}) &middot;{" "}
                        {formatDate(m.createdAt)} &middot; {m.message}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                    >
                      <LifeBuoy className="mr-1 size-3" />
                      Bekliyor
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resolvingId === m.id}
                      className="shrink-0 gap-1.5"
                      onClick={() => handleResolve(m.id)}
                    >
                      {resolvingId === m.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Çözüldü
                    </Button>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={m.id} className="border-amber-300 dark:border-amber-900">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{m.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-base font-semibold">{m.userName}</p>
                        <p className="text-sm text-muted-foreground">
                          {ROLE_LABEL[m.userRole] ?? m.userRole} &middot; {formatDate(m.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                    >
                      <LifeBuoy className="mr-1 size-3" />
                      Bekliyor
                    </Badge>
                  </div>
                  <div>
                    <p className="text-base font-medium">{m.subject}</p>
                    <p className="mt-1 text-base text-muted-foreground">{m.message}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resolvingId === m.id}
                    className="gap-1.5"
                    onClick={() => handleResolve(m.id)}
                  >
                    {resolvingId === m.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Çözüldü Olarak İşaretle
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3">
          <p className="text-base font-semibold">Çözülmüş Talepler ({resolved.length})</p>
          <div className="space-y-2">
            {resolved.map((m) => (
              <Card key={m.id} className="py-0">
                <CardContent className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium">{m.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {m.userName} ({ROLE_LABEL[m.userRole] ?? m.userRole}) &middot;{" "}
                      {formatDate(m.createdAt)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                  >
                    Çözüldü
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
