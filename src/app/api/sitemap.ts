import { SITE_URL } from "@/app/seo";

export function sitemapHandler(): Response {
  const now = new Date().toISOString();

  // Pages statiques avec priorité et fréquence
  const staticPages = [
    { path: "/", priority: "1.0", changefreq: "weekly" },
    { path: "/about", priority: "0.8", changefreq: "monthly" },
    { path: "/harmonie", priority: "0.8", changefreq: "monthly" },
    { path: "/the-dansant", priority: "0.9", changefreq: "weekly" },
    { path: "/billetterie", priority: "0.8", changefreq: "weekly" },
    { path: "/videos", priority: "0.7", changefreq: "weekly" },
    { path: "/publications", priority: "0.7", changefreq: "weekly" },
    { path: "/livre-or", priority: "0.6", changefreq: "daily" },
    { path: "/adhesion", priority: "0.8", changefreq: "monthly" },
    { path: "/partenaires", priority: "0.6", changefreq: "monthly" },
    { path: "/contact", priority: "0.7", changefreq: "monthly" },
    { path: "/legal", priority: "0.3", changefreq: "yearly" },
  ];

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const page of staticPages) {
    sitemap += `  <url>\n`;
    sitemap += `    <loc>${SITE_URL}${page.path}</loc>\n`;
    sitemap += `    <lastmod>${now}</lastmod>\n`;
    sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
    sitemap += `    <priority>${page.priority}</priority>\n`;
    sitemap += `  </url>\n`;
  }

  sitemap += `</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
