import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { cn } from "@/lib/utils";
import { totalAttention, type AttentionCounts } from "./families";

const LINES: { key: keyof AttentionCounts; label: string }[] = [
  { key: "minorsWithoutGuardian", label: "Mineurs sans responsable" },
  { key: "missingBirthDate", label: "Dates de naissance manquantes" },
  { key: "managedWithoutGuardian", label: "Comptes gérés sans responsable" },
  { key: "adultsStillLinked", label: "Majeurs encore reliés à un responsable" },
];

/** Carte « À vérifier » du tableau de bord : les compteurs de la page Familles. */
export function AttentionCard({ counts }: { counts: AttentionCounts }) {
  const total = totalAttention(counts);
  return (
    <a href="/admin/familles?vue=a-verifier" className="block group" data-testid="attention-card">
      <Card
        className={cn(
          "border-2 transition-all group-hover:shadow-xl group-hover:border-primary/30",
          total > 0
            ? "border-amber-200 dark:border-amber-900"
            : "border-emerald-100 dark:border-emerald-900"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">À vérifier</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Familles et dates de naissance (rappel des 18 ans)
            </p>
          </div>
          <div
            className={cn(
              "shrink-0 rounded-xl p-2.5",
              total > 0 ? "bg-amber-100 dark:bg-amber-900/40" : "bg-emerald-100 dark:bg-emerald-900"
            )}
          >
            {total > 0 ? (
              <ClipboardCheck
                className="h-6 w-6 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
            ) : (
              <CheckCircle2
                className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">Rien à signaler.</p>
          ) : (
            <ul className="space-y-1.5">
              {LINES.map(({ key, label }) => (
                <li key={key} className="flex items-center justify-between gap-3 text-sm">
                  <span className={counts[key] > 0 ? "text-foreground" : "text-muted-foreground"}>
                    {label}
                  </span>
                  <span
                    className={cn(
                      "min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums",
                      counts[key] > 0
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {counts[key]}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs font-medium text-foreground underline underline-offset-2 group-hover:text-primary">
            Ouvrir la page Familles
          </p>
        </CardContent>
      </Card>
    </a>
  );
}
