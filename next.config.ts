import type { NextConfig } from "next";

// Content-Security-Policy bilerek eklenmedi: uygulamanın kullandığı tüm
// inline script/style/font kaynaklarının tam bir denetimi olmadan yanlış
// bir CSP, siteyi kırar (bkz. güvenlik incelemesi notları) — bu, canlı
// tarayıcı testiyle ayrıca doğrulanması gereken bir takip maddesi.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
