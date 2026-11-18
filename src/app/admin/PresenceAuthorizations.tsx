"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Printer,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Skeleton } from "@/app/components/ui/skeleton";
import { formatDateFrench } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { buildFamiliesModel, type GuardianLink, type PrintRow } from "./families";
import {
  entryName,
  errorMessage,
  fetchGuardianLinks,
  postAuthorization,
  type GuardianLinkEntry,
} from "./guardians-client";
import {
  AUTHORIZATION_STATE_LABELS,
  authorizationState,
  countAuthorizations,
  describeAuthorization,
  describeAuthorizedBy,
  formatAuthorizedDay,
  type AuthorizationState,
  type PresenceAuthorization,
} from "./presence-authorization";
import { PRINT_PAGE_CSS } from "./print-styles";
import type { UserWithProfile } from "./users-shared";

// --- Types structurels (ceux de PresenceAdmin y sont compatibles) -------------------

export interface AuthorizationEvent {
  id: number;
  title: string;
  date: string;
  parentalAuthorizationRequired?: boolean;
  authorizationDetails?: string | null;
}

export interface AuthorizationMember {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  answers: Record<string, { authorization?: PresenceAuthorization | null } | undefined>;
  /** Variante possible de l'API : autorisations indexées par événement, hors des réponses. */
  authorizations?: Record<string, PresenceAuthorization | null | undefined>;
}

/** Une seule fonction lit l'autorisation d'un musicien : adapter ici si la forme de l'API change. */
export function getAuthorization(
  member: AuthorizationMember,
  eventId: number
): PresenceAuthorization | null {
  const key = String(eventId);
  return member.answers[key]?.authorization ?? member.authorizations?.[key] ?? null;
}

function memberName(member: AuthorizationMember): string {
  return [member.firstName, member.lastName].filter(Boolean).join(" ") || `Membre ${member.userId}`;
}

// --- Repère dans la grille ----------------------------------------------------------

const STATE_TONE: Record<AuthorizationState, string> = {
  authorized: "text-green-600 dark:text-green-400",
  outdated: "text-orange-600 dark:text-orange-400",
  missing: "text-amber-600 dark:text-amber-400",
};

export function AuthorizationIcon({
  authorization,
  className,
}: {
  authorization: PresenceAuthorization;
  className?: string;
}) {
  const state = authorizationState(authorization);
  const Icon =
    state === "authorized" ? ShieldCheck : state === "outdated" ? ShieldAlert : ShieldQuestion;
  return <Icon className={cn(STATE_TONE[state], className)} aria-hidden="true" />;
}

// --- Panneau de la boîte de modification d'une case ---------------------------------

interface AuthorizationPanelProps {
  event: AuthorizationEvent;
  member: AuthorizationMember;
  authorization: PresenceAuthorization;
  onChanged: (authorization: PresenceAuthorization) => void;
}

export function AuthorizationPanel({
  event,
  member,
  authorization: initial,
  onChanged,
}: AuthorizationPanelProps) {
  const selectId = useId();
  // L'état affiché vit ici : la boîte de dialogue parente garde sa cible d'origine.
  const [authorization, setAuthorization] = useState(initial);
  const state = authorizationState(authorization);
  const [mode, setMode] = useState<"idle" | "record" | "revoke">("idle");
  const [guardians, setGuardians] = useState<GuardianLinkEntry[] | null>(null);
  const [guardianId, setGuardianId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // La liste des parents ne se charge qu'à l'ouverture du formulaire de saisie papier.
  useEffect(() => {
    if (mode !== "record" || guardians !== null) return;
    let cancelled = false;
    void fetchGuardianLinks(member.userId).then((result) => {
      if (cancelled) return;
      setGuardians(result.ok ? (result.data.guardians ?? []) : []);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, guardians, member.userId]);

  const submit = async (authorize: boolean) => {
    setBusy(true);
    setError(null);
    const chosen = authorize
      ? (guardians ?? []).find((entry) => String(entry.userId) === guardianId)
      : undefined;
    const result = await postAuthorization({
      eventId: event.id,
      childUserId: member.userId,
      authorize,
      ...(chosen ? { guardianUserId: chosen.userId } : {}),
    });
    setBusy(false);
    if (!result.ok) {
      setError(errorMessage(result));
      return;
    }
    setMode("idle");
    const next: PresenceAuthorization = authorize
      ? {
          status: "authorized",
          authorizedBy: chosen
            ? { name: entryName(chosen), relation: chosen.relation, kind: "parent", paper: true }
            : { name: null, relation: null, kind: "admin", paper: true },
          authorizedAt: new Date().toISOString(),
          outdated: false,
        }
      : { status: "missing", authorizedBy: null, authorizedAt: null, outdated: false };
    setAuthorization(next);
    onChanged(next);
  };

  return (
    <section
      className="rounded-lg border border-border p-3 space-y-3"
      aria-label="Autorisation parentale"
      data-testid="authorization-panel"
    >
      <div className="flex items-center gap-2">
        <AuthorizationIcon authorization={authorization} className="w-4 h-4 shrink-0" />
        <h3 className="text-sm font-medium text-foreground">Autorisation parentale</h3>
      </div>
      <p className="text-sm text-foreground">{describeAuthorization(authorization)}</p>

      {state === "outdated" && (
        <p className="text-xs text-orange-700 dark:text-orange-400">
          Les informations données aux parents ont changé depuis cette autorisation. Elle ne couvre
          pas le texte actuel : les parents peuvent la renouveler, ou vous pouvez saisir une
          nouvelle autorisation papier.
        </p>
      )}
      {event.authorizationDetails && (
        <div className="rounded-md bg-muted/40 p-2.5">
          <p className="text-xs font-medium text-muted-foreground">Informations pour les parents</p>
          <p className="mt-1 whitespace-pre-line text-sm text-foreground">
            {event.authorizationDetails}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          {state !== "authorized" && (
            <Button type="button" size="sm" variant="outline" onClick={() => setMode("record")}>
              Enregistrer une autorisation papier
            </Button>
          )}
          {state !== "missing" && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setMode("revoke")}>
              Retirer l&apos;autorisation
            </Button>
          )}
        </div>
      )}

      {mode === "record" && (
        <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
          <div className="grid gap-2">
            <Label htmlFor={selectId}>Responsable qui a signé (facultatif)</Label>
            {guardians === null ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <select
                id={selectId}
                value={guardianId}
                onChange={(event) => setGuardianId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Non précisé</option>
                {guardians.map((entry) => (
                  <option key={entry.userId} value={entry.userId}>
                    {entryName(entry)}
                    {entry.relation ? ` (${entry.relation})` : ""}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-muted-foreground">
              L&apos;autorisation est enregistrée comme saisie par un administrateur, à partir
              d&apos;un papier signé.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void submit(true)}>
              {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Enregistrer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setMode("idle")}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {mode === "revoke" && (
        <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-sm text-foreground">
            Retirer l&apos;autorisation de {memberName(member)} pour « {event.title} » ? Les parents
            devront la redonner.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => void submit(false)}
            >
              {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Confirmer le retrait
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setMode("idle")}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

// --- Liste imprimable par événement -------------------------------------------------

interface AuthorizationsListProps {
  event: AuthorizationEvent;
  members: AuthorizationMember[];
  onBack: () => void;
}

interface ListRow {
  member: AuthorizationMember;
  authorization: PresenceAuthorization;
  contact: PrintRow | null;
}

function isLinksPayload(value: unknown): value is { links: GuardianLink[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { links?: unknown }).links)
  );
}

function ParentsCell({ contact }: { contact: PrintRow | null }) {
  if (!contact || contact.guardians.length === 0) {
    return (
      <span className="italic text-muted-foreground print:text-gray-600">Aucun responsable</span>
    );
  }
  return (
    <ul className="space-y-0.5">
      {contact.guardians.map((guardian) => (
        <li key={guardian.name}>
          {guardian.name}
          {guardian.relation && (
            <span className="text-muted-foreground print:text-gray-600">
              {" "}
              ({guardian.relation})
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function PhonesCell({ contact }: { contact: PrintRow | null }) {
  const phones = (contact?.guardians ?? []).map((guardian) => guardian.phone ?? "—");
  if (phones.length === 0) {
    return contact?.emergency?.phone ? (
      <span className="whitespace-nowrap tabular-nums">{contact.emergency.phone}</span>
    ) : (
      <span>—</span>
    );
  }
  return (
    <ul className="space-y-0.5">
      {phones.map((phone, index) => (
        <li key={index} className="whitespace-nowrap tabular-nums">
          {phone}
        </li>
      ))}
    </ul>
  );
}

/** Autorisations parentales d'un événement : manquantes (à relancer) puis reçues. */
export function AuthorizationsList({ event, members, onBack }: AuthorizationsListProps) {
  const [printRows, setPrintRows] = useState<Map<number, PrintRow> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Les téléphones viennent des fiches : on les charge une fois, à l'ouverture de la liste.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [usersResponse, linksResponse] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/guardians"),
        ]);
        if (!usersResponse.ok || !linksResponse.ok) throw new Error("Chargement impossible");
        const users = (await usersResponse.json()) as UserWithProfile[];
        const links: unknown = await linksResponse.json();
        if (!Array.isArray(users) || !isLinksPayload(links)) throw new Error("Réponse inattendue");
        const model = buildFamiliesModel(users, links.links);
        if (!cancelled) setPrintRows(new Map(model.printRows.map((row) => [row.child.id, row])));
      } catch (loadError) {
        console.error("Erreur lors du chargement des coordonnées des parents :", loadError);
        if (!cancelled) setError("Les téléphones des parents n'ont pas pu être chargés.");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const { missing, received, counts } = useMemo(() => {
    const rows: ListRow[] = [];
    for (const member of members) {
      const authorization = getAuthorization(member, event.id);
      if (authorization) {
        rows.push({ member, authorization, contact: printRows?.get(member.userId) ?? null });
      }
    }
    rows.sort((a, b) => memberName(a.member).localeCompare(memberName(b.member), "fr"));
    return {
      missing: rows.filter((row) => authorizationState(row.authorization) === "missing"),
      received: rows.filter((row) => authorizationState(row.authorization) !== "missing"),
      counts: countAuthorizations(rows.map((row) => row.authorization)),
    };
  }, [members, event.id, printRows]);

  return (
    <div className="space-y-5 print:space-y-4" data-testid="authorizations-list">
      <style>{PRINT_PAGE_CSS}</style>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="-ml-3 mb-1 print:hidden"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Retour au tableau
          </Button>
          <h2 className="text-xl font-semibold text-foreground print:text-lg print:text-black">
            Autorisations parentales : {event.title}
          </h2>
          <p className="text-sm text-muted-foreground print:text-gray-700">
            {formatDateFrench(event.date)} · {counts.authorized} autorisée
            {counts.authorized > 1 ? "s" : ""}
            {counts.outdated > 0 ? ` (dont ${counts.outdated} sur un texte antérieur)` : ""} ·{" "}
            {counts.missing} manquante{counts.missing > 1 ? "s" : ""}
          </p>
        </div>
        <Button type="button" onClick={() => window.print()} className="print:hidden">
          <Printer className="mr-2 h-4 w-4" />
          Imprimer
        </Button>
      </div>

      {event.authorizationDetails && (
        <div className="rounded-lg border border-border bg-card p-3 print:rounded-none print:border-gray-400 print:bg-white">
          <p className="text-xs font-medium text-muted-foreground print:text-gray-700">
            Informations données aux parents
          </p>
          <p className="mt-1 whitespace-pre-line text-sm">{event.authorizationDetails}</p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400 print:hidden">
          {error}
        </p>
      )}
      {!printRows && !error && (
        <div className="print:hidden" aria-busy="true">
          <Skeleton className="h-6 w-64" />
        </div>
      )}

      {counts.concerned === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun musicien n&apos;est concerné par cette autorisation pour le moment.
        </p>
      ) : (
        <>
          <section aria-labelledby="authorizations-missing" className="space-y-2">
            <h3
              id="authorizations-missing"
              className="text-base font-semibold text-foreground print:text-black"
            >
              Manquantes ({missing.length})
            </h3>
            {missing.length === 0 ? (
              <p className="text-sm text-green-700 dark:text-green-400 print:text-black">
                Toutes les autorisations sont reçues.
              </p>
            ) : (
              <table className="w-full border-collapse text-sm print:text-xs">
                <thead className="print:table-header-group">
                  <tr className="border-b-2 border-border text-left print:border-black">
                    <th className="px-2 py-2 font-semibold">Musicien</th>
                    <th className="px-2 py-2 font-semibold">Âge</th>
                    <th className="px-2 py-2 font-semibold">Responsable</th>
                    <th className="px-2 py-2 font-semibold">Téléphone</th>
                    <th className="px-2 py-2 font-semibold">Reçue</th>
                  </tr>
                </thead>
                <tbody>
                  {missing.map((row) => (
                    <tr
                      key={row.member.userId}
                      className="align-top border-b border-border print:break-inside-avoid print:border-gray-400"
                    >
                      <td className="px-2 py-1.5 font-medium">{memberName(row.member)}</td>
                      <td className="px-2 py-1.5 tabular-nums">{row.contact?.child.age ?? "?"}</td>
                      <td className="px-2 py-1.5">
                        <ParentsCell contact={row.contact} />
                      </td>
                      <td className="px-2 py-1.5">
                        <PhonesCell contact={row.contact} />
                      </td>
                      <td className="px-2 py-1.5">
                        <span
                          className="inline-block h-4 w-4 rounded-[3px] border border-gray-500"
                          aria-label="À cocher quand l'autorisation est reçue"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section aria-labelledby="authorizations-received" className="space-y-2">
            <h3
              id="authorizations-received"
              className="text-base font-semibold text-foreground print:text-black"
            >
              Reçues ({received.length})
            </h3>
            {received.length === 0 ? (
              <p className="text-sm text-muted-foreground print:text-gray-700">
                Aucune autorisation reçue pour le moment.
              </p>
            ) : (
              <table className="w-full border-collapse text-sm print:text-xs">
                <thead className="print:table-header-group">
                  <tr className="border-b-2 border-border text-left print:border-black">
                    <th className="px-2 py-2 font-semibold">Musicien</th>
                    <th className="px-2 py-2 font-semibold">Âge</th>
                    <th className="px-2 py-2 font-semibold">Donnée</th>
                    <th className="px-2 py-2 font-semibold">Le</th>
                    <th className="px-2 py-2 font-semibold">Remarque</th>
                  </tr>
                </thead>
                <tbody>
                  {received.map((row) => (
                    <tr
                      key={row.member.userId}
                      className="align-top border-b border-border print:break-inside-avoid print:border-gray-400"
                    >
                      <td className="px-2 py-1.5 font-medium">{memberName(row.member)}</td>
                      <td className="px-2 py-1.5 tabular-nums">{row.contact?.child.age ?? "?"}</td>
                      <td className="px-2 py-1.5">
                        {describeAuthorizedBy(row.authorization) ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">
                        {formatAuthorizedDay(row.authorization.authorizedAt) || "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        {authorizationState(row.authorization) === "outdated"
                          ? AUTHORIZATION_STATE_LABELS.outdated
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
