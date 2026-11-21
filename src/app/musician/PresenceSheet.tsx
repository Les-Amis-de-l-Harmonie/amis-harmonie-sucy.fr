"use client";

import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  Calendar,
  AlarmClock,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Shirt,
  Undo2,
  UserRound,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetDescription,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { Textarea } from "@/app/components/ui/textarea";
import { formatDateFrench, isEventPast } from "@/lib/dates";
import { groupMembersByPupitre } from "@/lib/presence-groups";
import { cn } from "@/lib/utils";
import { useActingLabels } from "./acting-labels";
import { AuthorizationBlock } from "./AuthorizationBlock";
import type { PresenceEvent } from "./musician-types";
import { getDeadlineTone } from "./presence-deadline";
import { formatAnsweredBy, getPracticalInfo } from "./presence-format";
import {
  buildMusicianRows,
  countPupitre,
  getEventDateParts,
  getFullName,
} from "./presence-matrix-helpers";
import { StatusDot } from "./StatusDot";
import type { PresenceSaveAction, PresenceSaver } from "./usePresenceSave";

const MAX_COMMENT_LENGTH = 1000;

function formatLongDate(dateStr: string): string {
  const parts = getEventDateParts(dateStr);
  if (!parts) return formatDateFrench(dateStr);
  return `${parts.weekday} ${parts.day} ${parts.monthName} ${parts.year}`;
}

// ---------------------------------------------------------------------------
// « Qui vient ? » : barre de bilan + pupitres repliables
// ---------------------------------------------------------------------------

function TallyBar({ event }: { event: PresenceEvent }) {
  const { present, absent, noAnswer, totalMembers } = event.counts;
  if (totalMembers <= 0) return null;
  return (
    <div>
      <div
        role="img"
        aria-label={`${present} présent${present > 1 ? "s" : ""}, ${absent} absent${absent > 1 ? "s" : ""}, ${noAnswer} sans réponse`}
        className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted"
      >
        <i className="block bg-success" style={{ flex: present }} />
        <i className="block bg-destructive" style={{ flex: absent }} />
        <i className="block bg-muted-foreground/30" style={{ flex: noAnswer }} />
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2 w-2 rounded-[3px] bg-success" aria-hidden="true" />
          {present} présent{present > 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2 w-2 rounded-[3px] bg-destructive" aria-hidden="true" />
          {absent} absent{absent > 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i
            className="inline-block h-2 w-2 rounded-[3px] bg-muted-foreground/40"
            aria-hidden="true"
          />
          {noAnswer} sans réponse
        </span>
      </p>
    </div>
  );
}

function PupitreGroups({
  event,
  currentUserId,
}: {
  event: PresenceEvent;
  currentUserId: number | null;
}) {
  const labels = useActingLabels();
  const rows = useMemo(() => buildMusicianRows([event], currentUserId), [event, currentUserId]);
  const groups = useMemo(() => groupMembersByPupitre(rows), [rows]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  if (groups.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {groups.map((group) => {
        const counts = countPupitre(group.members, event.id);
        const isOwnGroup = group.members.some((member) => member.isCurrentUser);
        const open = openGroups[group.key] ?? isOwnGroup;
        const panelId = `pupitre-${event.id}-${group.key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
        return (
          <li key={group.key} className="overflow-hidden rounded-xl border border-border bg-card">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenGroups((current) => ({ ...current, [group.key]: !open }))}
              className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
                {group.label}
              </span>
              <span className="flex max-w-28 flex-wrap justify-end gap-[3px]" aria-hidden="true">
                {group.members.map((member) => (
                  <StatusDot
                    key={member.userId}
                    status={member.statuses.get(event.id) ?? null}
                    size="xs"
                  />
                ))}
              </span>
              <span className="min-w-9 text-right text-sm font-extrabold tabular-nums text-foreground">
                {counts.present}/{counts.total}
                <span className="sr-only"> présents</span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180"
                )}
                aria-hidden="true"
              />
            </button>
            {open && (
              <ul
                id={panelId}
                className="grid grid-cols-2 gap-x-2 gap-y-0.5 border-t border-border px-2 pb-2.5 pt-1.5"
              >
                {group.members.map((member) => {
                  const status = member.statuses.get(event.id) ?? null;
                  return (
                    <li
                      key={member.userId}
                      className={cn(
                        "flex min-w-0 items-center gap-1.5 rounded-lg px-1 py-1 text-xs leading-tight",
                        member.isCurrentUser && "bg-primary/20 font-bold dark:bg-primary/25"
                      )}
                    >
                      <StatusDot status={status} size="sm" labelled />
                      <span className="min-w-0">
                        <span className="break-words">
                          {getFullName(member.firstName, member.lastName)}
                        </span>
                        {member.isCurrentUser && (
                          <span className="ml-1 inline-block rounded-full bg-foreground px-1.5 align-[1px] text-[10px] font-extrabold text-background">
                            {labels.currentRowBadge}
                          </span>
                        )}
                        {group.key === "direction" && member.instruments[0] && (
                          <span className="block text-[11px] font-normal text-muted-foreground">
                            {member.instruments[0]}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Contenu de la feuille : réponse, commentaire, effacement, « Qui vient ? »
// ---------------------------------------------------------------------------

export interface PresenceDetailProps {
  event: PresenceEvent;
  currentUserId: number | null;
  onUpdate: (event: PresenceEvent) => void;
  /** Enregistrement partagé avec la liste : un seul état d'attente et d'erreur par page. */
  saver: PresenceSaver;
  /** Donne la main au champ de commentaire (ex. depuis « Ajouter un mot »). */
  commentRef?: Ref<HTMLTextAreaElement>;
}

function savedMessage(action: PresenceSaveAction): string {
  if (action === "clear") return "Réponse effacée";
  if (action === "comment") return "Commentaire enregistré";
  return "Réponse enregistrée";
}

export function PresenceDetail({
  event,
  currentUserId,
  onUpdate,
  saver,
  commentRef,
}: PresenceDetailProps) {
  const labels = useActingLabels();
  const { pending, errors, save } = saver;
  const [comment, setComment] = useState(event.response.comment ?? "");
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [saved, setSaved] = useState<PresenceSaveAction | null>(null);

  useEffect(() => {
    if (saved === null) return;
    const timeoutId = window.setTimeout(() => setSaved(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [saved]);

  const status = event.response.status;
  const answered = status !== null;
  // Le serveur refuse toute réponse pour une prestation passée (400) : on ne propose donc
  // jamais de contrôle actif pour ces dates, plutôt que de laisser essayer pour échouer.
  const isPast = isEventPast(event.date);
  const deadline = isPast
    ? { label: "Prestation passée : réponses closes", tone: "muted" as const }
    : getDeadlineTone(event.response_deadline, answered);
  const answeredByLine = answered ? formatAnsweredBy(event.response.answeredBy) : null;
  const practical = getPracticalInfo(event);
  const pendingAction = pending[event.id] ?? null;
  const errorMessage = errors[event.id] ?? null;
  const commentDirty = comment.trim() !== (event.response.comment ?? "").trim();

  async function submit(
    nextStatus: "present" | "absent" | null,
    action?: PresenceSaveAction
  ): Promise<void> {
    const result = await save(event, nextStatus, comment, action);
    if (!result.ok) return;
    // Réconciliation sur la réponse serveur : le commentaire affiché est celui qui existe vraiment.
    setComment(result.event.response.comment ?? "");
    setConfirmingClear(false);
    setSaved(
      action ?? (nextStatus === null ? "clear" : nextStatus === "present" ? "present" : "absent")
    );
  }

  const answerButtonClass = (selected: boolean, tone: "success" | "destructive") =>
    cn(
      "flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
      selected
        ? tone === "success"
          ? "border-success bg-success text-success-foreground shadow-sm"
          : "border-destructive bg-destructive text-destructive-foreground shadow-sm"
        : tone === "success"
          ? "border-border bg-card text-foreground enabled:hover:border-success enabled:hover:bg-success/10"
          : "border-border bg-card text-foreground enabled:hover:border-destructive enabled:hover:bg-destructive/10"
    );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p
          className={cn(
            "flex w-fit items-center gap-1.5 text-sm font-medium",
            deadline.tone === "danger"
              ? "text-destructive"
              : deadline.tone === "warning"
                ? "text-warning"
                : "text-muted-foreground"
          )}
        >
          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
          {deadline.label}
        </p>
        {answeredByLine && (
          <p className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground">
            <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {answeredByLine}
          </p>
        )}
      </div>

      {practical.notes && (
        <section
          aria-label="Consignes"
          className="rounded-lg border border-border bg-muted/40 p-3 text-sm"
        >
          <h3 className="text-sm font-semibold text-foreground">Consignes</h3>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-muted-foreground">
            {practical.notes}
          </p>
        </section>
      )}

      {event.authorization && (
        <AuthorizationBlock
          eventId={event.id}
          authorization={event.authorization}
          onAuthorizationChange={(authorization) => onUpdate({ ...event, authorization })}
        />
      )}

      <section aria-label={labels.detailAnswerHeading} className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void submit("present")}
            disabled={isPast || pendingAction !== null}
            aria-pressed={status === "present"}
            className={answerButtonClass(status === "present", "success")}
          >
            {pendingAction === "present" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            Présent
          </button>
          <button
            type="button"
            onClick={() => void submit("absent")}
            disabled={isPast || pendingAction !== null}
            aria-pressed={status === "absent"}
            className={answerButtonClass(status === "absent", "destructive")}
          >
            {pendingAction === "absent" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <X className="h-4 w-4" aria-hidden="true" />
            )}
            Absent
          </button>
        </div>

        {isPast ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Prestation passée : les réponses ne sont plus modifiables.
          </p>
        ) : (
          answered && (
            <div>
              {confirmingClear ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-2 text-xs text-warning dark:border-warning/40 dark:bg-warning/20">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{labels.clearCommentWarning}</span>
                  <div className="ml-auto flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmingClear(false)}
                      className="min-h-9 cursor-pointer font-medium underline-offset-2 hover:underline"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => void submit(null)}
                      disabled={pendingAction !== null}
                      className="min-h-9 cursor-pointer font-semibold text-destructive underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {pendingAction === "clear" ? "Suppression…" : "Confirmer"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    event.response.comment ? setConfirmingClear(true) : void submit(null)
                  }
                  disabled={pendingAction !== null}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {labels.clearAnswer}
                </button>
              )}
            </div>
          )
        )}

        {/* Région live toujours montée : seul son contenu change, ce qui permet aux lecteurs
            d'écran d'annoncer le message. Vide, elle ne prend aucune place (`empty:-mb-2`
            annule l'espacement du parent). */}
        <div role="status" className="empty:-mb-2">
          {!isPast && saved !== null && !errorMessage && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-success">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {savedMessage(saved)}
            </p>
          )}
        </div>
        {errorMessage && (
          <p
            role="alert"
            className="flex items-center gap-1.5 text-xs font-medium text-destructive"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {errorMessage}
          </p>
        )}
      </section>

      {/* Une prestation passée n'accepte plus aucune écriture (commentaire compris) : on
          n'affiche donc que le commentaire déjà enregistré, s'il y en a un. */}
      {isPast ? (
        event.response.comment && (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{event.response.comment}</span>
          </p>
        )
      ) : (
        <div>
          <label
            htmlFor={`presence-comment-${event.id}`}
            className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground"
          >
            <MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {event.response.comment ? labels.editComment : labels.commentFieldLabel}
          </label>
          <Textarea
            id={`presence-comment-${event.id}`}
            ref={commentRef}
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
            maxLength={MAX_COMMENT_LENGTH}
            placeholder="Un mot pour l'équipe (facultatif)"
            className="min-h-[80px] text-sm"
          />
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {comment.length}/{MAX_COMMENT_LENGTH}
            </span>
            {answered ? (
              <button
                type="button"
                onClick={() => void submit(status, "comment")}
                disabled={pendingAction !== null || !commentDirty}
                className="inline-flex h-9 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border border-input bg-background px-3 text-xs font-semibold shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.97] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingAction === "comment" && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
                Enregistrer le commentaire
              </button>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                {labels.commentSentWithAnswer}
              </span>
            )}
          </div>
        </div>
      )}

      <section aria-labelledby={`who-comes-${event.id}`} className="space-y-2.5 pt-1">
        <h3 id={`who-comes-${event.id}`} className="text-base font-bold text-foreground">
          Qui vient ?
        </h3>
        <TallyBar event={event} />
        <PupitreGroups event={event} currentUserId={currentUserId} />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feuille : panneau du bas sur téléphone, panneau latéral dès `sm`
// ---------------------------------------------------------------------------

export interface PresenceSheetProps {
  /** `null` : feuille fermée. */
  event: PresenceEvent | null;
  currentUserId: number | null;
  onClose: () => void;
  onUpdate: (event: PresenceEvent) => void;
  saver: PresenceSaver;
  /** Place le curseur dans le commentaire à l'ouverture. */
  focusComment?: boolean;
  /** Élément à refocaliser à la fermeture (déclencheur d'origine). */
  getReturnFocusTarget?: () => HTMLElement | null;
}

export function PresenceSheet({
  event,
  currentUserId,
  onClose,
  onUpdate,
  saver,
  focusComment = false,
  getReturnFocusTarget,
}: PresenceSheetProps) {
  const commentRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Garde le dernier événement affiché pendant l'animation de fermeture.
  const lastEvent = useRef<PresenceEvent | null>(null);
  if (event) lastEvent.current = event;
  const shown = event ?? lastEvent.current;
  const practical = getPracticalInfo(shown ?? {});

  return (
    <Sheet open={event !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetPortal>
        <SheetOverlay />
        <DialogPrimitive.Content
          onOpenAutoFocus={(openEvent) => {
            openEvent.preventDefault();
            // Sinon Radix focalise le premier élément (« Fermer ») : on préfère la zone
            // défilante, pour que le clavier lise la feuille depuis le haut.
            if (focusComment && commentRef.current) commentRef.current.focus();
            else scrollRef.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(closeEvent) => {
            const target = getReturnFocusTarget?.();
            if (target?.isConnected) {
              closeEvent.preventDefault();
              target.focus();
            }
          }}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-elevation-1 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "inset-x-0 bottom-0 h-[88dvh] rounded-t-2xl border-t data-[state=open]:slide-in-from-bottom-[100%] data-[state=closed]:slide-out-to-bottom-[100%]",
            "sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:w-[30rem] sm:max-w-full sm:rounded-none sm:rounded-l-2xl sm:border-l sm:border-t-0 sm:data-[state=open]:slide-in-from-right-[100%] sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-right-[100%] sm:data-[state=closed]:slide-out-to-bottom-0"
          )}
        >
          {shown && (
            <>
              <div
                className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted sm:hidden"
                aria-hidden="true"
              />
              <header className="flex shrink-0 items-start gap-3 border-b border-border px-4 pb-3 pt-3">
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-lg leading-tight">{shown.title}</SheetTitle>
                  <SheetDescription asChild>
                    <div className="mt-1 space-y-0.5">
                      <p className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          {formatLongDate(shown.date)}
                          {shown.time && <> · {shown.time}</>}
                        </span>
                      </p>
                      {practical.callTime && (
                        <p className="flex items-center gap-1.5 font-medium text-foreground">
                          <AlarmClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>Rendez-vous {practical.callTime}</span>
                        </p>
                      )}
                      {practical.dressCode && (
                        <p className="flex items-start gap-1.5">
                          <Shirt className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>Tenue : {practical.dressCode}</span>
                        </p>
                      )}
                      {(shown.location || shown.address) && (
                        <p className="flex items-start gap-1.5">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            {shown.location}
                            {shown.location && shown.address && " — "}
                            {shown.address}
                          </span>
                        </p>
                      )}
                    </div>
                  </SheetDescription>
                </div>
                <DialogPrimitive.Close className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <X className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">Fermer</span>
                </DialogPrimitive.Close>
              </header>
              <div
                ref={scrollRef}
                tabIndex={-1}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-4"
              >
                <PresenceDetail
                  key={shown.id}
                  event={shown}
                  currentUserId={currentUserId}
                  onUpdate={onUpdate}
                  saver={saver}
                  commentRef={commentRef}
                />
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </SheetPortal>
    </Sheet>
  );
}
