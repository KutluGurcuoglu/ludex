import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni · Ludex",
};

export default function KvkkPage() {
  return (
    <LegalPageLayout
      title="KVKK Aydınlatma Metni"
      updatedAt="21 Ağustos 2026"
      backHref="/login?tab=register"
      backLabel="Kayıt formuna dön"
    >
      <section>
        <p>
          İşbu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu&apos;nun
          (&quot;KVKK&quot;) 10. maddesi uyarınca, Ludex Platformu (&quot;Platform&quot;) tarafından
          veri sorumlusu sıfatıyla işlenen kişisel verileriniz hakkında sizi bilgilendirmek
          amacıyla hazırlanmıştır.
        </p>
      </section>

      <section>
        <h2>1. Veri Sorumlusu</h2>
        <p>
          Kişisel verileriniz, veri sorumlusu sıfatıyla Ludex Platformu tarafından, aşağıda
          açıklanan kapsamda işlenmektedir.
        </p>
      </section>

      <section>
        <h2>2. Kişisel Verilerin Hangi Amaçla İşleneceği</h2>
        <p>
          Ad-soyad, T.C. kimlik numarası (yalnızca beyan edilmesi halinde), iletişim bilgileri,
          eğitim/görev bilgileri ve yüklediğiniz rapor içerikleri gibi kişisel verileriniz;
          hesabınızın oluşturulması ve doğrulanması, yarışma başvurularının ve hakem
          değerlendirme süreçlerinin yürütülmesi, sonuçların ilgili taraflara bildirilmesi ve
          Platform güvenliğinin sağlanması amaçlarıyla işlenmektedir.
        </p>
      </section>

      <section>
        <h2>3. İşlenen Kişisel Verilerin Kimlere ve Hangi Amaçla Aktarılabileceği</h2>
        <p>
          Kişisel verileriniz, yalnızca değerlendirme sürecinin gerektirdiği ölçüde ilgili hakemlere
          ve yönetici kullanıcılara aktarılabilir. Yasal bir yükümlülüğün varlığı halinde yetkili
          kamu kurum ve kuruluşlarıyla paylaşılabilir. Verileriniz ticari amaçla üçüncü kişilerle
          paylaşılmaz.
        </p>
      </section>

      <section>
        <h2>4. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi</h2>
        <p>
          Kişisel verileriniz, kayıt ve başvuru formları aracılığıyla elektronik ortamda
          tarafınızca doğrudan sağlanmaktadır. Veriler; bir sözleşmenin kurulması ve ifası, hukuki
          yükümlülüğün yerine getirilmesi ve açık rızanızın bulunması hukuki sebeplerine dayanarak
          işlenmektedir.
        </p>
      </section>

      <section>
        <h2>5. KVKK&apos;nın 11. Maddesinde Sayılan Haklarınız</h2>
        <ul>
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>İşlenmişse buna ilişkin bilgi talep etme</li>
          <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
          <li>Yurt içinde/yurt dışında aktarıldığı üçüncü kişileri bilme</li>
          <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
          <li>
            KVKK&apos;da öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme
          </li>
          <li>Düzeltme/silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
          <li>
            İşlenen verilerin münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize
            bir sonucun ortaya çıkmasına itiraz etme
          </li>
          <li>Kanuna aykırı işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
        </ul>
      </section>

      <section>
        <h2>6. Başvuru Yöntemi</h2>
        <p>
          Yukarıda sayılan haklarınızı kullanmak için talebinizi hesap ayarlarınızdaki destek
          kanalı üzerinden veya Platform&apos;un iletişim bilgileri aracılığıyla iletebilirsiniz.
          Talepleriniz, niteliğine göre en kısa sürede ve en geç 30 gün içinde
          sonuçlandırılır.
        </p>
      </section>
    </LegalPageLayout>
  );
}
