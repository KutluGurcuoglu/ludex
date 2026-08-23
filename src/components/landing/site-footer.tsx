"use client";

import Link from "next/link";
import { Check, ChevronDown, Globe, Link2, Mail, MessageCircle, Share2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FEATURE_LINKS,
  ROLE_LINKS,
  RESOURCE_TOP_LINK,
  RESOURCE_GROUP,
  type FooterLink,
  type FooterGroup,
} from "@/components/landing/nav-links";

const SOCIAL_LINKS = [
  { href: "#", label: "E-posta", icon: Mail },
  { href: "#", label: "Topluluk", icon: MessageCircle },
  { href: "#", label: "Paylaş", icon: Share2 },
  { href: "#", label: "Diğer bağlantılar", icon: Link2 },
];

function FooterLinkRow({ link }: { link: FooterLink }) {
  return (
    <Link key={link.href + link.label} href={link.href} className="w-fit text-sm text-zinc-400 transition-colors hover:text-white">
      {link.label}
    </Link>
  );
}

function FooterGroupRow({ group }: { group: FooterGroup }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-zinc-400">{group.label}</span>
      <div className="flex flex-col gap-2 pl-1">
        {group.children.map((child) => (
          <Link
            key={child.href + child.label}
            href={child.href}
            className="flex w-fit items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <span className="text-zinc-600" aria-hidden>
              └
            </span>
            {child.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function LanguagePill() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <Globe className="size-4" />
          Türkçe
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem disabled className="justify-between">
          <span className="flex items-center gap-2">
            <Check className="size-4" />
            Türkçe
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="justify-between text-muted-foreground">
          English
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">Yakında</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black text-zinc-300">
      {/* DESKTOP — column grid */}
      <div className="mx-auto hidden max-w-6xl px-6 py-16 md:grid md:grid-cols-[1.3fr_1fr_1fr_1fr] md:gap-10 md:px-12">
        <div className="flex flex-col gap-4">
          <span className="text-lg font-extrabold tracking-tight text-white">Ludex</span>
          <p className="max-w-xs text-sm leading-relaxed text-zinc-400">
            AI destekli akıllı yarışma rapor değerlendirme platformu. Nihai kararı her zaman
            hakem verir.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-base font-semibold text-white">Özellikler</p>
          <nav className="flex flex-col gap-2.5">
            {FEATURE_LINKS.map((link) => (
              <FooterLinkRow key={link.href + link.label} link={link} />
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-base font-semibold text-white">Paneller</p>
          <nav className="flex flex-col gap-2.5">
            {ROLE_LINKS.map((link) => (
              <FooterLinkRow key={link.href + link.label} link={link} />
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-base font-semibold text-white">Kaynaklar</p>
          <nav aria-label="Yasal bağlantılar" className="flex flex-col gap-3">
            <FooterLinkRow link={RESOURCE_TOP_LINK} />
            <FooterGroupRow group={RESOURCE_GROUP} />
          </nav>
        </div>
      </div>

      {/* MOBILE — brand + accordion columns */}
      <div className="mx-auto flex flex-col gap-2 px-6 py-10 md:hidden">
        <span className="text-lg font-extrabold tracking-tight text-white">Ludex</span>
        <p className="mb-4 max-w-xs text-sm leading-relaxed text-zinc-400">
          AI destekli akıllı yarışma rapor değerlendirme platformu.
        </p>

        <Accordion type="multiple">
          <AccordionItem value="features" className="border-white/10">
            <AccordionTrigger className="text-base font-semibold text-white hover:no-underline">
              Özellikler
            </AccordionTrigger>
            <AccordionContent>
              <nav className="flex flex-col gap-3">
                {FEATURE_LINKS.map((link) => (
                  <FooterLinkRow key={link.href + link.label} link={link} />
                ))}
              </nav>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="roles" className="border-white/10">
            <AccordionTrigger className="text-base font-semibold text-white hover:no-underline">
              Paneller
            </AccordionTrigger>
            <AccordionContent>
              <nav className="flex flex-col gap-3">
                {ROLE_LINKS.map((link) => (
                  <FooterLinkRow key={link.href + link.label} link={link} />
                ))}
              </nav>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="resources" className="border-white/10">
            <AccordionTrigger className="text-base font-semibold text-white hover:no-underline">
              Kaynaklar
            </AccordionTrigger>
            <AccordionContent>
              <nav aria-label="Yasal bağlantılar" className="flex flex-col gap-3">
                <FooterLinkRow link={RESOURCE_TOP_LINK} />
                <FooterGroupRow group={RESOURCE_GROUP} />
              </nav>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* BOTTOM BAR */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-6 py-6 sm:flex-row sm:justify-between md:px-12">
          <LanguagePill />

          <div className="flex items-center gap-3">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="flex size-9 items-center justify-center rounded-full border border-white/15 text-zinc-400 transition-colors hover:border-white/40 hover:text-white"
              >
                <s.icon className="size-4" />
              </a>
            ))}
          </div>

          <div className="text-center text-xs text-zinc-500 sm:text-right">
            <p>© {new Date().getFullYear()} Ludex. Tüm hakları saklıdır.</p>
            <p className="mt-0.5">Yarışmacı · Hakem · Yönetici tek platformda</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
