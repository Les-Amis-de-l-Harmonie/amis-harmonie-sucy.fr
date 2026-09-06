"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileSectionMeta } from "./profile-validation";

interface ProfileSectionNavProps {
  sections: ProfileSectionMeta[];
  completion: Record<string, boolean>;
}

/**
 * Sommaire de progression, colonne d'ancres à gauche — uniquement à partir
 * de `md:` (768px, tablette comprise). Sous ce seuil, l'espace manque : la
 * barre de progression compacte de `MusicianProfile.tsx` prend le relais.
 */
export function ProfileSectionNav({ sections, completion }: ProfileSectionNavProps) {
  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav
      aria-label="Sections du profil"
      className="hidden md:sticky md:top-24 md:block md:w-56 md:shrink-0 md:self-start"
    >
      <ul className="space-y-1">
        {sections.map((section) => {
          const done = completion[section.id];
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60",
                  done ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="truncate">{section.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
