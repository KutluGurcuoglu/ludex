"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CheckCircle2, HelpCircle, LifeBuoy, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/useAppStore";
import * as supportService from "@/services/support.service";
import * as faqService from "@/services/faq.service";
import type { FaqEntry } from "@/types";
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

function FaqManagementSection() {
  const faqs = useAppStore((s) => s.faqs);
  const { viewMode } = useViewMode();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [role, setRole] = useState<FaqEntry["role"]>("judge");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setRole("judge");
    setQuestion("");
    setAnswer("");
    setDialogOpen(true);
  }

  function openEdit(faq: FaqEntry) {
    setEditingId(faq.id);
    setRole(faq.role);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setDialogOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    if (editingId) {
      await faqService.updateFaqEntry(editingId, { question: question.trim(), answer: answer.trim() });
    } else {
      await faqService.addFaqEntry({ role, question: question.trim(), answer: answer.trim() });
    }
    setSaving(false);
    toast.success(editingId ? "SSS güncellendi." : "Yeni SSS eklendi.");
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await faqService.deleteFaqEntry(id);
    setDeletingId(null);
    toast.success("SSS silindi.");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-base text-muted-foreground">
          {faqs.length} SSS &middot; hakem ve yarışmacı ayarlar sayfasında gösterilir
        </p>
        <Button onClick={openCreate} className="gap-1.5 transition-transform active:scale-[0.97]">
          <Plus className="size-4" />
          Yeni SSS
        </Button>
      </div>

      {faqs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-base text-muted-foreground">
          Henüz tanımlı bir SSS yok.
        </p>
      ) : (
        <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          {faqs.map((faq) => {
            const actions = (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => openEdit(faq)}
                >
                  <Pencil className="size-3.5" />
                  Düzenle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={deletingId === faq.id}
                  className="flex-1 gap-1.5 text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(faq.id)}
                >
                  {deletingId === faq.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  Sil
                </Button>
              </>
            );

            if (viewMode === "list") {
              return (
                <Card key={faq.id} className="py-0">
                  <CardContent className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <Badge variant="secondary" className="shrink-0">
                      {ROLE_LABEL[faq.role]}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold">{faq.question}</p>
                      <p className="truncate text-sm text-muted-foreground">{faq.answer}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">{actions}</div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={faq.id}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-base font-semibold">{faq.question}</p>
                    <Badge variant="secondary" className="shrink-0">
                      {ROLE_LABEL[faq.role]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  <Separator />
                  <div className="flex gap-2">{actions}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? "SSS Düzenle" : "Yeni SSS Ekle"}</DialogTitle>
            <DialogDescription>
              Hakem/yarışmacı ayarlar sayfasında gösterilecek soru-cevabı tanımla.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {!editingId && (
              <div className="space-y-2">
                <Label htmlFor="faq-role">Kime gösterilecek</Label>
                <Select value={role} onValueChange={(v) => setRole(v as FaqEntry["role"])}>
                  <SelectTrigger id="faq-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="judge">Hakem</SelectItem>
                    <SelectItem value="contestant">Yarışmacı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="faq-question">Soru</Label>
              <Input
                id="faq-question"
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Örn: Raporum ne zaman değerlendirilecek?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-answer">Cevap</Label>
              <Textarea
                id="faq-answer"
                required
                rows={4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={saving}
                className="w-full gap-1.5 transition-transform active:scale-[0.98]"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editingId ? "Kaydet" : "Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SupportTicketsSection() {
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

export default function AdminSupportPage() {
  return (
    <Tabs defaultValue="tickets">
      <TabsList>
        <TabsTrigger value="tickets" className="gap-1.5">
          <LifeBuoy className="size-4" />
          Destek Talepleri
        </TabsTrigger>
        <TabsTrigger value="faq" className="gap-1.5">
          <HelpCircle className="size-4" />
          SSS Yönetimi
        </TabsTrigger>
      </TabsList>
      <TabsContent value="tickets" className="mt-6">
        <SupportTicketsSection />
      </TabsContent>
      <TabsContent value="faq" className="mt-6">
        <FaqManagementSection />
      </TabsContent>
    </Tabs>
  );
}
