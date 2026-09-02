import { SITE_URL } from "@/constants/site";

/**
 * Plain-text robots.txt without Access-Control-Allow-Origin.
 *
 * Replaces the App Router `MetadataRoute.Robots` file (`app/robots.ts`),
 * which was served with `Access-Control-Allow-Origin: *` and failed the
 * domain-provider CORS scan. Cross-origin browser reads of robots.txt are
 * not required, so no ACAO header is set.
 */
export function GET() {
  const body = [
    "User-Agent: *",
    "Allow: /",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Explicitly omit Access-Control-Allow-Origin (no wildcard, no reflect).
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
