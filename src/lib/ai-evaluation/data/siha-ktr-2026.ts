import type { EvaluationCriterion, ReportTemplate } from "../schema";

export const sihaKtrCategory = "Sabit Kanat" as const;

export const sihaKtrTemplate = {
  sections: [
    {
      id: "sistem-tanimi",
      title: "1.1 Sistem Tanımı",
      expectedContent:
        "Sistemin görev tanımı ve özellikleri; Yer Kontrol İstasyonu, Yer Anteni, Kumanda, Hava Aracı gibi genel sistemi oluşturan bileşenlerin tanımları ve sistem içerisindeki görevleri.",
    },
    {
      id: "sistem-performans",
      title: "1.2 Sistem Nihai Performans Özellikleri",
      expectedContent:
        "Nihai hava aracı performans değerleri; kanat açıklığı, seyir hızı, kalkış ağırlığı, tutunma hızı, haberleşme menzili ve uçuş süresi gibi değerler. Performans değerlerinin tablo halinde verilmesi beklenir.",
    },
    {
      id: "takim-organizasyonu",
      title: "2.1 Takım Organizasyonu",
      expectedContent:
        "Takım organizasyon şeması ve birimlerin görevleri. Ekip üyelerinin isim veya fotoğraf gibi kişisel bilgileri rapora dahil edilmemelidir.",
    },
    {
      id: "zaman-butce",
      title: "2.2 Zaman Akış Çizelgesi ve Bütçe",
      expectedContent:
        "Planlanan ve gerçekleşen zaman akışındaki farklar ile tahmini ve gerçekleşen bütçe arasındaki farklar.",
    },
    {
      id: "3b-tasarim",
      title: "3.1 Hava Aracının Üç Boyutlu Tasarımı",
      expectedContent:
        "Hava aracının boyutları, alt sistemlerin araç içi yerleşimleri ve güvenlik için kullanılan sigortanın konumunu gösteren tasarım/görseller.",
    },
    {
      id: "ucak-performans-ozeti",
      title: "3.2 Hava Aracı Performans Özeti",
      expectedContent:
        "Bir müsabaka turundaki uçuş süresi hesaplamaları ve aerodinamik/yapısal analizler gibi yapılan analizler.",
    },
    {
      id: "sistem-mimarisi",
      title: "3.3 Nihai Sistem Mimarisi ve Alt Sistemler Özeti",
      expectedContent:
        "Nihai sistem mimarisi, donanımların marka/model bilgileri, güç ve haberleşme hatları, sistem mimarisi görseli, alt sistemlerin teknik özellikleri ve uyumlulukları, ürün seçim gerekçeleri ve RF frekans bandı seçim gerekçeleri.",
    },
    {
      id: "agirlik-dagilimi",
      title: "3.4 Hava Aracı Ağırlık Dağılımı",
      expectedContent:
        "Alt sistem seviyesinde ağırlık dağılımı, parçaların ağırlıkları, referans noktasına göre konumları ve kanat ucuna göre ağırlık merkezi.",
    },
    {
      id: "otonom-kilitlenme",
      title: "4.1 Otonom Kilitlenme",
      expectedContent:
        "Sunucudan gelen verilerin değerlendirilmesi, takip edilecek rakibin seçimi, rakibe yaklaşma yöntemi, nesne tespit ve takip algoritmalarının seçimi/geliştirilmesi, alternatif yöntemlerle avantaj/dezavantaj karşılaştırması, görüntü hatasına karşı duruş ve hız kontrolünün nasıl yapılacağı.",
    },
    {
      id: "kamikaze-gorevi",
      title: "4.2 Kamikaze Görevi",
      expectedContent:
        "İntikal, dalış ve pas geçme fazları; duruş kontrolcüleri; yapısal dayanım; QR hedefinin tespiti; QR verisinin sunucuya aktarılması; görüntü bozulmalarına karşı önlemler ve kameranın QR hedefini okuyabildiği irtifa.",
    },
    {
      id: "hava-savunma",
      title: "5. Hava Savunma Sistemi",
      expectedContent:
        "Hava savunma sistemi aktifken yasaklı alanlardan kaçınma yöntemi; kullanılacaksa otonom kaçış/rota planlama algoritmaları, kullanılmayacaksa operatörün uygulayacağı kaçınma adımları.",
    },
    {
      id: "yki-haberlesme-arayuz",
      title: "6. Yer Kontrol İstasyonu, Haberleşme ve Kullanıcı Arayüzü",
      expectedContent:
        "Hava aracı ile YKİ arasındaki haberleşme; anten frekansları, protokoller, haberleşme donanımları, görüntü aktarımı, modem/router ve yarışma sunucusu iletişimi; haberleşme diyagramı; arayüz üzerinde hız, yükseklik, mod, kilitlenme dörtgeni, hava savunma sistemleri, uçuş sınırları ve rakip araçların gösterimi.",
    },
    {
      id: "yapisal-mekanik-entegrasyon",
      title: "7.1 Yapısal ve Mekanik Entegrasyon",
      expectedContent:
        "Hava aracının üretimi/birleştirilmesi, yapısal bütünlük, montaj ve hareketli parçaların sabitlenmesi; görsellerle desteklenmesi.",
    },
    {
      id: "elektronik-entegrasyon",
      title: "7.2 Elektronik Entegrasyon",
      expectedContent:
        "Sensör, aviyonik, aktüatör, kamera ve batarya gibi elektroniklerin yerleşimi ve sabitlenmesi; kablolar/konnektörler; toprak ve sigorta bağlantıları; görsel destek.",
    },
    {
      id: "alt-sistem-testleri",
      title: "8.1 Alt Sistem Testleri",
      expectedContent:
        "Yapılan veya yapılması planlanan alt sistem testleri. Her test ayrı alt başlık olarak verilmelidir.",
    },
    {
      id: "ucus-kontrol-listesi",
      title: "8.2 Uçuş Kontrol Listesi ve Uçuş Listesi",
      expectedContent:
        "Uçuş öncesi kontrol listesi; gerçekleştirilen uçuş testleri ve sonuçları; test yapılmadıysa planlanan testlerin sayısı, amacı ve beklenen çıktıları.",
    },
    {
      id: "gorev-testleri",
      title: "8.3 Görev Testleri",
      expectedContent:
        "Yarışma görevlerine ilişkin testler ve sonuçları; algoritma testlerinde kullanılan simülasyon ortamları; SITL/HITL gibi yöntemler; test yöntemleri, uygulama adımları ve sonuçları.",
    },
    {
      id: "guvenlik",
      title: "9. Güvenlik",
      expectedContent:
        "Muhtemel riskler, bu risklere karşı önlemler ve acil durumda izlenecek kontrol adımları.",
    },
    {
      id: "referanslar",
      title: "10. Referanslar",
      expectedContent: "Raporda kullanılan kaynakların referansları.",
    },
  ],
} satisfies ReportTemplate;

export const sihaKtrEvaluationCriteria = [
  {
    id: "temel-sistem-ozeti",
    name: "Temel Sistem Özeti",
    description:
      "Rapor şablonundaki '1.1 Sistem Tanımı' ve '1.2 Sistem Nihai Performans Özellikleri' bölümlerinin içerik kalitesini ve eksiksizliğini değerlendirir.",
    maxScore: 5,
  },
  {
    id: "organizasyon-ozeti",
    name: "Organizasyon Özeti",
    description:
      "Rapor şablonundaki '2.1 Takım Organizasyonu' ve '2.2 Zaman Akış Çizelgesi ve Bütçe' bölümlerinin içerik kalitesini ve eksiksizliğini değerlendirir.",
    maxScore: 4,
  },
  {
    id: "detayli-tasarim-ozeti",
    name: "Detaylı Tasarım Özeti",
    description:
      "Rapor şablonundaki '3.1 Hava Aracının Üç Boyutlu Tasarımı', '3.2 Hava Aracı Performans Özeti', '3.3 Nihai Sistem Mimarisi ve Alt Sistemler Özeti' ve '3.4 Hava Aracı Ağırlık Dağılımı' bölümlerinin içerik kalitesini ve eksiksizliğini değerlendirir.",
    maxScore: 15,
  },
  {
    id: "otonom-gorevler",
    name: "Otonom Görevler",
    description:
      "Rapor şablonundaki '4.1 Otonom Kilitlenme' ve '4.2 Kamikaze Görevi' bölümlerinin içerik kalitesini ve eksiksizliğini değerlendirir.",
    maxScore: 25,
  },
  {
    id: "hava-savunma-sistemi",
    name: "Hava Savunma Sistemi",
    description:
      "Rapor şablonundaki '5. Hava Savunma Sistemi' bölümünün içerik kalitesini ve eksiksizliğini değerlendirir.",
    maxScore: 5,
  },
  {
    id: "yki-haberlesme-arayuz",
    name: "Yer Kontrol İstasyonu, Haberleşme ve Kullanıcı Arayüzü",
    description:
      "Rapor şablonundaki '6. Yer Kontrol İstasyonu, Haberleşme ve Kullanıcı Arayüzü' bölümünün içerik kalitesini ve eksiksizliğini değerlendirir.",
    maxScore: 12,
  },
  {
    id: "hava-araci-entegrasyonu",
    name: "Hava Aracı Entegrasyonu",
    description:
      "Rapor şablonundaki '7.1 Yapısal ve Mekanik Entegrasyon' ve '7.2 Elektronik Entegrasyon' bölümlerinin içerik kalitesini ve eksiksizliğini değerlendirir.",
    maxScore: 10,
  },
  {
    id: "test-ve-simulasyon",
    name: "Test ve Simülasyon",
    description:
      "Rapor şablonundaki '8.1 Alt Sistem Testleri', '8.2 Uçuş Kontrol Listesi ve Uçuş Listesi' ve '8.3 Görev Testleri' bölümlerinin içerik kalitesini ve eksiksizliğini değerlendirir.",
    maxScore: 15,
  },
  {
    id: "guvenlik",
    name: "Güvenlik",
    description:
      "Rapor şablonundaki '9. Güvenlik' bölümünün içerik kalitesini ve eksiksizliğini değerlendirir.",
    maxScore: 5,
  },
  {
    id: "rapor-duzeni",
    name: "Rapor Düzeni",
    description:
      "Raporun genel biçim ve düzenine uygunluğunu değerlendirir: akademik rapor standardına uygunluk; İçindekiler bölümünün ve '10. Referanslar' bölümünün rapor içinde bulunması; kapak sayfası bulunması; ardışık sayfa numaralandırması; kapak sayfası hariç alt bilgide (footer) takım adı ve sayfa numarasının yer alması; üst bilgide (header) şablonda belirtilen yarışma adının yer alması; Arial 12 punto kullanımı; 1.15 satır aralığı; iki tarafa yaslı (justified) metin; A4 sayfa boyutu; 2.5 cm kenar boşlukları; raporun toplamda en fazla 25 sayfa olması; geçmiş yıl raporlarından yapılan alıntılarda belirtilen alıntı formatının kullanılması. Kaynak 2026 KTR şablonunda üst bilgi metni 'Savaşan İHA Yarışması 2025' olarak geçmektedir; bu, kaynak dokümandaki muhtemel bir yıl tutarsızlığı olarak kabul edilip Ludex 2026 değerlendirmesi için 'Savaşan İHA Yarışması 2026' olarak normalize edilmiştir. Not: Arial 12, 1.15 satır aralığı, iki yana yaslama, A4 sayfa boyutu, 2.5 cm kenar boşlukları, üst/alt bilgi içeriği gibi görsel biçim özellikleri yalnızca düz reportContent metninden güvenilir şekilde doğrulanamayabilir; AI bu tür özellikleri doğrulayamadığında uydurmamalı, ilgili criteriaEvaluations kaydının reason alanında bu sınırlılığı açıkça belirtmelidir.",
    maxScore: 4,
  },
] satisfies EvaluationCriterion[];
