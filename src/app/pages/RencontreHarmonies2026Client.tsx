"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import { isEventClosed } from "@/lib/free-events";
import type { FreeEventConfig } from "@/lib/free-events";

interface StickyReserveBarProps {
  event: FreeEventConfig;
  /** Id du bouton « Je réserve » du hero : la barre apparaît quand il sort de l'écran. */
  heroTargetId: string;
  /** Id de la section du formulaire : la barre disparaît quand elle est visible. */
  formTargetId: string;
}

const subscribeNone = () => () => {};

/** Barre de réservation fixe, mobile uniquement, affichée une fois le hero dépassé. */
export function StickyReserveBar({ event, heroTargetId, formTargetId }: StickyReserveBarProps) {
  const [heroVisible, setHeroVisible] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const closed = useSyncExternalStore(
    subscribeNone,
    () => isEventClosed(event),
    () => false
  );

  useEffect(() => {
    const hero = document.getElementById(heroTargetId);
    const form = document.getElementById(formTargetId);
    // Le pied de page est lui aussi libre : la barre ne doit pas le recouvrir.
    const footer = document.querySelector("footer");
    const observers: IntersectionObserver[] = [];

    if (hero) {
      const o = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting));
      o.observe(hero);
      observers.push(o);
    }
    if (form) {
      const o = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting));
      o.observe(form);
      observers.push(o);
    }
    if (footer) {
      const o = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting));
      o.observe(footer);
      observers.push(o);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [heroTargetId, formTargetId]);

  const show = !heroVisible && !formVisible && !footerVisible && !closed;

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t-2 border-white/20 bg-gradient-to-r from-[#b82a1b] to-[#7c0e37] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] text-white transition-transform duration-300 md:hidden ${
        show
          ? "translate-y-0 shadow-[0_-8px_24px_rgba(43,11,18,0.35)]"
          : "pointer-events-none translate-y-full"
      }`}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <p className="text-sm leading-tight">
          <span className="block font-bold">{event.title}</span>
          <span className="block text-white/90 first-letter:uppercase">{event.dateShortLabel}</span>
        </p>
        <a
          href={`#${formTargetId}`}
          tabIndex={show ? 0 : -1}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#7c0e37] shadow-lg transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Je réserve
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
