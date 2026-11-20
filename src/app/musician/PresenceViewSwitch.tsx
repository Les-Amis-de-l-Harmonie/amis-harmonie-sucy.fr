"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export type PresenceView = "list" | "table";

interface PresenceViewSwitchProps {
  view: PresenceView;
  onChange: (view: PresenceView) => void;
  listLabel: string;
  tableLabel: string;
}

export const PRESENCE_TAB_IDS = {
  list: "presence-tab-list",
  table: "presence-tab-table",
} as const;

export const PRESENCE_PANEL_IDS = {
  list: "presence-panel-list",
  table: "presence-panel-table",
} as const;

/** Contrôle segmenté « Mes réponses | Tableau », avec la navigation aux flèches des onglets. */
export function PresenceViewSwitch({
  view,
  onChange,
  listLabel,
  tableLabel,
}: PresenceViewSwitchProps) {
  const refs = useRef<Record<PresenceView, HTMLButtonElement | null>>({ list: null, table: null });
  const tabs: Array<{ value: PresenceView; label: string }> = [
    { value: "list", label: listLabel },
    { value: "table", label: tableLabel },
  ];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: PresenceView | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      next = view === "list" ? "table" : "list";
    } else if (event.key === "Home") {
      next = "list";
    } else if (event.key === "End") {
      next = "table";
    }
    if (next === null) return;
    event.preventDefault();
    onChange(next);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Affichage des prestations"
      onKeyDown={handleKeyDown}
      className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
    >
      {tabs.map((tab) => {
        const selected = view === tab.value;
        return (
          <button
            key={tab.value}
            ref={(node) => {
              refs.current[tab.value] = node;
            }}
            type="button"
            role="tab"
            id={PRESENCE_TAB_IDS[tab.value]}
            aria-selected={selected}
            // Seul le panneau affiché existe dans la page : on ne référence que celui-là.
            aria-controls={selected ? PRESENCE_PANEL_IDS[tab.value] : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cn(
              "min-h-11 cursor-pointer truncate rounded-lg px-2 text-center text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              selected
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
