import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    globalNotFound: true,
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
