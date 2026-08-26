export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterGroup {
  label: string;
  children: FooterLink[];
}

export const FEATURE_LINKS: FooterLink[] = [
  { label: "Nasıl Çalışır", href: "/#nasil-calisir" },
  { label: "Kanıtlı Değerlendirme", href: "/#kanit" },
  { label: "Karar Yetkisi", href: "/#karar-yetkisi" },
  { label: "Hakem Paneli", href: "/#panel" },
];

export const ROLE_LINKS: FooterLink[] = [
  { label: "Yarışmacı Girişi", href: "/login" },
  { label: "Hakem Girişi", href: "/login" },
  { label: "Yönetici Girişi", href: "/login" },
];

export const RESOURCE_TOP_LINK: FooterLink = { label: "Kullanım Şartları", href: "/terms" };

export const RESOURCE_GROUP: FooterGroup = {
  label: "Gizlilik & Veri",
  children: [
    { label: "Gizlilik Politikası", href: "/privacy" },
    { label: "KVKK Aydınlatma Metni", href: "/kvkk" },
    { label: "Çerez Politikası", href: "/cookies" },
  ],
};
