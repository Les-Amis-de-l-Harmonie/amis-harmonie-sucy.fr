import { Suspense } from "react";
import { env } from "cloudflare:workers";
import type { GuestbookEntry } from "@/db/types";
import { LivreOrClient } from "./LivreOrClient";

async function getGuestbookEntries(): Promise<GuestbookEntry[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM guestbook ORDER BY created_at DESC"
  ).all<GuestbookEntry>();
  return results.results || [];
}

async function GuestbookList() {
  const entries = await getGuestbookEntries();
  return <LivreOrClient entries={entries} />;
}

export function LivreOr() {
  return (
    <>
      <title>Livre d'Or | Les Amis de l'Harmonie de Sucy</title>
      <meta name="description" content="Découvrez les témoignages de notre public et partagez votre expérience avec l'Harmonie Municipale de Sucy-en-Brie." />
      <meta property="og:title" content="Livre d'Or | Les Amis de l'Harmonie de Sucy" />
      <meta property="og:description" content="Découvrez les témoignages de notre public et partagez votre expérience." />
      <meta property="og:url" content="https://amis-harmonie-sucy.fr/livre-or" />
      <link rel="canonical" href="https://amis-harmonie-sucy.fr/livre-or" />
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="font-['Merriweather_Sans'] text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100">
              Livre d'Or
            </h1>
          </div>

          <Suspense
            fallback={
              <div className="max-w-2xl mx-auto space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl h-32 animate-pulse" />
                ))}
              </div>
            }
          >
            <GuestbookList />
          </Suspense>
        </div>
      </div>
    </>
  );
}
