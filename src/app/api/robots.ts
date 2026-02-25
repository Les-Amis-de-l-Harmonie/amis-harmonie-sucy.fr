import { SITE_URL } from "@/app/seo";

export function robotsHandler(): Response {
  const robots = `# Robots.txt for ${SITE_URL}
# Dernière mise à jour: ${new Date().toISOString()}

User-agent: *
Allow: /

# Pages privées (à ne pas indexer)
Disallow: /admin/
Disallow: /musician/
Disallow: /api/
Disallow: /login/
Disallow: /*?action=

# Sitemap
Sitemap: ${SITE_URL}/sitemap.xml

# Crawl-delay (optionnel)
Crawl-delay: 1
`;

  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
