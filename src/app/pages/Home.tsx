import { Suspense } from "react";
import { env } from "cloudflare:workers";
import { EventCard } from "../components/EventCard";
import { HomeSlideshow } from "./HomeClient";
import type { Event } from "@/db/types";
import { getGalleryImages } from "@/app/shared/gallery";
import { isEventPast } from "@/lib/dates";
import { ScrollReveal } from "@/app/components/ScrollReveal";

async function getEvents(): Promise<{ upcoming: Event[]; past: Event[] }> {
  const results = await env.DB.prepare("SELECT * FROM events ORDER BY date ASC").all<Event>();

  const events = results.results || [];
  return {
    upcoming: events.filter((e) => !isEventPast(e.date)),
    past: events.filter((e) => isEventPast(e.date)).reverse(),
  };
}

async function HeroSection() {
  const slideshowImages = await getGalleryImages("home_slideshow");

  return (
    <section className="relative py-16 pb-0 pt-4 lg:pt-0 overflow-hidden">
      <img
        src="/images/banner-bg-shape.svg"
        alt=""
        className="absolute bottom-0 left-0 z-[-1] w-full dark:opacity-20"
      />
      <div className="mx-auto max-w-[1320px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:px-8 gap-8">
          <ScrollReveal className="mt-12 text-center lg:mt-0 lg:text-left order-2 lg:order-1 flex flex-col justify-center">
            <div>
              <span className="font-bold text-gray-800 dark:text-gray-200 lg:text-[55px]">
                Les amis de
              </span>
              <h1 className="font-['Merriweather_Sans'] font-bold text-gray-900 dark:text-white text-4xl md:text-5xl leading-[1] lg:text-[72px]">
                l'Harmonie de <span style={{ whiteSpace: "nowrap" }}>Sucy-en-Brie</span>
              </h1>
            </div>
            <p className="mt-4 px-4 text-gray-600 dark:text-gray-400">
              <i>
                "Tel qu'il s'est forgé à travers les siècles, l'orchestre représente une des grandes
                conquêtes du monde civilisé. Il doit être soutenu et développé pour le bien de
                l'humanité, car la Musique contribue à la communication et à la compréhension entre
                les peuples."
              </i>
              <span className="ml-2 text-primary font-medium">Riccardo Muti</span>
            </p>
            <div className="py-4">
              <a
                href="/about"
                className="inline-flex items-center justify-center px-8 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary-dark transition-colors"
              >
                En savoir plus
              </a>
            </div>
          </ScrollReveal>
          <div className="h-[360px] w-full lg:h-[640px] pt-4 order-1 lg:order-2">
            <div className="relative w-[360px] lg:w-full h-full mx-auto overflow-hidden">
              <HomeSlideshow images={slideshowImages} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

async function EventsSection() {
  const { upcoming, past } = await getEvents();

  return (
    <section id="evenements" className="py-8">
      <div className="mx-auto max-w-[1320px] flex flex-col gap-8">
        {upcoming.length > 0 && (
          <div className="mb-16">
            <ScrollReveal>
              <h2 className="font-['Merriweather_Sans'] text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
                Évènements à venir
              </h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 px-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {upcoming.map((event, index) => (
                <ScrollReveal key={event.id} delay={index * 80} className="h-full">
                  <EventCard event={event} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <ScrollReveal>
              <h2 className="font-['Merriweather_Sans'] text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
                Évènements passés
              </h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 px-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {past.map((event, index) => (
                <ScrollReveal key={event.id} delay={index * 80} className="h-full">
                  <EventCard event={event} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        )}

        {upcoming.length === 0 && past.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Aucun évènement pour le moment. Revenez bientôt !
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function EventsLoading() {
  return (
    <section className="py-16 bg-white dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mx-auto mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl h-96"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Home() {
  return (
    <>
      <title>Les Amis de l'Harmonie de Sucy-en-Brie</title>
      <meta
        name="description"
        content="Association Les Amis de l'Harmonie de Sucy-en-Brie - Soutenez l'Harmonie Municipale, participez à nos événements musicaux et rejoignez notre communauté."
      />
      <meta property="og:title" content="Les Amis de l'Harmonie de Sucy-en-Brie" />
      <meta
        property="og:description"
        content="Association Les Amis de l'Harmonie de Sucy-en-Brie - Soutenez l'Harmonie Municipale, participez à nos événements musicaux."
      />
      <meta property="og:url" content="https://amis-harmonie-sucy.fr/" />
      <link rel="canonical" href="https://amis-harmonie-sucy.fr/" />
      <HeroSection />
      <Suspense fallback={<EventsLoading />}>
        <EventsSection />
      </Suspense>
    </>
  );
}
