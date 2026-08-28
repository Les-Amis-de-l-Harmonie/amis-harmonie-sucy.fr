"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  MessageSquare,
  Minus,
  Table2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Label } from "@/app/components/ui/label";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Switch } from "@/app/components/ui/switch";
import { formatDateFrench, formatDateShort, isEventPast } from "@/lib/dates";
import { groupMembersByPupitre } from "@/lib/presence-groups";
import { cn } from "@/lib/utils";

// --- Vue d'ensemble (tableau croisé musiciens × prestations) ---------------

type PresenceStatus = "present" | "absent" | null;

interface PresenceGridEvent {
  id: number;
  title: string;
  date: string;
  response_deadline: string | null;
}

interface PresenceGridAnswer {
  status: PresenceStatus;
  comment: string | null;
  changedAfterDeadline: boolean;
}

interface PresenceGridMember {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: string[];
  primaryInstrument: string | null;
  answers: Record<string, PresenceGridAnswer>;
}

interface PresenceGridData {
  events: PresenceGridEvent[];
  members: PresenceGridMember[];
}

interface PresenceUpdateResponse {
  success: true;
  eventId: number;
  userId: number;
  status: PresenceStatus;
  comment: string | null;
  changedAfterDeadline: boolean;
}

function formatMemberName(member: {
  firstName: string | null;
  lastName: string | null;
  userId: number;
}): string {
  return [member.firstName, member.lastName].filter(Boolean).join(" ") || `Membre ${member.userId}`;
}

function formatDayMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

type DeadlineState = "none" | "open" | "passed";

function deadlineStateFor(deadline: string | null): DeadlineState {
  if (!deadline) return "none";
  const todayIso = new Date().toISOString().slice(0, 10);
  return deadline < todayIso ? "passed" : "open";
}

type ResponseRateTier = "high" | "mid" | "low";

function responseRateTier(rate: number): ResponseRateTier {
  if (rate >= 0.75) return "high";
  if (rate >= 0.4) return "mid";
  return "low";
}

// Le taux de réponse est un signal secondaire au sein de l'en-tête : il ne doit pas
// concurrencer la date de l'événement. Un taux correct reste discret (couleur neutre) ;
// seul un taux à surveiller ou franchement bas attire l'œil.
const RESPONSE_RATE_TEXT: Record<ResponseRateTier, string> = {
  high: "text-muted-foreground",
  mid: "text-amber-600 dark:text-amber-400",
  low: "text-red-600 dark:text-red-400",
};

function computeResponseRate(members: PresenceGridMember[], eventId: number): number {
  if (members.length === 0) return 0;
  const answered = members.reduce((count, member) => {
    const status = member.answers[String(eventId)]?.status ?? null;
    return status !== null ? count + 1 : count;
  }, 0);
  return answered / members.length;
}

const CELL_LABELS: Record<"present" | "absent" | "none", string> = {
  present: "Présent",
  absent: "Absent",
  none: "Sans réponse",
};

function statusKey(status: PresenceStatus): "present" | "absent" | "none" {
  return status ?? "none";
}

function GridStatusGlyph({ status, className }: { status: PresenceStatus; className?: string }) {
  if (status === "present") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-green-500 text-white",
          className
        )}
      >
        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} />
      </span>
    );
  }
  if (status === "absent") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md bg-red-500 text-white",
          className
        )}
      >
        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500",
        className
      )}
    >
      <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={3} />
    </span>
  );
}

function GridLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <GridStatusGlyph status="present" className="w-5 h-5" />
        Présent
      </span>
      <span className="inline-flex items-center gap-1.5">
        <GridStatusGlyph status="absent" className="w-5 h-5" />
        Absent
      </span>
      <span className="inline-flex items-center gap-1.5">
        <GridStatusGlyph status={null} className="w-5 h-5" />
        Sans réponse
      </span>
      <span className="inline-flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
        Aucune réponse (prestations affichées)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
        Date limite dépassée
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        Modifié après la date limite
      </span>
    </div>
  );
}

interface GridEditTarget {
  member: PresenceGridMember;
  event: PresenceGridEvent;
}

function EditPresenceDialog({
  target,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  target: GridEditTarget | null;
  submitting: PresenceStatus | "none" | null;
  error: string | null;
  onClose: () => void;
  onSubmit: (status: PresenceStatus) => void;
}) {
  const open = target !== null;
  const currentAnswer = target ? (target.member.answers[String(target.event.id)] ?? null) : null;
  const currentStatus = currentAnswer?.status ?? null;
  const comment = currentAnswer?.comment ?? null;
  const isPast = target ? isEventPast(target.event.date) : false;

  // Réinitialisé à chaque nouvelle cible (le parent recrée l'objet `target` à chaque
  // ouverture, même pour la même case) : une confirmation donnée ne doit pas être
  // réutilisée pour une réouverture ultérieure.
  const [confirmedPast, setConfirmedPast] = useState(false);
  useEffect(() => {
    setConfirmedPast(false);
  }, [target]);

  const needsConfirmation = isPast && !confirmedPast;

  const choices: {
    status: PresenceStatus;
    label: string;
    icon: React.ReactNode;
    activeClass: string;
  }[] = [
    {
      status: "present",
      label: "Présent",
      icon: <CheckCircle2 className="w-5 h-5" />,
      activeClass:
        "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
    },
    {
      status: "absent",
      label: "Absent",
      icon: <XCircle className="w-5 h-5" />,
      activeClass: "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
    },
    {
      status: null,
      label: "Sans réponse (effacer)",
      icon: <HelpCircle className="w-5 h-5" />,
      activeClass: "border-gray-400 bg-muted text-foreground",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        {target && (
          <>
            <DialogHeader>
              <DialogTitle>
                {needsConfirmation ? "Prestation passée" : "Modifier la réponse"}
              </DialogTitle>
              <DialogDescription>
                {formatMemberName(target.member)} — {target.event.title} (
                {formatDateShort(target.event.date)})
              </DialogDescription>
            </DialogHeader>

            {needsConfirmation ? (
              <>
                <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-1.5">
                  <p className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    Cette prestation est déjà passée
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    La réponse sera enregistrée comme modifiée à l&apos;instant et apparaîtra donc «
                    modifiée après la date limite ». À réserver à la correction d&apos;une erreur de
                    saisie.
                  </p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Annuler
                  </Button>
                  <Button type="button" onClick={() => setConfirmedPast(true)}>
                    Continuer
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  {choices.map((choice) => {
                    const isCurrent = statusKey(choice.status) === statusKey(currentStatus);
                    const isSubmittingThis = submitting === statusKey(choice.status);
                    return (
                      <button
                        key={choice.label}
                        type="button"
                        disabled={submitting !== null}
                        onClick={() => onSubmit(choice.status)}
                        className={cn(
                          "w-full min-h-[44px] flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors disabled:opacity-60",
                          isCurrent
                            ? choice.activeClass
                            : "border-border bg-background hover:bg-muted text-foreground"
                        )}
                      >
                        {isSubmittingThis ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          choice.icon
                        )}
                        <span>{choice.label}</span>
                        {isCurrent && !isSubmittingThis && (
                          <span className="ml-auto text-xs font-normal opacity-75">Actuel</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {comment && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                      Commentaire du musicien
                    </p>
                    <p className="text-sm text-foreground italic mt-1">« {comment} »</p>
                  </div>
                )}

                {error && (
                  <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PresenceGrid({
  data,
  loading,
  error,
  includePast,
  onToggleIncludePast,
  onEdit,
}: {
  data: PresenceGridData | null;
  loading: boolean;
  error: string | null;
  includePast: boolean;
  onToggleIncludePast: (value: boolean) => void;
  onEdit: (member: PresenceGridMember, event: PresenceGridEvent) => void;
}) {
  const groups = useMemo(() => (data ? groupMembersByPupitre(data.members) : []), [data]);
  const isInitialLoad = loading && !data;
  const isRefreshing = loading && !!data;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="w-5 h-5 text-muted-foreground" />
              Qui répond, qui ne répond jamais
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Touchez ou cliquez une case pour saisir ou corriger une réponse.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isRefreshing && (
              <Loader2
                className="w-3.5 h-3.5 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            )}
            <Switch
              id="grid-include-past"
              checked={includePast}
              onCheckedChange={onToggleIncludePast}
              disabled={isInitialLoad}
            />
            <Label
              htmlFor="grid-include-past"
              className="text-sm font-normal text-muted-foreground cursor-pointer"
            >
              Inclure les événements passés (12 derniers mois)
            </Label>
          </div>
        </div>
        {data && data.events.length > 0 && <GridLegend />}
      </CardHeader>
      <CardContent className="p-0">
        {isInitialLoad ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-5 w-72" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : error && !data ? (
          <div
            role="alert"
            className="m-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm"
          >
            {error}
          </div>
        ) : !data || data.events.length === 0 ? (
          <EmptyState
            icon={<Table2 className="w-12 h-12" />}
            title="Aucune prestation à afficher"
            description={
              includePast
                ? "Aucune prestation trouvée sur les 12 derniers mois demandant une réponse de présence."
                : "Le tableau croisé apparaîtra dès qu'une prestation à venir demandera une réponse de présence."
            }
          />
        ) : data.members.length === 0 ? (
          <EmptyState
            icon={<Users className="w-12 h-12" />}
            title="Aucun musicien"
            description="Aucun musicien actif n'est enregistré pour le moment."
          />
        ) : (
          <>
            {error && (
              <div
                role="alert"
                className="mx-4 mt-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm"
              >
                {error}
              </div>
            )}
            {/* `contain:paint` est indispensable : la somme des largeurs fixes des colonnes rend
                ce tableau plus large que son conteneur, et sans ce confinement cette largeur
                remonte dans le calcul de défilement du document malgré `overflow-x-auto`, ce qui
                faisait défiler la page entière en 375px au lieu du seul tableau. */}
            <div
              className={cn(
                "overflow-x-auto [contain:paint] border-t border-border",
                isRefreshing && "opacity-60 pointer-events-none transition-opacity"
              )}
              aria-busy={isRefreshing}
            >
              <table className="text-sm table-fixed border-collapse">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 z-10 w-32 sm:w-52 bg-card border-b border-r border-border px-2 sm:px-4 py-2.5 text-left align-bottom font-medium text-muted-foreground"
                    >
                      Musicien
                    </th>
                    {data.events.map((event) => {
                      const state = deadlineStateFor(event.response_deadline);
                      const rate = computeResponseRate(data.members, event.id);
                      const pct = Math.round(rate * 100);
                      return (
                        <th
                          key={event.id}
                          scope="col"
                          className="w-14 sm:w-32 border-b border-border px-1 sm:px-2 py-2.5 text-center align-bottom font-medium text-muted-foreground"
                          title={`${event.title} — ${formatDateFrench(event.date)}${
                            event.response_deadline
                              ? ` (date limite ${formatDateShort(event.response_deadline)}${
                                  state === "passed" ? ", dépassée" : ""
                                })`
                              : ""
                          } — taux de réponse : ${pct} %`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="hidden sm:block text-xs font-normal text-muted-foreground/80 truncate max-w-[7.5rem]">
                              {event.title}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-foreground">
                              {formatDayMonth(event.date)}
                              {state === "passed" && (
                                <AlertTriangle
                                  className="w-3 h-3 text-red-500 shrink-0"
                                  aria-label="Date limite dépassée"
                                />
                              )}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] sm:text-xs font-medium tabular-nums",
                                RESPONSE_RATE_TEXT[responseRateTier(rate)]
                              )}
                            >
                              {pct}&nbsp;%
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                {groups.map((group) => (
                  <tbody key={group.key}>
                    <tr>
                      {/* `scope="rowgroup"` : cette cellule décrit les lignes qui suivent, jusqu'au
                          prochain en-tête de groupe — c'est la sémantique exacte d'un titre de
                          pupitre.
                          Le <th> lui-même n'est PAS sticky : il occupe déjà toute la largeur du
                          tableau (colSpan), donc son bloc conteneur n'a nulle part où le décaler —
                          l'offset se clampe à 0 et l'étiquette défilerait avec le reste. C'est le
                          <span> interne, plus étroit que son conteneur (le <th>), qui est sticky :
                          lui a de la place pour glisser vers la gauche pendant le défilement. Les
                          deux portent le même fond pour que le badge du libellé se fonde dans la
                          bande de couleur, qui elle reste dans le flux normal. */}
                      <th
                        scope="rowgroup"
                        colSpan={data.events.length + 1}
                        className="bg-muted/70 dark:bg-muted/30 border-b border-t border-border p-0 text-left"
                      >
                        <span className="sticky left-0 z-10 inline-block max-w-[80vw] truncate whitespace-nowrap bg-muted/70 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:bg-muted/30 sm:px-4">
                          {group.label}
                          <span className="ml-1.5 font-normal normal-case text-muted-foreground/70">
                            ({group.members.length})
                          </span>
                        </span>
                      </th>
                    </tr>
                    {group.members.map((member) => {
                      // Calculé sur les seuls événements affichés, pas sur tout l'historique :
                      // avec le bouton « Inclure les événements passés » désactivé, ce n'est donc
                      // pas une affirmation absolue — d'où le libellé "prestations affichées".
                      const neverAnswered = data.events.every(
                        (event) => (member.answers[String(event.id)]?.status ?? null) === null
                      );
                      return (
                        <tr
                          key={member.userId}
                          className={cn(
                            "border-b border-border last:border-0",
                            neverAnswered && "bg-amber-50/60 dark:bg-amber-900/10"
                          )}
                        >
                          <th
                            scope="row"
                            className={cn(
                              "sticky left-0 z-10 bg-card border-r border-border px-2 sm:px-4 py-1.5 text-left font-normal align-middle",
                              neverAnswered && "bg-amber-50/60 dark:bg-amber-900/10"
                            )}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {neverAnswered && (
                                <AlertCircle
                                  className="w-3.5 h-3.5 text-amber-500 shrink-0"
                                  aria-label="Aucune réponse parmi les prestations affichées"
                                />
                              )}
                              <span className="text-sm font-medium text-foreground truncate">
                                {formatMemberName(member)}
                              </span>
                            </div>
                            {member.instruments.length > 0 && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {member.instruments.join(", ")}
                              </p>
                            )}
                          </th>
                          {data.events.map((event) => {
                            const answer = member.answers[String(event.id)];
                            const status = answer?.status ?? null;
                            const isLate = answer?.changedAfterDeadline ?? false;
                            return (
                              <td key={event.id} className="p-0.5 sm:p-1 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={() => onEdit(member, event)}
                                  aria-label={`${formatMemberName(member)} — ${event.title} : ${
                                    CELL_LABELS[statusKey(status)]
                                  }${isLate ? ", modifié après la date limite" : ""}. Modifier.`}
                                  className="w-full min-h-11 h-11 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                                >
                                  <span className="relative inline-flex">
                                    <GridStatusGlyph
                                      status={status}
                                      className="w-7 h-7 sm:w-8 sm:h-8"
                                    />
                                    {isLate && (
                                      <Clock
                                        className="absolute -top-1 -right-1 w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 dark:text-amber-400 bg-card rounded-full ring-1 ring-card"
                                        aria-hidden="true"
                                      />
                                    )}
                                  </span>
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function PresenceAdminClient() {
  const [includePast, setIncludePast] = useState(false);
  const [gridData, setGridData] = useState<PresenceGridData | null>(null);
  const [gridLoading, setGridLoading] = useState(true);
  const [gridError, setGridError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<GridEditTarget | null>(null);
  const [editSubmitting, setEditSubmitting] = useState<PresenceStatus | "none" | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadGrid = async () => {
      setGridLoading(true);
      setGridError(null);
      try {
        const response = await fetch(
          `/api/admin/presence?grid=1${includePast ? "&includePast=1" : ""}`
        );
        if (!response.ok) throw new Error("Impossible de charger le tableau croisé.");
        const data = (await response.json()) as PresenceGridData;
        if (!cancelled) setGridData(data);
      } catch (loadError) {
        if (!cancelled) {
          console.error("Erreur lors du chargement du tableau croisé :", loadError);
          setGridError("Erreur lors du chargement du tableau croisé.");
        }
      } finally {
        if (!cancelled) setGridLoading(false);
      }
    };

    void loadGrid();
    return () => {
      cancelled = true;
    };
  }, [includePast]);

  const submitEdit = async (status: PresenceStatus) => {
    if (!editTarget) return;
    setEditError(null);
    setEditSubmitting(statusKey(status));
    try {
      const response = await fetch("/api/admin/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: editTarget.event.id,
          userId: editTarget.member.userId,
          status,
        }),
      });
      const payload = (await response.json()) as PresenceUpdateResponse | { error?: string };
      if (!response.ok || !("success" in payload) || !payload.success) {
        const message =
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Erreur lors de l'enregistrement de la réponse.";
        throw new Error(message);
      }

      // Le serveur est la seule source de vérité pour ces trois champs — on ne dérive plus
      // rien côté client. C'est en particulier le cas le plus fréquent (corriger une case
      // après la date limite) qui rendait une dérivation optimiste fausse : le serveur
      // renvoie alors `changedAfterDeadline: true`, pas `false`.
      const {
        eventId,
        userId,
        status: resolvedStatus,
        comment: resolvedComment,
        changedAfterDeadline,
      } = payload;
      setGridData((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          members: previous.members.map((member) =>
            member.userId === userId
              ? {
                  ...member,
                  answers: {
                    ...member.answers,
                    [String(eventId)]: {
                      status: resolvedStatus,
                      comment: resolvedComment,
                      changedAfterDeadline,
                    },
                  },
                }
              : member
          ),
        };
      });

      setEditTarget(null);
    } catch (submitError) {
      console.error("Erreur lors de la mise à jour de la présence :", submitError);
      setEditError(
        submitError instanceof Error
          ? submitError.message
          : "Erreur lors de l'enregistrement de la réponse."
      );
    } finally {
      setEditSubmitting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Présences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vue d&apos;ensemble des réponses de présence de tous les musiciens, groupées par pupitre.
        </p>
      </div>

      <PresenceGrid
        data={gridData}
        loading={gridLoading}
        error={gridError}
        includePast={includePast}
        onToggleIncludePast={setIncludePast}
        onEdit={(member, event) => {
          setEditError(null);
          setEditTarget({ member, event });
        }}
      />

      <EditPresenceDialog
        target={editTarget}
        submitting={editSubmitting}
        error={editError}
        onClose={() => {
          if (editSubmitting !== null) return;
          setEditTarget(null);
          setEditError(null);
        }}
        onSubmit={(status) => void submitEdit(status)}
      />
    </div>
  );
}
