import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    globalNotFound: true,
  },
  images: {
    // Bypass Vercel Image Optimization (`/_next/image`). That path returns
    // 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED once the plan quota is
    // exhausted — blank hero/icons on prod, worse on mobile (uncached widths).
    // With this flag, next/image still handles layout/sizes/priority but the
    // browser fetches /images/* or Atlas S3 URLs directly.
    unoptimized: true,
    // Every image on the site now comes from an Atlas `image` field, and Atlas
    // hands back the media's public S3 URL (its delivery API expands the media
    // id before responding). Without this allow-list `next/image` answers 400
    // for those URLs and the page renders with no images at all.
    //
    // Host and path are not guessed — they are the bucket and key prefix of
    // media actually uploaded to this workspace
    // (`<prefix>/media/<YYYY>/<MM>/<uuidv7>-<name><ext>`, prefix `care-24`).
    // The month is part of the key, so the pattern must NOT pin `2026/08`:
    // media uploaded next month lands under a new folder.
    //
    // Anything that is not an http(s) URL never reaches this config at all —
    // `features/cms/fields.ts#pickImage` rejects it and serves the file
    // bundled in `public/images/` instead.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "horizoon.s3.ap-southeast-1.amazonaws.com",
        pathname: "/care-24/media/**",
      },
      // Local development only: a MinIO instance backing an Atlas dev
      // workspace serves media from http://localhost:9000 (see
      // `features/cms/fields.test.ts`'s `pickImage` case). Guarded so
      // production keeps exactly one allowed origin. Host and path prefix
      // intentionally mirror the S3 entry above rather than being
      // generalised — narrowing is what stops a wrong/compromised media URL
      // from being proxied through /_next/image.
      ...(process.env.NODE_ENV !== "production"
        ? [
            {
              protocol: "http" as const,
              hostname: "localhost",
              port: "9000",
              pathname: "/care-24/media/**",
            },
          ]
        : []),
    ],
    // S3 for this workspace sometimes resolves via NAT64 / private-looking
    // addresses (64:ff9b::…) on local and some corporate networks. Next's
    // SSRF guard then 400s every `/_next/image` proxy even though the host is
    // already allow-listed above. Keep the flag on — the pathname + hostname
    // remotePatterns still bound what can be fetched.
    dangerouslyAllowLocalIP: true,
  },
  // Domain-provider scan on www.care24.jp: X-Frame-Options / nosniff / CSP
  // were missing, and /robots.txt shipped Access-Control-Allow-Origin: *.
  // Applied here (Vercel/Next), not Apache/Nginx. CSP keeps 'unsafe-inline'
  // for style + script because the app uses React style={{}} and inline
  // JSON-LD; 'unsafe-eval' is intentionally omitted.
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob: https://horizoon.s3.ap-southeast-1.amazonaws.com",
      "font-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
  // /terms (Care Supporter doc) is retired but already indexed publicly —
  // send both locales to their new home instead of 404ing. `redirects()`
  // runs before proxy.ts's i18n rewrite (see docs), so this fires first and
  // the browser's follow-up request to the destination goes through the
  // normal proxy pipeline. Sources are literal/exact paths (no wildcard), so
  // this cannot also match "/terms-for-users" or "/terms-for-care-supporters".
  async redirects() {
    return [
      {
        source: "/terms",
        destination: "/terms-for-care-supporters",
        permanent: true,
      },
      {
        source: "/en/terms",
        destination: "/en/terms-for-care-supporters",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
