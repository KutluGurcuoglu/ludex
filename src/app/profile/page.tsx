"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  FileText,
  Gavel,
  Loader2,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { RouteGuard } from "@/components/auth/route-guard";
import { AppHeader } from "@/components/layout/app-header";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore, useCurrentUser } from "@/store/useAppStore";
import * as usersService from "@/services/users.service";
import type { UserRole } from "@/types";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Yönetici",
  judge: "Hakem",
  contestant: "Yarışmacı",
};

const GENDER_OPTIONS = ["Kadın", "Erkek", "Belirtmek istemiyorum"];
const REFERRAL_OPTIONS = [
  "TEKNOFEST Kulübü",
  "Sosyal Medya",
  "Okul / Öğretmen",
  "Arkadaş Tavsiyesi",
  "Diğer",
];
const EDUCATION_LEVELS = ["Lise", "Ön Lisans", "Lisans", "Yüksek Lisans", "Doktora", "Mezun"];
const PHONE_COUNTRY_CODES = ["+90", "+1", "+44", "+49", "+33"];

const ADMIN_CAPABILITIES = [
  { label: "Rapor Havuzu Yönetimi", icon: FileText },
  { label: "Hakem Atama", icon: Gavel },
  { label: "Yarışmacı Yönetimi", icon: Users },
  { label: "Yarışma & Şartname Yönetimi", icon: Trophy },
];

function ProfileSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 pt-6">
              <Skeleton className="size-16 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export default function ProfilePage() {
  return (
    <RouteGuard allow={["admin", "judge", "contestant"]}>
      <ProfileView />
    </RouteGuard>
  );
}

function ProfileView() {
  const user = useCurrentUser();
  const router = useRouter();
  const categories = useAppStore((s) => s.categories);

  const initialName = splitName(user?.name ?? "");
  const isAdmin = user?.role === "admin";
  const isJudge = user?.role === "judge";

  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [firstName, setFirstName] = useState(initialName.firstName);
  const [lastName, setLastName] = useState(initialName.lastName);
  const [isTurkishCitizen, setIsTurkishCitizen] = useState(user?.isTurkishCitizen ?? true);
  const [nationalId, setNationalId] = useState(user?.nationalId ?? "");
  const [gender, setGender] = useState(user?.gender ?? "");
  const [birthDate, setBirthDate] = useState(user?.birthDate ?? "");
  const [referralSource, setReferralSource] = useState(user?.referralSource ?? "");

  const [countryCode, setCountryCode] = useState(user?.countryCode ?? "+90");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [country, setCountry] = useState(user?.country ?? "Türkiye");
  const [city, setCity] = useState(user?.city ?? "");
  const [district, setDistrict] = useState(user?.district ?? "");
  const [address, setAddress] = useState(user?.address ?? "");

  const [educationLevel, setEducationLevel] = useState(user?.educationLevel ?? "");
  const [school, setSchool] = useState(user?.school ?? "");
  const [faculty, setFaculty] = useState(user?.faculty ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [grade, setGrade] = useState(user?.grade ?? "");
  const [educationNote, setEducationNote] = useState(user?.educationNote ?? "");
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? "");

  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let active = true;
    usersService.getUsers().then(() => {
      if (active) setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!user) return null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (isAdmin || isJudge) {
      await usersService.updateProfile(user!.id, {
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone: phone.trim(),
        jobTitle: jobTitle.trim(),
        department: department.trim(),
      });
    } else {
      await usersService.updateProfile(user!.id, {
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        isTurkishCitizen,
        nationalId: isTurkishCitizen ? nationalId.trim() : "",
        gender,
        birthDate,
        referralSource,
        countryCode,
        phone: phone.trim(),
        country: country.trim(),
        city: city.trim(),
        district: district.trim(),
        address: address.trim(),
        educationLevel,
        school: school.trim(),
        faculty: faculty.trim(),
        department: department.trim(),
        grade: grade.trim(),
        educationNote: educationNote.trim(),
      });
    }

    setSaving(false);
    toast.success("Profilin güncellendi.");
  }

  async function handleDelete() {
    setDeleting(true);
    await usersService.deleteAccount(user!.id);
    setDeleting(false);
    toast.success("Hesabın silindi.");
    router.replace("/login");
  }

  if (isLoading) {
    return (
      <>
        <AppHeader />
        <div className="min-h-[calc(100vh-4rem)]">
          <main className="w-full px-6 py-12 md:px-12">
            <ProfileSkeleton />
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <div className="min-h-[calc(100vh-4rem)]">
        <main className="w-full px-6 py-12 md:px-12">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Hesabım</h1>
            <p className="mt-1 text-base leading-relaxed text-muted-foreground">
              Bilgilerini güncelle veya hesabını yönet.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
        <form onSubmit={handleSave} className="space-y-6">
          {!isAdmin && !isJudge && (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertDescription>
                Kişisel bilgilerinizin kimlik bilgileriniz ile eşleştiğinden emin olunuz.
              </AlertDescription>
            </Alert>
          )}

          {isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle>Kişisel Bilgiler</CardTitle>
                <CardDescription>Görev ve iletişim bilgilerin.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="admin-first-name">Adı</Label>
                    <Input
                      id="admin-first-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-last-name">Soyadı</Label>
                    <Input
                      id="admin-last-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-email">E-posta Adresi</Label>
                  <Input id="admin-email" value={user.email} disabled />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="admin-phone">Telefon</Label>
                    <Input
                      id="admin-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+90 5xx xxx xx xx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-job-title">Görev / Unvan</Label>
                    <Input
                      id="admin-job-title"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Örn: Sistem Yöneticisi"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-department">Birim</Label>
                  <Input
                    id="admin-department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Örn: Yarışma Komitesi"
                  />
                </div>
              </CardContent>
            </Card>
          ) : isJudge ? (
            <Card>
              <CardHeader>
                <CardTitle>Kişisel Bilgiler</CardTitle>
                <CardDescription>Görev ve iletişim bilgilerin.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="judge-first-name">Adı</Label>
                    <Input
                      id="judge-first-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="judge-last-name">Soyadı</Label>
                    <Input
                      id="judge-last-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="judge-email">E-posta Adresi</Label>
                  <Input id="judge-email" value={user.email} disabled />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="judge-phone">Telefon</Label>
                    <Input
                      id="judge-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+90 5xx xxx xx xx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="judge-job-title">Unvan</Label>
                    <Input
                      id="judge-job-title"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Örn: Dr. Öğr. Üyesi"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="judge-department">Kurum / Kuruluş</Label>
                  <Input
                    id="judge-department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Örn: Isparta Uygulamalı Bilimler Üniversitesi"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
          <>
          <Card>
            <CardHeader>
              <CardTitle>Kişisel Bilgiler</CardTitle>
              <CardDescription>Kimlik ve iletişim öncesi temel bilgilerin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-first-name">Adı</Label>
                  <Input
                    id="profile-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-last-name">Soyadı</Label>
                  <Input
                    id="profile-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email">E-posta Adresi</Label>
                <Input id="profile-email" value={user.email} disabled />
              </div>

              <div className="space-y-2">
                <Label>T.C. Vatandaşı</Label>
                <RadioGroup
                  value={isTurkishCitizen ? "yes" : "no"}
                  onValueChange={(v) => setIsTurkishCitizen(v === "yes")}
                  className="grid grid-cols-2 gap-3"
                >
                  <Label
                    htmlFor="citizen-yes"
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-base transition-colors ${
                      isTurkishCitizen ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <RadioGroupItem value="yes" id="citizen-yes" />
                    Evet
                  </Label>
                  <Label
                    htmlFor="citizen-no"
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-base transition-colors ${
                      !isTurkishCitizen ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <RadioGroupItem value="no" id="citizen-no" />
                    Hayır
                  </Label>
                </RadioGroup>
              </div>

              {isTurkishCitizen && (
                <div className="space-y-2">
                  <Label htmlFor="profile-national-id">
                    T.C. Kimlik Numarası{" "}
                    <span className="font-normal text-muted-foreground">(opsiyonel)</span>
                  </Label>
                  <Input
                    id="profile-national-id"
                    inputMode="numeric"
                    maxLength={11}
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="11 haneli kimlik numaranız (opsiyonel)"
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-gender">Cinsiyet</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="profile-gender" className="w-full">
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-birth-date">Doğum Tarihi</Label>
                  <Input
                    id="profile-birth-date"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-referral">Bizden Nasıl Haberdar Oldunuz?</Label>
                <Select value={referralSource} onValueChange={setReferralSource}>
                  <SelectTrigger id="profile-referral" className="w-full">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {REFERRAL_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>İletişim Bilgileri</CardTitle>
              <CardDescription>Sana nasıl ulaşabileceğimizi belirt.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="profile-country-code">Ülke Kodu</Label>
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger id="profile-country-code" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHONE_COUNTRY_CODES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-phone">Telefon Numarası</Label>
                  <Input
                    id="profile-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="5xx xxx xx xx"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="profile-country">Ülke</Label>
                  <Input
                    id="profile-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-city">İl</Label>
                  <Input id="profile-city" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-district">İlçe</Label>
                  <Input
                    id="profile-district"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-address">Adres</Label>
                <Textarea
                  id="profile-address"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Mahalle, cadde/sokak, no, posta kodu"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eğitim Bilgileri</CardTitle>
              <CardDescription>
                Mezunsan en son bitirdiğin okula göre bilgilerini beyan et.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="profile-education-level">Eğitim Seviyesi</Label>
                <Select value={educationLevel} onValueChange={setEducationLevel}>
                  <SelectTrigger id="profile-education-level" className="w-full">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {educationLevel === "Mezun" && (
                  <p className="text-sm text-muted-foreground">
                    Mezun seviyesinde olan kullanıcı, en son bitirdiği okula göre bilgilerini beyan
                    etmesi gerekmektedir.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-school">Okul</Label>
                <Input
                  id="profile-school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="Örn: Isparta Uygulamalı Bilimler Üniversitesi"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="profile-faculty">Fakülte / Enstitü</Label>
                  <Input
                    id="profile-faculty"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    placeholder="Örn: Teknoloji Fakültesi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-grade">Sınıf</Label>
                  <Input
                    id="profile-grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="Örn: 2. Sınıf"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-department">Bölüm</Label>
                <Input
                  id="profile-department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Örn: Bilgisayar Mühendisliği"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-education-note">
                  Eğitim bilgileriniz listede yok ise yazınız
                </Label>
                <Textarea
                  id="profile-education-note"
                  rows={2}
                  value={educationNote}
                  onChange={(e) => setEducationNote(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
          </>
          )}

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  Yetkiler
                </CardTitle>
                <CardDescription>Yönetici hesabının bu platformdaki yetki alanları.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {ADMIN_CAPABILITIES.map(({ label, icon: Icon }) => (
                    <Badge key={label} variant="secondary" className="gap-1.5 py-1">
                      <Icon className="size-3.5" />
                      {label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {isJudge && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="size-4 text-primary" />
                  Uzmanlık Alanları
                </CardTitle>
                <CardDescription>
                  Bu kategorilerdeki raporlar sana atanır. Değişiklik için yönetici ile iletişime
                  geç.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {categories.filter((c) => user.categoryIds.includes(c.id)).length > 0 ? (
                    categories
                      .filter((c) => user.categoryIds.includes(c.id))
                      .map((c) => (
                        <Badge key={c.id} variant="secondary">
                          {c.name}
                        </Badge>
                      ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Henüz bir uzmanlık alanı atanmamış.
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            type="submit"
            disabled={saving}
            className="gap-2 transition-transform active:scale-[0.98]"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </Button>
        </form>
            </div>

            <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <Card>
                <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
                  <Avatar className="size-16">
                    <AvatarFallback className="text-lg">
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-base font-semibold">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
                  <p className="text-sm text-muted-foreground">
                    Katılım: {formatDate(user.createdAt)}
                  </p>
                </CardContent>
              </Card>

              {!isAdmin && (
              <Card className="border-destructive/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-destructive">
                    <ShieldAlert className="size-4" />
                    Tehlikeli Bölge
                  </CardTitle>
                  <CardDescription>Hesabını sildiğinde bu işlem geri alınamaz.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    Hesabımı Sil
                  </Button>
                </CardContent>
              </Card>
              )}
            </div>
          </div>
        </main>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hesabını silmek istediğine emin misin?</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Hesabın ve giriş bilgilerin kalıcı olarak silinecek.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Vazgeç
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete} className="gap-1.5">
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Evet, Hesabımı Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
