"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Megaphone, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/store/useAppStore";
import * as supportService from "@/services/support.service";

type Audience = "contestants" | "judges" | "both" | "custom";

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: "contestants", label: "Yarışmacılar" },
  { value: "judges", label: "Hakemler" },
  { value: "both", label: "Her ikisi" },
  { value: "custom", label: "Seç..." },
];

export default function AdminAnnouncementsPage() {
  const categories = useAppStore((s) => s.categories);
  const users = useAppStore((s) => s.users);

  const [audience, setAudience] = useState<Audience>("both");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [customIds, setCustomIds] = useState<string[]>([]);
  const [customSearch, setCustomSearch] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const audienceUsers = useMemo(
    () => users.filter((u) => u.role === "judge" || u.role === "contestant"),
    [users],
  );
  const filteredCustomUsers = useMemo(() => {
    const q = customSearch.trim().toLowerCase();
    if (!q) return audienceUsers;
    return audienceUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [audienceUsers, customSearch]);

  const estimatedCount = useMemo(() => {
    if (audience === "custom") return customIds.length;
    return users.filter((u) => {
      if (audience === "contestants" && u.role !== "contestant") return false;
      if (audience === "judges" && u.role !== "judge") return false;
      if (audience === "both" && u.role !== "contestant" && u.role !== "judge") return false;
      if (categoryId !== "all" && !u.categoryIds.includes(categoryId)) return false;
      return true;
    }).length;
  }, [users, audience, categoryId, customIds]);

  function toggleCustom(id: string) {
    setCustomIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (audience === "custom" && customIds.length === 0) {
      toast.error("En az bir kişi seç.");
      return;
    }

    setSending(true);
    const count = await supportService.sendAnnouncement({
      audience,
      userIds: audience === "custom" ? customIds : undefined,
      categoryId: audience !== "custom" && categoryId !== "all" ? categoryId : undefined,
      title: title.trim(),
      body: body.trim() || undefined,
    });
    setSending(false);

    if (count === 0) {
      toast.info("Eşleşen kimse bulunamadı, kimseye gönderilmedi.");
      return;
    }
    toast.success(`${count} kişiye bildirim gönderildi.`);
    setTitle("");
    setBody("");
    setCustomIds([]);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="size-4" />
            Duyuru Gönder
          </CardTitle>
          <CardDescription>
            Yarışmacılara ve/veya hakemlere, kategoriye göre toplu ya da tek tek seçerek
            bildirim gönder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-5">
            <div className="space-y-2">
              <Label>Kime</Label>
              <RadioGroup
                value={audience}
                onValueChange={(v) => setAudience(v as Audience)}
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {AUDIENCE_OPTIONS.map((opt) => (
                  <Label
                    key={opt.value}
                    htmlFor={`audience-${opt.value}`}
                    className={cn(
                      "flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-normal transition-colors",
                      audience === opt.value ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    <RadioGroupItem value={opt.value} id={`audience-${opt.value}`} />
                    {opt.label}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {audience !== "custom" && (
              <div className="space-y-2">
                <Label>Kategori (opsiyonel)</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm kategoriler</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {audience === "custom" && (
              <div className="space-y-2">
                <Label>Kişi Seç ({customIds.length} seçili)</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={customSearch}
                    onChange={(e) => setCustomSearch(e.target.value)}
                    placeholder="İsim veya e-posta ile ara..."
                    className="pl-9"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
                  {filteredCustomUsers.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Kimse bulunamadı.
                    </p>
                  ) : (
                    filteredCustomUsers.map((u) => (
                      <label
                        key={u.id}
                        htmlFor={`user-${u.id}`}
                        className="flex cursor-pointer items-center justify-between gap-3 border-b border-border px-3 py-2 text-sm last:border-0 hover:bg-muted"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {u.role === "judge" ? "Hakem" : "Yarışmacı"} &middot; {u.email}
                          </p>
                        </div>
                        <Checkbox
                          id={`user-${u.id}`}
                          checked={customIds.includes(u.id)}
                          onCheckedChange={() => toggleCustom(u.id)}
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="announcement-title">Başlık</Label>
              <Input
                id="announcement-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Bakım duyurusu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-body">Mesaj (opsiyonel)</Label>
              <Textarea
                id="announcement-body"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Detayları buraya yaz..."
              />
            </div>

            <Button type="submit" disabled={sending} className="w-full gap-1.5">
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Megaphone className="size-4" />
              )}
              {sending ? "Gönderiliyor..." : `Gönder (${estimatedCount} kişi)`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
