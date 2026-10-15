import type { ReactNode } from "react";

/**
 * Typographie d'affichage : évite les coupures de ligne disgracieuses sans changer le texte.
 * - un mot avec trait d'union (« Sucy-en-Brie ») n'est jamais coupé ;
 * - un espace insécable précède « : ; ? ! » (règle française) ;
 * - les `tail` derniers mots restent collés (évite un mot seul à la ligne, ex. « 15h »).
 */
export function tidy(text: string, tail = 0): ReactNode[] {
  const words = text.split(" ");
  const nodes: ReactNode[] = [];

  words.forEach((word, index) => {
    if (index > 0) {
      const glued = /^[:;?!»]$/.test(word) || (tail > 0 && index >= words.length - tail);
      nodes.push(glued ? "\u00a0" : " ");
    }
    if (word.includes("-") && word.length > 3) {
      nodes.push(
        <span key={`${word}-${index}`} className="whitespace-nowrap">
          {word}
        </span>
      );
    } else {
      nodes.push(word);
    }
  });

  return nodes;
}

/** Variante pour un libellé simple (une chaîne, sans composants) : espaces insécables seulement. */
export function nbspPunctuation(text: string): string {
  return text.replace(/ ([:;?!»])/g, "\u00a0$1");
}
