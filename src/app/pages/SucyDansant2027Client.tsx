"use client";

import { useEffect, useState } from "react";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import { ArrowRight } from "lucide-react";

export function SucyDansant2027Video({ id, title }: { id: string; title: string }) {
  return (
    <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-xl ring-1 ring-black/10">
      <LiteYouTubeEmbed
        id={id}
        title={title}
        announce="Regarder"
        poster="maxresdefault"
        noCookie={true}
      />
    </div>
  );
}

interface StickyBookingBarProps {
  bookingUrl: string;
  dateLabel: string;
  /** Id de l'élément du hero : la barre apparaît quand il sort de l'écran. */
  heroTargetId: string;
  /** Id de la section finale : la barre disparaît quand elle est visible. */
  endTargetId: string;
}

/** Barre de réservation fixe, mobile uniquement, affichée une fois le hero dépassé. */
export function StickyBookingBar({
  bookingUrl,
  dateLabel,
  heroTargetId,
  endTargetId,
}: StickyBookingBarProps) {
  const [heroVisible, setHeroVisible] = useState(true);
  const [endVisible, setEndVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(heroTargetId);
    const end = document.getElementById(endTargetId);
    const observers: IntersectionObserver[] = [];

    if (hero) {
      const o = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting));
      o.observe(hero);
      observers.push(o);
    }
    if (end) {
      const o = new IntersectionObserver(([entry]) => setEndVisible(entry.isIntersecting));
      o.observe(end);
      observers.push(o);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [heroTargetId, endTargetId]);

  const show = !heroVisible && !endVisible;

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-violet-950/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] text-white shadow-[0_-8px_24px_rgba(0,0,0,0.25)] backdrop-blur transition-transform duration-300 md:hidden ${
        show ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <p className="text-sm leading-tight">
          <span className="block font-bold">Sucy Dansant 2027</span>
          <span className="text-violet-200">{dateLabel}</span>
        </p>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={show ? 0 : -1}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-fuchsia-700 active:scale-95"
        >
          Réserver
          <ArrowRight className="size-4" aria-hidden="true" />
          <span className="sr-only"> (s'ouvre sur HelloAsso, dans un nouvel onglet)</span>
        </a>
      </div>
    </div>
  );
}
