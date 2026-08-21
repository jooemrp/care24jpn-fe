import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    globalNotFound: true,
  },
  images: {
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
    // Companion to the localhost entry above, and dev-only for the same
    // reason. Next refuses to proxy an upstream image whose hostname
    // resolves to a private IP (SSRF guard) even when a `remotePatterns`
    // entry matches it, so without this the MinIO media 400s and every
    // image on every page renders broken against a local Atlas. The
    // `NODE_ENV` guard keeps the flag out of the production build, where
    // the only allowed origin is the public S3 bucket.
    ...(process.env.NODE_ENV !== "production" ? { dangerouslyAllowLocalIP: true } : {}),
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
