import { env } from "cloudflare:workers";
import type { Event, Video, Publication } from "@/db/types";

const SITE_URL = "https://amis-harmonie-sucy.fr";

const staticRoutes = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/about", priority: "0.8", changefreq: "monthly" },
  { path: "/harmonie", priority: "0.8", changefreq: "monthly" },
  { path: "/partenaires", priority: "0.6", changefreq: "monthly" },
  { path: "/contact", priority: "0.7", changefreq: "monthly" },
  { path: "/billetterie", priority: "0.9", changefreq: "weekly" },
  { path: "/the-dansant", priority: "0.9", changefreq: "weekly" },
  { path: "/videos", priority: "0.8", changefreq: "weekly" },
  { path: "/publications", priority: "0.8", changefreq: "weekly" },
  { path: "/livre-or", priority: "0.6", changefreq: "monthly" },
  { path: "/adhesion", priority: "0.8", changefreq: "monthly" },
];

export async function generateSitemap(): Promise<string> {
  const now = new Date().toISOString();

  let xml = '<?xml version="1.0" encoding="UTF-8"?\u003e\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\u003e\n';

  // Static routes
  for (const route of staticRoutes) {
    xml += `  <url\u003e\n`;
    xml += `    <loc>${SITE_URL}${route.path}</loc\u003e\n`;
    xml += `    <lastmod>${now}</lastmod\u003e\n`;
    xml += `    <priority>${route.priority}</priority\u003e\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq\u003e\n`;
    xml += `  </url\u003e\n`;
  }

  try {
    // Dynamic events
    const events = await env.DB.prepare(
      "SELECT id, updated_at FROM events WHERE date >= date('now') ORDER BY date DESC"
    ).all<Event>();

    for (const event of events.results || []) {
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}/#evenements</loc>\n`;
      xml += `    <lastmod>${event.created_at || now}</lastmod>\n`;
      xml += `    <priority>0.9</priority>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic videos
    const videos = await env.DB.prepare(
      "SELECT id, updated_at FROM videos ORDER BY created_at DESC LIMIT 50"
    ).all<Video>();

    for (const video of videos.results || []) {
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}/videos</loc>\n`;
      xml += `    <lastmod>${video.created_at || now}</lastmod>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic publications
    const publications = await env.DB.prepare(
      "SELECT id, updated_at FROM publications ORDER BY date DESC LIMIT 50"
    ).all<Publication>();

    for (const pub of publications.results || []) {
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}/publications</loc>\n`;
      xml += `    <lastmod>${pub.publication_date || now}</lastmod>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `  </url>\n`;
    }
  } catch {
    // Continue with static routes only if DB fails
  }

  xml += "</urlset>";
  return xml;
}
