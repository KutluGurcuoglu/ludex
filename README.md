# Ludex

Ludex, TEKNOFEST değerlendirme süreçlerinde rapor ön kontrolü, yapay zekâ destekli analiz, kriter bazlı ön değerlendirme ve yarışmacı geri bildirimi sağlayan **human-in-the-loop karar destek sistemidir**.

> **AI nihai karar vermez; nihai karar hakemdedir.** Ludex AI, hakemin kendi değerlendirmesini yapmasına yardımcı olan bir ön analiz/karar desteği üretir — puanlama, eleme ve sonuç kararı her zaman hakeme aittir.

## Problem 4 MVP Yetenekleri

- Otomatik rapor dili tespiti
- Güncel rapor şablonu uygunluk kontrolü
- Zorunlu başlık ve içerik analizi
- Kategori uygunluğu analizi
- Başvurular arasında yüksek benzerlik tespiti
- Kriter bazlı "AI 4. göz" değerlendirmesi
- Kanıt/sayfa/alıntı doğrulama (AI'nın öne sürdüğü her alıntı, raporun gerçek metnine karşı sunucuda doğrulanır)
- Güçlü yönler, geliştirilmesi gereken alanlar ve öneriler
- Admin tarafından AI analiz sürecini başlatma/takip
- Hakemin nihai değerlendirmesi
- Değerlendirme yayınlandıktan sonra yarışmacı geri bildirimi

## Roller

| Rol | Internal değer | Açıklama |
|---|---|---|
| Yarışma & Değerlendirme Yöneticisi | `admin` | Kategori, şartname, rapor şablonu, kriter yönetimi; rapor havuzu, hakem ataması, AI analiz takibi |
| Hakem / Değerlendirici | `judge` | Kendisine atanan raporları AI ön analizi eşliğinde inceler, nihai puanı ve kararı verir |
| Yarışmacı | `contestant` | Rapor yükler; değerlendirme yayınlandıktan sonra geri bildirimini görür |

> **Not:** MVP'de Yarışma Yöneticisi ve Değerlendirme Yöneticisi aynı `admin` yetki grubu altında konsolide edilmiştir.

## Teknoloji Yığını

- **Next.js 15** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4**, Radix UI primitives, `lucide-react`
- **Zustand** — istemci tarafı state
- **NextAuth v5 (beta)** — Credentials provider, JWT session
- **Prisma** + **PostgreSQL**
- **Cloudflare Workers AI** — rapor değerlendirme ve şablon analizi (gerçek LLM çağrıları)
- **Cloudflare R2** — dosya depolama (yerelde tanımlı değilse dosya sistemi tabanlı depolamaya düşer)
- **LlamaParse** (opsiyonel) — PDF metin çıkarma (tanımlı değilse yerel `pdfjs-dist` tabanlı gerçek bir çıkarıcıya düşer)
- **Vitest** — test, **ESLint** — lint
- **Docker Compose** — yerel PostgreSQL + Mailpit altyapısı

## Kurulum

```bash
npm install        # veya: npm ci

cp .env.example .env   # değerleri kendi ortamınıza göre düzenleyin

npm run infra:up       # yerel PostgreSQL + Mailpit (Docker)

npx prisma generate
npx prisma migrate deploy
npx prisma db seed

npm run dev
```

Yerel Docker altyapısı hakkında ayrıntı için `docs/backend-development.md`.

## Test, Build, Lint

```bash
npm test
npm run build
npm run lint
```

## Demo Girişi

Giriş ekranındaki Admin / Hakem / Yarışmacı tek-tık demo butonları, **gerçek NextAuth kimlik doğrulamasını** seed'lenmiş hesaplarla tetikler — mock oturum veya auth bypass değildir. Seed sonrası kullanılabilecek hesaplar (yalnızca yerel geliştirme verisidir, gerçek bir secret değildir):

| Rol | E-posta | Şifre |
|---|---|---|
| Yarışma & Değerlendirme Yöneticisi | `admin@ludex.com` | `demo1234` |
| Hakem | `elif.yilmaz@ludex.com` | `demo1234` |
| Yarışmacı | `mehmet.ozturk@example.com` | `demo1234` |
