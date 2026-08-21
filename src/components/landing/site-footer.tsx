import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/terms", label: "Kullanım Şartları" },
  { href: "/privacy", label: "Gizlilik Politikası" },
  { href: "/kvkk", label: "KVKK Aydınlatma Metni" },
  { href: "/cookies", label: "Çerez Politikası" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-12">
        <div className="flex flex-col gap-1">
          <span className="text-brand-gradient text-base font-extrabold tracking-tight">Ludex</span>
          <p className="text-sm text-muted-foreground">
            AI destekli akıllı yarışma rapor değerlendirme platformu
          </p>
        </div>
        <nav
          aria-label="Yasal bağlantılar"
          className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"
        >
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-border/60 py-4">
        <p className="mx-auto max-w-6xl px-6 text-center text-xs text-muted-foreground md:px-12">
          © {new Date().getFullYear()} Ludex. Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}
