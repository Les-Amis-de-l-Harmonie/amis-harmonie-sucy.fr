import { Suspense } from "react";
import { env } from "cloudflare:workers";
import { EventCard } from "../components/EventCard";
import type { Event } from "@/db/types";

async function getUpcomingEvents(): Promise<Event[]> {
  const today = new Date().toISOString().split("T")[0];
  const results = await env.DB.prepare(
    "SELECT * FROM events WHERE date >= ? AND reservation_link IS NOT NULL ORDER BY date ASC"
  ).bind(today).all<Event>();
  return results.results || [];
}

async function EventsList() {
  const events = await getUpcomingEvents();

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">
          Aucun évènement avec billetterie disponible pour le moment.
        </p>
        <p className="text-gray-500 mt-2">Revenez bientôt !</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

export function Billetterie() {
  return (
    <>
      <title>Billetterie | Les Amis de l'Harmonie de Sucy</title>
      <meta name="description" content="Réservez vos places pour les concerts et événements de l'Harmonie Municipale de Sucy-en-Brie. Billetterie en ligne sécurisée." />
      <meta property="og:title" content="Billetterie | Les Amis de l'Harmonie de Sucy" />
      <meta property="og:description" content="Réservez vos places pour les concerts et événements de l'Harmonie Municipale de Sucy-en-Brie." />
      <meta property="og:url" content="https://amis-harmonie-sucy.fr/billetterie" />
      <link rel="canonical" href="https://amis-harmonie-sucy.fr/billetterie" />
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="font-['Merriweather_Sans'] text-4xl md:text-5xl font-bold text-[#101828]">
              Billetterie
            </h1>
          </div>

          <Suspense
            fallback={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-100 rounded-xl h-96 animate-pulse" />
                ))}
              </div>
            }
          >
            <EventsList />
          </Suspense>
        </div>
      </div>
    </>
  );
}
