import { formatDateLong } from "@/lib/dates";

/** La date limite est considérée comme proche dans les deux semaines : ce seuil
 * correspond à l'alerte du serveur pour la carte de planning. */
export const CLOSE_DEADLINE_DAYS = 14;

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function getDeadlineTone(
  deadline: string | null,
  answered: boolean
): { label: string; tone: "muted" | "warning" | "danger" } {
  if (!deadline) {
    return { label: "Pas de date limite fixée", tone: "muted" };
  }

  const today = todayIso();
  const diffDays = daysBetween(today, deadline);
  const label = formatDateLong(deadline);

  if (diffDays < 0) {
    return {
      label: `Date limite dépassée (${label})`,
      tone: answered ? "muted" : "danger",
    };
  }

  if (answered) {
    return { label: `Date limite : ${label}`, tone: "muted" };
  }

  if (diffDays <= CLOSE_DEADLINE_DAYS) {
    return { label: `À répondre avant le ${label}`, tone: "warning" };
  }

  return { label: `À répondre avant le ${label}`, tone: "muted" };
}
