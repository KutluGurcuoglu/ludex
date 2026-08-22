import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";

export const metadata: Metadata = {
  title: "Kullanım Şartları · Ludex",
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Kullanım Şartları"
      updatedAt="21 Ağustos 2026"
      backHref="/login?tab=register"
      backLabel="Kayıt formuna dön"
    >
      <section>
        <h2>1. Taraflar ve Kapsam</h2>
        <p>
          Bu Kullanım Şartları, Ludex platformunu (&quot;Platform&quot;) kullanan yarışmacılar,
          hakemler ve yöneticiler (&quot;Kullanıcı&quot;) ile Platform sağlayıcısı arasındaki
          ilişkiyi düzenler.
          Platform&apos;a kayıt olarak veya Platform&apos;u kullanarak bu şartları kabul etmiş
          sayılırsınız.
        </p>
      </section>

      <section>
        <h2>2. Hesap Oluşturma ve Sorumluluklar</h2>
        <p>
          Hesap oluştururken verdiğiniz bilgilerin doğru, güncel ve eksiksiz olması gerekir.
          Hesabınızın güvenliğinden ve hesabınız üzerinden gerçekleştirilen tüm işlemlerden siz
          sorumlusunuz. Şifrenizi üçüncü kişilerle paylaşmamalı, şüpheli bir erişim fark ettiğinizde
          bize bildirmelisiniz.
        </p>
      </section>

      <section>
        <h2>3. Rapor Gönderimi ve İçerik Sorumluluğu</h2>
        <p>
          Yarışmacı olarak Platform&apos;a yüklediğiniz raporların size ait olduğunu, üçüncü
          kişilerin fikri mülkiyet haklarını ihlal etmediğini ve ilgili yarışmanın şartnamesine
          uygun olduğunu beyan edersiniz. Yüklenen içeriğin doğruluğundan ve özgünlüğünden tamamen
          siz sorumlusunuz.
        </p>
      </section>

      <section>
        <h2>4. Hakem Değerlendirme Süreci</h2>
        <p>
          Hakemler, kendilerine atanan raporları tarafsız ve iyi niyetle değerlendirmeyi kabul eder.
          Platform üzerindeki AI destekli analiz araçları yalnızca karar destek amaçlıdır; nihai
          değerlendirme ve puanlama kararı her zaman ilgili hakeme aittir.
        </p>
      </section>

      <section>
        <h2>5. Fikri Mülkiyet</h2>
        <p>
          Platform&apos;un tasarımı, yazılımı ve marka unsurları Ludex&apos;e aittir. Yarışmacıların
          yüklediği rapor içerikleri üzerindeki fikri mülkiyet hakları yarışmacıda kalır; Platform
          bu içerikleri yalnızca değerlendirme sürecini yürütmek amacıyla işler.
        </p>
      </section>

      <section>
        <h2>6. Hizmetin Değiştirilmesi ve Sonlandırılması</h2>
        <p>
          Platform, hizmetlerini önceden haber vererek veya vermeksizin değiştirme, askıya alma
          veya sonlandırma hakkını saklı tutar. Şartlara aykırı davranan hesaplar uyarılmaksızın
          kısıtlanabilir.
        </p>
      </section>

      <section>
        <h2>7. Sorumluluğun Sınırlandırılması</h2>
        <p>
          Platform, mevcut haliyle (&quot;olduğu gibi&quot;) sunulur. AI destekli analizlerin ve otomatik
          hesaplamaların kesintisiz veya hatasız olacağı garanti edilmez; bu araçlar hakemin
          kararının yerine geçmez.
        </p>
      </section>

      <section>
        <h2>8. Uyuşmazlıkların Çözümü</h2>
        <p>
          Bu şartlardan doğabilecek uyuşmazlıklarda Türkiye Cumhuriyeti mevzuatı uygulanır ve
          Türkiye mahkemeleri ile icra daireleri yetkilidir.
        </p>
      </section>

      <section>
        <h2>9. Değişiklikler</h2>
        <p>
          Bu şartlar zaman zaman güncellenebilir. Önemli değişiklikler Platform üzerinden
          duyurulur; güncellemelerden sonra Platform&apos;u kullanmaya devam etmeniz yeni şartları
          kabul ettiğiniz anlamına gelir.
        </p>
      </section>
    </LegalPageLayout>
  );
}
