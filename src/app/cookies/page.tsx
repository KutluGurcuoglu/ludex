import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";

export const metadata: Metadata = {
  title: "Çerez Politikası · Ludex",
};

export default function CookiesPage() {
  return (
    <LegalPageLayout title="Çerez Politikası" updatedAt="21 Ağustos 2026">
      <section>
        <h2>1. Çerez Nedir</h2>
        <p>
          Çerezler (cookies), bir web sitesini ziyaret ettiğinizde tarayıcınız aracılığıyla
          cihazınıza kaydedilen küçük metin dosyalarıdır. Ludex, oturumunuzu açık tutmak ve tercih
          ayarlarınızı hatırlamak gibi temel işlevler için benzer teknolojiler (ör. tarayıcı yerel
          depolama alanı) kullanır.
        </p>
      </section>

      <section>
        <h2>2. Kullandığımız Çerez Türleri</h2>
        <ul>
          <li>
            <b>Zorunlu çerezler/depolama:</b> Oturum açma durumunuzu ve temel güvenlik
            önlemlerini sağlamak için gereklidir; bunlar olmadan Platform çalışmaz.
          </li>
          <li>
            <b>İşlevsel depolama:</b> Tema tercihiniz (açık/koyu mod) gibi kişiselleştirme
            ayarlarını hatırlamak için kullanılır.
          </li>
          <li>
            <b>Analitik çerezler:</b> Platform şu an için üçüncü taraf analitik/reklam çerezi
            kullanmamaktadır.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Çerezleri Nasıl Kontrol Edebilirsiniz</h2>
        <p>
          Çoğu tarayıcı, çerezleri kabul etme, reddetme veya silme seçeneği sunar. Tarayıcı
          ayarlarınızdan çerezleri devre dışı bırakabilirsiniz; ancak zorunlu depolama
          engellendiğinde oturum açma gibi temel işlevler çalışmayabilir.
        </p>
      </section>

      <section>
        <h2>4. Değişiklikler</h2>
        <p>
          Bu politika zaman zaman güncellenebilir. Güncel sürüm her zaman bu sayfada yayınlanır.
          Daha fazla bilgi için <Link href="/privacy">Gizlilik Politikası</Link>&apos;nı
          inceleyebilirsiniz.
        </p>
      </section>
    </LegalPageLayout>
  );
}
