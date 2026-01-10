import { Suspense } from "react";
import { env } from "cloudflare:workers";
import type { Video } from "@/db/types";
import { VideosClient } from "./VideosClient";

async function getVideos(): Promise<Video[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM videos ORDER BY created_at DESC"
  ).all<Video>();
  return results.results || [];
}

async function VideosList() {
  const videos = await getVideos();
  return <VideosClient videos={videos} />;
}

export function Videos() {
  return (
    <>
      <title>Vidéos | Les Amis de l'Harmonie de Sucy</title>
      <meta name="description" content="Découvrez les vidéos des concerts et événements de l'Harmonie Municipale de Sucy-en-Brie. Retrouvez nos performances musicales en ligne." />
      <meta property="og:title" content="Vidéos | Les Amis de l'Harmonie de Sucy" />
      <meta property="og:description" content="Découvrez les vidéos des concerts et événements de l'Harmonie Municipale de Sucy-en-Brie." />
      <meta property="og:url" content="https://amis-harmonie-sucy.fr/videos" />
      <link rel="canonical" href="https://amis-harmonie-sucy.fr/videos" />
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="font-['Merriweather_Sans'] text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100">
              Vidéos
            </h1>
          </div>

          <Suspense
            fallback={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl aspect-video animate-pulse" />
                ))}
              </div>
            }
          >
            <VideosList />
          </Suspense>
        </div>
      </div>
    </>
  );
}
