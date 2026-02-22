import { Suspense } from "react";
import { env } from "cloudflare:workers";
import type { Publication } from "@/db/types";
import { PublicationsClient } from "./PublicationsClient";
import { ScrollReveal } from "@/app/components/ScrollReveal";

async function getPublications(): Promise<Publication[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM publications ORDER BY publication_date DESC, created_at DESC"
  ).all<Publication>();
  return results.results || [];
}

async function PublicationsList() {
  const publications = await getPublications();
  return <PublicationsClient publications={publications} />;
}

export function Publications() {
  return (
    <>
      <title>Publications Instagram | Les Amis de l'Harmonie de Sucy</title>
      <meta
        name="description"
        content="Suivez l'actualité de l'Harmonie Municipale de Sucy-en-Brie sur Instagram. Photos, vidéos et moments forts de nos événements musicaux."
      />
      <meta property="og:title" content="Publications Instagram | Les Amis de l'Harmonie de Sucy" />
      <meta
        property="og:description"
        content="Suivez l'actualité de l'Harmonie Municipale de Sucy-en-Brie sur Instagram."
      />
      <meta property="og:url" content="https://amis-harmonie-sucy.fr/publications" />
      <link rel="canonical" href="https://amis-harmonie-sucy.fr/publications" />
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <ScrollReveal>
              <h1 className="font-['Merriweather_Sans'] text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
                Publications
              </h1>
            </ScrollReveal>
          </div>

          <Suspense
            fallback={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-gray-100 dark:bg-gray-800 rounded-xl h-[500px] animate-pulse"
                  />
                ))}
              </div>
            }
          >
            <PublicationsList />
          </Suspense>
        </div>
      </div>
    </>
  );
}
