import { Cake, User } from "lucide-react";
import { Skeleton } from "@/app/components/ui/skeleton";
import type { Birthday } from "./musician-types";

interface BirthdaysModuleProps {
  loading: boolean;
  birthdays: Birthday[];
}

const MONTH_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/**
 * Remplace `BirthdaysCard`, sans verrou. Corrige aussi le bug d'hydratation
 * signalé en Phase 2b : l'ancien composant appelait `new Date()` pendant le
 * rendu (`BirthdaysCard.tsx:36`), ce qui pouvait différer entre le rendu
 * serveur et le premier rendu client (fuseau horaire, ou requête à cheval
 * sur un changement de mois) et déclencher une erreur d'hydratation React.
 * L'API fournit désormais les anniversaires des 30 prochains jours ; le
 * composant dérive leur jour et leur mois par découpage de la chaîne ISO,
 * sans calcul de date côté rendu.
 */
export function BirthdaysModule({ loading, birthdays }: BirthdaysModuleProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <Cake className="h-5 w-5 text-primary" aria-hidden="true" />
        <h3 className="font-heading text-base font-bold text-foreground">
          {birthdays.length === 1 ? "Prochain anniversaire" : "Prochains anniversaires"}
        </h3>
      </div>

      {loading ? (
        <div className="mt-3 space-y-2" aria-hidden="true">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ) : birthdays.length === 0 ? (
        <p className="mt-2 flex-1 text-sm text-muted-foreground">
          Aucun anniversaire dans les 30 prochains jours.
        </p>
      ) : (
        <div className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1">
          {birthdays.map((b, i) => {
            const day = b.date_of_birth.slice(8, 10);
            const month = MONTH_NAMES[Number(b.date_of_birth.slice(5, 7)) - 1];
            const name = [b.first_name, b.last_name].filter(Boolean).join(" ") || "Musicien";
            return (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
                {b.avatar ? (
                  <img
                    src={b.avatar}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full border border-primary/30 object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{name}</p>
                </div>
                <span
                  className={`shrink-0 whitespace-nowrap text-xs ${
                    b.days_until === 0 ? "font-medium text-primary" : "text-muted-foreground"
                  }`}
                >
                  {b.days_until === 0 ? "aujourd'hui" : `${day} ${month}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
