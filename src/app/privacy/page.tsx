import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";

export const metadata: Metadata = {
  title: "Gizlilik Politikası · Ludex",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Gizlilik Politikası" updatedAt="21 Ağustos 2026">
      <section>
        <h2>1. Toplanan Bilgiler</h2>
        <p>
          Hesap oluştururken ad-soyad, e-posta, telefon numarası gibi temel iletişim bilgilerini;
          hakem başvurusunda unvan, kurum, uzmanlık alanı ve özgeçmiş gibi mesleki bilgileri;
          yarışmacı olarak da gönderdiğiniz rapor dosyalarını ve ilgili kategori bilgisini toplarız.
        </p>
      </section>

      <section>
        <h2>2. Bilgilerin Kullanım Amacı</h2>
        <ul>
          <li>Hesabınızı oluşturmak, doğrulamak ve güvenliğini sağlamak</li>
          <li>Raporları ilgili hakemlere atamak ve değerlendirme sürecini yürütmek</li>
          <li>Başvuru, değerlendirme ve sonuç süreçleriyle ilgili sizi bilgilendirmek</li>
          <li>Platform&apos;u geliştirmek ve teknik sorunları gidermek</li>
        </ul>
      </section>

      <section>
        <h2>3. Bilgilerin Paylaşımı</h2>
        <p>
          Kişisel verileriniz, değerlendirme sürecinin doğası gereği ilgili hakem ve yöneticilerle
          sınırlı olarak paylaşılır. Bilgileriniz, yasal bir zorunluluk olmadıkça üçüncü taraflarla
          pazarlama amacıyla paylaşılmaz veya satılmaz.
        </p>
      </section>

      <section>
        <h2>4. Veri Güvenliği</h2>
        <p>
          Şifreleriniz geri döndürülemez biçimde hash&apos;lenerek saklanır. Verilerinize yalnızca
          yetkili roller (admin, ilgili hakem) erişebilir; erişim, kullanıcının rolüyle sınırlıdır.
        </p>
      </section>

      <section>
        <h2>5. Çerezler</h2>
        <p>
          Platform&apos;un oturum açık tutma gibi temel işlevleri için kullandığı çerezler ve
          benzeri teknolojiler hakkında detaylı bilgiyi{" "}
          <Link href="/cookies">Çerez Politikası</Link> sayfasında bulabilirsiniz.
        </p>
      </section>

      <section>
        <h2>6. Kullanıcı Hakları</h2>
        <p>
          Kişisel verilerinize erişme, düzeltme veya silinmesini talep etme hakkına sahipsiniz.
          Detaylı bilgi için <Link href="/kvkk">KVKK Aydınlatma Metni</Link>&apos;ni inceleyebilir,
          hesap ayarlarınızdan profil bilgilerinizi güncelleyebilir veya hesabınızın silinmesini
          talep edebilirsiniz.
        </p>
      </section>

      <section>
        <h2>7. Veri Saklama Süresi</h2>
        <p>
          Verileriniz, hesabınız aktif olduğu sürece ve yasal saklama yükümlülüklerinin gerektirdiği
          süre boyunca saklanır. Hesap silme talebinizin ardından veriler, yasal zorunluluklar
          dışında makul bir süre içinde silinir veya anonimleştirilir.
        </p>
      </section>

      <section>
        <h2>8. İletişim</h2>
        <p>
          Gizlilikle ilgili sorularınız için destek panelindeki iletişim kanallarını
          kullanabilirsiniz.
        </p>
      </section>
    </LegalPageLayout>
  );
}
