"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

type PauseReason = "hover" | "focus" | "interaction";

interface UseAutoScrollLoopOptions {
  /** Vitesse de défilement, en pixels par seconde. Reste volontairement lent. */
  speed?: number;
  /** Coupe entièrement la boucle (liste trop courte, `prefers-reduced-motion`, etc.). */
  disabled?: boolean;
  /** Délai avant reprise après une interaction manuelle (molette, glisser, tactile), en ms. */
  resumeDelay?: number;
}

interface UseAutoScrollLoopResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  isPaused: boolean;
  pause: (reason: PauseReason) => void;
  resume: (reason: PauseReason) => void;
}

/**
 * Fait défiler un conteneur horizontalement en boucle continue, en avançant
 * `scrollLeft` via un `setTimeout` rappelé en boucle plutôt qu'en animant une
 * transform CSS : le défilement automatique et le défilement natif (molette,
 * trackpad, glisser, flèches clavier) passent par le même mécanisme et ne se
 * battent donc jamais l'un contre l'autre. (`setTimeout`/`clearTimeout` sont
 * utilisés plutôt que `requestAnimationFrame` uniquement parce que ce sont
 * les seuls globals de boucle déjà déclarés dans `eslint.config.js` — un
 * cadencement à ~30 im/s reste largement suffisant pour un mouvement aussi
 * lent.) Le contenu doit être dupliqué par l'appelant (deuxième moitié =
 * clone `aria-hidden`) pour que le rebouclage à `scrollWidth / 2` soit
 * invisible.
 *
 * Conformité WCAG 2.2.2 ("Pause, Stop, Hide") : la boucle est en pause tant
 * qu'au moins une "raison" est active (survol, focus clavier, interaction en
 * cours) et ne reprend que lorsque plus aucune raison n'est active — voir
 * `pause` / `resume`, à appeler depuis les gestionnaires `onMouseEnter` /
 * `onFocus` etc. du composant appelant.
 */
export function useAutoScrollLoop<T extends HTMLElement>({
  speed = 20,
  disabled = false,
  resumeDelay = 2000,
}: UseAutoScrollLoopOptions = {}): UseAutoScrollLoopResult<T> {
  const ref = useRef<T | null>(null);
  const reasons = useRef<Set<PauseReason>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const pause = useCallback((reason: PauseReason) => {
    reasons.current.add(reason);
    setIsPaused(true);
  }, []);

  const resume = useCallback((reason: PauseReason) => {
    reasons.current.delete(reason);
    if (reasons.current.size === 0) setIsPaused(false);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node || disabled) return;

    // ~30 images/seconde : bien assez pour un défilement lent et calme, et
    // ça évite d'introduire `requestAnimationFrame` (non déclaré côté ESLint).
    const FRAME_MS = 32;
    let tickTimer: ReturnType<typeof setTimeout> | undefined;
    let lastTime = Date.now();
    let resumeTimer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;
      if (!isPausedRef.current) {
        const half = node.scrollWidth / 2;
        if (half > 0) {
          node.scrollLeft += (speed * delta) / 1000;
          if (node.scrollLeft >= half) {
            node.scrollLeft -= half;
          }
        }
      }
      tickTimer = setTimeout(tick, FRAME_MS);
    };

    const handleInteractionStart = () => {
      pause("interaction");
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => resume("interaction"), resumeDelay);
    };

    node.addEventListener("pointerdown", handleInteractionStart);
    node.addEventListener("wheel", handleInteractionStart, { passive: true });
    node.addEventListener("touchstart", handleInteractionStart, { passive: true });

    tickTimer = setTimeout(tick, FRAME_MS);

    return () => {
      if (tickTimer) clearTimeout(tickTimer);
      if (resumeTimer) clearTimeout(resumeTimer);
      node.removeEventListener("pointerdown", handleInteractionStart);
      node.removeEventListener("wheel", handleInteractionStart);
      node.removeEventListener("touchstart", handleInteractionStart);
    };
  }, [disabled, pause, resume, resumeDelay, speed]);

  return { ref, isPaused, pause, resume };
}
