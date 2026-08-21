# Yerel Backend Geliştirme Altyapısı

Bu doküman, Ludex için Aşama 2'de eklenen yerel Docker altyapısını (PostgreSQL +
Mailpit) nasıl kullanacağınızı anlatır. Bu aşamada yalnızca altyapı servisleri
container'a alınmıştır — **Next.js uygulaması Docker'a alınmamıştır**, host
makinede `npm run dev` ile çalışmaya devam eder.

## Ön koşul: .env dosyanızı oluşturun

Gerçek `.env` dosyası repoya commit edilmez. Örnek dosyadan türetin:

```bash
cp .env.example .env
```

Bu projede yerel geliştirme için **tek ortak dosya olarak `.env`** kullanılır:

- **Docker Compose**, proje kökündeki `.env` dosyasını varsayılan olarak
  otomatik yükler — ayrı bir `--env-file` belirtmeye gerek yoktur.
- **Next.js** de proje kökündeki `.env` dosyasını okuyabilir (Next.js'in
  yerleşik ortam değişkeni yükleme sırası `.env` dosyasını da kapsar).

Böylece Next.js (`npm run dev`) ve Docker Compose aynı değerleri okur; ayrı
`.env.local` kullanılması önerilmez, çünkü Docker Compose `.env.local`'i
varsayılan olarak okumaz ve bu iki araç farklı değerlerle çalışabilir.

`.env.example` içindeki değerler yalnızca **local development** örnekleridir
(örn. `POSTGRES_PASSWORD`, `AUTH_SECRET`) — gerçek bir secret değildir ve
production'da kullanılmamalıdır.

`.env` dosyası `.gitignore` içindeki `.env*` kuralıyla izlenmez (doğrulama:
`git check-ignore -v .env` → `.gitignore:.env*` eşleşmesi döner); yalnızca
`.env.example` istisna tutulmuştur (`!.env.example`).

## Servisleri başlatma

```bash
npm run infra:up
```

Bu, `docker compose up -d` çalıştırıp PostgreSQL ve Mailpit'i arka planda
başlatır.

## Servislerin durumunu kontrol etme

```bash
npm run infra:status
```

PostgreSQL için `STATUS` sütununda `healthy` görmelisiniz (healthcheck
`pg_isready` ile yapılır). Mailpit için container'ın `Up` durumda olması ve
healthcheck'inin `healthy` dönmesi beklenir (imajın kendi yerleşik
`mailpit readyz` komutu kullanılır).

Canlı logları izlemek için:

```bash
npm run infra:logs
```

## PostgreSQL bağlantı adresi

Host makinede çalışan Next.js uygulaması PostgreSQL'e şu adresten bağlanır:

```
localhost:5433
```

(Container içinde PostgreSQL her zaman standart `5432` portunu dinler; host
tarafında `5433` kullanılmasının nedeni, bilgisayarınızda zaten başka bir
PostgreSQL kurulu olabilmesi ve `5432`'nin dolu olma ihtimalidir.)

`.env.example`'daki `DATABASE_URL` bu adresi zaten yansıtır:

```
postgresql://ludex_dev:ludex_dev_only_change_me@localhost:5433/ludex_dev?schema=public
```

Portu değiştirmek isterseniz `.env`'de `POSTGRES_PORT` değerini güncelleyin —
`compose.yaml` bu değeri `${POSTGRES_PORT:-5433}` ile okur, sabit kodlanmamıştır.

## Mailpit web arayüzü

Geliştirme sırasında gönderilen tüm e-postalar gerçek bir alıcıya gitmez,
Mailpit tarafından yakalanır ve şu adresten görüntülenebilir:

```
http://localhost:8025
```

Uygulamanın SMTP olarak bağlanacağı adres ise `localhost:1025`'tir
(`MAIL_HOST` / `MAIL_PORT`). Mailpit varsayılan olarak kimlik doğrulama
istemez; bu yüzden `.env.example`'da `MAIL_USER` / `MAIL_PASSWORD` boş
bırakılmıştır.

## Servisleri durdurma

```bash
npm run infra:down
```

Bu yalnızca container'ları durdurur — **volume'a dokunmaz**, PostgreSQL
verisi korunur.

## Verileri silmeden yeniden başlatma

```bash
npm run infra:down
npm run infra:up
```

PostgreSQL verisi `ludex_postgres_data` adlı named volume içinde tutulduğu
için container'lar yeniden oluşturulsa bile veri kaybolmaz. Verinin tamamen
silinmesi gereken (ör. şemayı sıfırdan kurmak istediğiniz) istisnai bir durum
dışında `docker compose down -v` **çalıştırılmamalıdır** — bu, named volume'u
kalıcı olarak siler.

## Named volume neden kullanılıyor?

`compose.yaml` içinde PostgreSQL verisi bir bind mount yerine
**named volume** (`ludex_postgres_data`) üzerinde tutulur. Bunun nedenleri:

- Container silinip yeniden oluşturulduğunda (imaj güncellemesi, `docker
  compose up` ile yeniden başlatma vb.) veri host dosya sistemine bağımlı
  olmadan Docker tarafından yönetilir ve korunur.
- Host işletim sistemi dosya izinleri / yol farklılıklarından (macOS,
  Linux, WSL) etkilenmez — ekip üyeleri arasında tutarlı davranış sağlar.
- Yanlışlıkla proje klasörünü temizleyen bir komutun (`git clean`, IDE
  "temizle" eylemleri vb.) veritabanını silme riski ortadan kalkar.

## Next.js neden bu aşamada Docker dışında çalışıyor?

Bu aşamanın kapsamı yalnızca **altyapı** servisleridir (veritabanı, e-posta
test sunucusu). Uygulamanın kendisini de container'a almak şu noktalarda
gereksiz sürtünme yaratırdı:

- Aktif geliştirme sırasında `npm run dev`'in host'ta çalışması, dosya
  değişikliklerinde Next.js'in kendi hot-reload mekanizmasının (Turbopack)
  hiçbir ek volume-mount/senkronizasyon katmanı olmadan doğrudan çalışmasını
  sağlar.
- Auth, Prisma şeması ve AI modülleri henüz bu aşamada değişmiyor; uygulamayı
  container'a almak bu aşamanın kapsamını gereksiz yere genişletirdi.
- Uygulamanın container'a alınması, ayrı bir Dockerfile, build stratejisi ve
  ortam değişkeni enjeksiyonu kararı gerektirir — bu, ilerideki bir aşamada
  (production'a hazırlık) ayrıca ele alınacak bir konudur.

## Port özeti

| Servis              | Container portu | Host portu (varsayılan) | Env değişkeni      |
|---------------------|:---------------:|:------------------------:|---------------------|
| PostgreSQL          | 5432             | 5433                     | `POSTGRES_PORT`     |
| Mailpit SMTP        | 1025             | 1025                     | `MAILPIT_SMTP_PORT` |
| Mailpit Web UI       | 8025             | 8025                     | `MAILPIT_WEB_PORT`  |
