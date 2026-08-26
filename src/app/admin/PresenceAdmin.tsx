"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  ClipboardList,
  Copy,
  Globe,
  HelpCircle,
  Loader2,
  Lock,
  MapPin,
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
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { EmptyState } from "@/app/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Skeleton } from "@/app/components/ui/skeleton";
import { formatDateFrench, formatDateShort } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Event } from "@/db/types";

interface PresenceEventOption {
  id: number;
  title: string;
  date: string;
  response_deadline: string | null;
  is_public: number;
}

interface PresenceMember {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: string[];
  status: "present" | "absent" | null;
  changedAfterDeadline: boolean;
  comment: string | null;
}

interface InstrumentBreakdown {
  instrument: string;
  present: number;
  absent: number;
  noAnswer: number;
  members: PresenceMember[];
}

interface PresenceDetails {
  event: Event;
  totalMembers: number;
  present: number;
  absent: number;
  noAnswer: number;
  responseRate: number;
  byInstrument: InstrumentBreakdown[];
  nonResponders: PresenceMember[];
  lateChanges: PresenceMember[];
  nonRespondersText: string;
}

type PresenceStatus = "present" | "absent" | null;

interface PresenceGridEvent {
  id: number;
  title: string;
  date: string;
  response_deadline: string | null;
}

interface PresenceGridMember {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: string[];
  answers: Record<string, PresenceStatus>;
}

interface PresenceGridData {
  events: PresenceGridEvent[];
  members: PresenceGridMember[];
}

function formatMemberName(member: {
  firstName: string | null;
  lastName: string | null;
  userId: number;
}): string {
  return [member.firstName, member.lastName].filter(Boolean).join(" ") || `Membre ${member.userId}`;
}

function formatOtherInstruments(member: PresenceMember, instrument: string): string {
  return member.instruments
    .filter((memberInstrument) => memberInstrument !== instrument)
    .join(", ");
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

type RateTier = "high" | "mid" | "low";

function rateTier(rate: number): RateTier {
  if (rate >= 0.75) return "high";
  if (rate >= 0.4) return "mid";
  return "low";
}

const RATE_STYLES: Record<RateTier, { text: string; card: string }> = {
  high: {
    text: "text-green-600 dark:text-green-400",
    card: "border-green-200 dark:border-green-900/50 bg-green-50/60 dark:bg-green-900/10",
  },
  mid: {
    text: "text-amber-600 dark:text-amber-400",
    card: "border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/10",
  },
  low: {
    text: "text-red-600 dark:text-red-400",
    card: "border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-900/10",
  },
};

type PillTone = "blue" | "gray" | "red" | "green";

const PILL_TONES: Record<PillTone, string> = {
  blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
  gray: "bg-muted text-muted-foreground",
  red: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
  green: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
};

function Pill({
  tone,
  icon,
  children,
}: {
  tone: PillTone;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        PILL_TONES[tone]
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function StatusIcon({ status }: { status: PresenceMember["status"] }) {
  if (status === "present") {
    return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" aria-hidden="true" />;
  }
  if (status === "absent") {
    return <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />;
  }
  return (
    <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
  );
}

type StatTone = "green" | "red" | "gray";

const STAT_TONES: Record<StatTone, string> = {
  green: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  red: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
  gray: "bg-muted text-muted-foreground",
};

function StatBlock({ label, value, tone }: { label: string; value: number; tone: StatTone }) {
  return (
    <div className={cn("rounded-lg text-center py-1.5", STAT_TONES[tone])}>
      <div className="text-lg font-bold leading-tight">{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</div>
    </div>
  );
}

function EventMetaCard({ event }: { event: Event }) {
  const deadline = event.response_deadline;
  const state = deadlineStateFor(deadline);
  const deadlineLabel = deadline ? formatDateShort(deadline) : null;

  return (
    <Card>
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">{event.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDateFrench(event.date)}
            {event.time ? ` — ${event.time}` : ""}
          </p>
        </div>

        {(event.location || event.address) && (
          <p className="inline-flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{[event.location, event.address].filter(Boolean).join(" — ")}</span>
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {event.is_public ? (
            <Pill tone="blue" icon={<Globe className="w-3.5 h-3.5" />}>
              Visible sur le site public
            </Pill>
          ) : (
            <Pill tone="gray" icon={<Lock className="w-3.5 h-3.5" />}>
              Événement interne
            </Pill>
          )}

          {state === "none" && (
            <Pill tone="gray" icon={<Clock className="w-3.5 h-3.5" />}>
              Pas de date limite
            </Pill>
          )}
          {state === "open" && (
            <Pill tone="blue" icon={<Clock className="w-3.5 h-3.5" />}>
              Date limite : {deadlineLabel}
            </Pill>
          )}
          {state === "passed" && (
            <Pill tone="red" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
              Date limite dépassée ({deadlineLabel})
            </Pill>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LateChangesBanner({ members }: { members: PresenceMember[] }) {
  return (
    <div className="rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-red-100 dark:bg-red-900/40 p-2 shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading font-semibold text-red-800 dark:text-red-300">
            {members.length} réponse{members.length > 1 ? "s" : ""} modifiée
            {members.length > 1 ? "s" : ""} après la date limite
          </h2>
          <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
            Une décision de renfort déjà prise sur la base des réponses précédentes est à revérifier
            pour ces musiciens.
          </p>
          <ul className="mt-3 space-y-1.5">
            {members.map((member) => (
              <li key={member.userId} className="text-sm text-red-800 dark:text-red-300">
                <span className="font-medium">{formatMemberName(member)}</span>
                {member.instruments.length > 0 && (
                  <span className="text-red-700/80 dark:text-red-400/80">
                    {" "}
                    — {member.instruments.join(", ")}
                  </span>
                )}
                {member.comment && (
                  <span className="block text-xs italic text-red-700/80 dark:text-red-400/80 mt-0.5">
                    « {member.comment} »
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", color)} />
      <span className="text-foreground font-medium">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function ResponseRateHero({ details }: { details: PresenceDetails }) {
  const { present, absent, noAnswer, totalMembers, responseRate } = details;
  const tier = rateTier(responseRate);
  const styles = RATE_STYLES[tier];
  const pct = Math.round(responseRate * 100);
  const answered = present + absent;

  return (
    <Card className={cn("border", styles.card)}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="shrink-0">
            <p className="text-sm font-medium text-muted-foreground">Taux de réponse</p>
            <p
              className={cn(
                "font-heading text-5xl sm:text-6xl font-bold leading-none mt-1",
                styles.text
              )}
            >
              {pct}&nbsp;%
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {answered} réponse{answered > 1 ? "s" : ""} sur {totalMembers} membre
              {totalMembers > 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex-1 min-w-0 w-full">
            {totalMembers > 0 && (
              <div className="h-3 w-full rounded-full overflow-hidden bg-muted flex">
                <div
                  className="bg-green-500 h-full"
                  style={{ width: `${(present / totalMembers) * 100}%` }}
                />
                <div
                  className="bg-red-400 h-full"
                  style={{ width: `${(absent / totalMembers) * 100}%` }}
                />
                <div
                  className="bg-gray-300 dark:bg-gray-600 h-full"
                  style={{ width: `${(noAnswer / totalMembers) * 100}%` }}
                />
              </div>
            )}
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-sm">
              <LegendItem color="bg-green-500" label="Présents" value={present} />
              <LegendItem color="bg-red-400" label="Absents" value={absent} />
              <LegendItem
                color="bg-gray-300 dark:bg-gray-600"
                label="Sans réponse"
                value={noAnswer}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InstrumentCard({ breakdown }: { breakdown: InstrumentBreakdown }) {
  const total = breakdown.present + breakdown.absent + breakdown.noAnswer;
  const complete = breakdown.noAnswer === 0;
  const nobodyAnswered = total > 0 && breakdown.present === 0 && breakdown.absent === 0;

  return (
    <Card
      className={cn(
        "border-l-4",
        complete ? "border-l-green-400" : nobodyAnswered ? "border-l-red-400" : "border-l-amber-400"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-heading font-semibold text-foreground">{breakdown.instrument}</h3>
          {complete ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Complet
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-medium px-2 py-0.5">
              {breakdown.noAnswer} sans réponse
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatBlock label="Présents" value={breakdown.present} tone="green" />
          <StatBlock label="Absents" value={breakdown.absent} tone="red" />
          <StatBlock label="Sans réponse" value={breakdown.noAnswer} tone="gray" />
        </div>

        <ul className="divide-y divide-border mt-1">
          {breakdown.members.map((member) => {
            const otherInstruments = formatOtherInstruments(member, breakdown.instrument);
            return (
              <li key={member.userId} className="flex items-start gap-2 py-2">
                <StatusIcon status={member.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-foreground">
                      {formatMemberName(member)}
                    </span>
                    {member.changedAfterDeadline && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[11px] font-medium px-1.5 py-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        Modifié après la date limite
                      </span>
                    )}
                  </div>
                  {otherInstruments && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      joue aussi : {otherInstruments}
                    </p>
                  )}
                  {member.comment && (
                    <p className="text-xs italic text-muted-foreground mt-0.5">
                      « {member.comment} »
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function NonRespondersCard({
  details,
  copied,
  onCopy,
}: {
  details: PresenceDetails;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            Sans réponse ({details.nonResponders.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Liste prête à copier pour une relance par e-mail ou WhatsApp.
          </p>
        </div>
        <Button
          type="button"
          onClick={onCopy}
          disabled={!details.nonRespondersText}
          variant={copied ? "default" : "outline"}
          className={cn("shrink-0", copied && "bg-green-600 hover:bg-green-600 text-white")}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copié
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copier la liste
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {details.nonResponders.length === 0 ? (
          <p className="text-sm text-green-600 dark:text-green-400 inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Tout le monde a répondu.
          </p>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm break-words mb-4">
              {details.nonRespondersText}
            </div>
            <ul className="divide-y divide-border">
              {details.nonResponders.map((member) => (
                <li key={member.userId} className="py-2">
                  <span className="text-sm font-medium text-foreground">
                    {formatMemberName(member)}
                  </span>
                  {member.instruments.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      — pupitre : {member.instruments.join(", ")}
                    </span>
                  )}
                  {member.comment && (
                    <p className="text-xs italic text-muted-foreground mt-0.5">
                      « {member.comment} »
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// --- Vue d'ensemble (tableau croisé musiciens × prestations) ---------------

type ActiveView = "decision" | "grid";

const VIEW_TABS: {
  id: ActiveView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "decision", label: "Décision par événement", icon: ClipboardList },
  { id: "grid", label: "Vue d'ensemble", icon: Table2 },
];

function ViewSwitcher({
  active,
  onChange,
}: {
  active: ActiveView;
  onChange: (view: ActiveView) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Choisir la vue des présences"
      className="inline-flex items-center gap-1 rounded-lg bg-muted p-1 w-full sm:w-auto"
    >
      {VIEW_TABS.map((tab) => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              // `min-w-0` est nécessaire pour que `truncate` sur le libellé puisse agir :
              // sans lui, un enfant flex ne rétrécit pas sous la largeur de son contenu et
              // le sélecteur débordait de 10px en 375px.
              "flex-1 sm:flex-none min-w-0 inline-flex items-center justify-center gap-1.5 rounded-md px-2 sm:px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
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
        N&apos;a jamais répondu
      </span>
      <span className="inline-flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
        Date limite dépassée
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
  const currentStatus = target ? (target.member.answers[String(target.event.id)] ?? null) : null;

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
              <DialogTitle>Modifier la réponse</DialogTitle>
              <DialogDescription>
                {formatMemberName(target.member)} — {target.event.title} (
                {formatDateShort(target.event.date)})
              </DialogDescription>
            </DialogHeader>

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
                    {isSubmittingThis ? <Loader2 className="w-5 h-5 animate-spin" /> : choice.icon}
                    <span>{choice.label}</span>
                    {isCurrent && !isSubmittingThis && (
                      <span className="ml-auto text-xs font-normal opacity-75">Actuel</span>
                    )}
                  </button>
                );
              })}
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
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
  onEdit,
}: {
  data: PresenceGridData | null;
  loading: boolean;
  error: string | null;
  onEdit: (member: PresenceGridMember, event: PresenceGridEvent) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-72" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm"
      >
        {error}
      </div>
    );
  }

  if (!data || data.events.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={<Table2 className="w-12 h-12" />}
            title="Aucune prestation à venir"
            description="Le tableau croisé apparaîtra dès qu'une prestation à venir demandera une réponse de présence."
          />
        </CardContent>
      </Card>
    );
  }

  if (data.members.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={<Users className="w-12 h-12" />}
            title="Aucun musicien"
            description="Aucun musicien actif n'est enregistré pour le moment."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Table2 className="w-5 h-5 text-muted-foreground" />
            Qui répond, qui ne répond jamais
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Toutes les prestations à venir demandant une réponse, pour un musicien par ligne.
            Touchez ou cliquez une case pour saisir ou corriger une réponse.
          </p>
        </div>
        <GridLegend />
      </CardHeader>
      <CardContent className="p-0">
        {/* `contain:paint` est indispensable : une <table> en `min-width:max-content` reste
            comptée dans la largeur de défilement du document malgré `overflow-x-auto`,
            ce qui faisait défiler la page entière en 375px au lieu du seul tableau. */}
        <div className="overflow-x-auto [contain:paint] border-t border-border">
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
                      }`}
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
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.members.map((member) => {
                const neverAnswered = data.events.every(
                  (event) => (member.answers[String(event.id)] ?? null) === null
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
                            aria-label="N'a jamais répondu"
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
                      const status = member.answers[String(event.id)] ?? null;
                      return (
                        <td key={event.id} className="p-0.5 sm:p-1 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => onEdit(member, event)}
                            aria-label={`${formatMemberName(member)} — ${event.title} : ${CELL_LABELS[statusKey(status)]}. Modifier.`}
                            className="w-full min-h-11 h-11 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                          >
                            <GridStatusGlyph status={status} className="w-7 h-7 sm:w-8 sm:h-8" />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function PresenceAdminClient() {
  const [activeView, setActiveView] = useState<ActiveView>("decision");

  const [events, setEvents] = useState<PresenceEventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [details, setDetails] = useState<PresenceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [gridData, setGridData] = useState<PresenceGridData | null>(null);
  const [gridLoading, setGridLoading] = useState(false);
  const [gridError, setGridError] = useState<string | null>(null);
  const [gridFetched, setGridFetched] = useState(false);

  const [editTarget, setEditTarget] = useState<GridEditTarget | null>(null);
  const [editSubmitting, setEditSubmitting] = useState<PresenceStatus | "none" | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await fetch("/api/admin/presence");
        if (!response.ok) throw new Error("Impossible de charger les événements.");
        const data = (await response.json()) as PresenceEventOption[];
        setEvents(data);
        setSelectedEventId(data[0] ? String(data[0].id) : "");
      } catch (loadError) {
        console.error("Erreur lors du chargement des événements de présence :", loadError);
        setError("Erreur lors du chargement des événements.");
      } finally {
        setLoading(false);
      }
    };

    void loadEvents();
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setDetails(null);
      return;
    }

    const loadDetails = async () => {
      setError(null);
      setDetailsLoading(true);
      try {
        const response = await fetch(`/api/admin/presence?eventId=${selectedEventId}`);
        if (!response.ok) throw new Error("Impossible de charger les présences.");
        setDetails((await response.json()) as PresenceDetails);
      } catch (loadError) {
        console.error("Erreur lors du chargement des présences :", loadError);
        setError("Erreur lors du chargement des présences.");
        setDetails(null);
      } finally {
        setDetailsLoading(false);
      }
    };

    void loadDetails();
  }, [selectedEventId]);

  useEffect(() => {
    if (activeView !== "grid" || gridFetched) return;

    const loadGrid = async () => {
      setGridLoading(true);
      setGridError(null);
      try {
        const response = await fetch("/api/admin/presence?grid=1");
        if (!response.ok) throw new Error("Impossible de charger le tableau croisé.");
        setGridData((await response.json()) as PresenceGridData);
      } catch (loadError) {
        console.error("Erreur lors du chargement du tableau croisé :", loadError);
        setGridError("Erreur lors du chargement du tableau croisé.");
      } finally {
        setGridLoading(false);
        setGridFetched(true);
      }
    };

    void loadGrid();
  }, [activeView, gridFetched]);

  const copyNonResponders = async () => {
    if (!details?.nonRespondersText) return;
    try {
      await navigator.clipboard.writeText(details.nonRespondersText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (copyError) {
      console.error("Erreur lors de la copie de la liste :", copyError);
    }
  };

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
      const payload = (await response.json()) as PresenceDetails | { error?: string };
      if (!response.ok) {
        const message =
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Erreur lors de l'enregistrement de la réponse.";
        throw new Error(message);
      }

      const updated = payload as PresenceDetails;
      const memberInResponse = updated.byInstrument
        .flatMap((breakdown) => breakdown.members)
        .find((member) => member.userId === editTarget.member.userId);
      // On fait confiance à la réponse du serveur quand le membre y figure ; le statut
      // demandé ne sert que de filet de sécurité si, pour une raison quelconque, il en
      // était absent (un statut `null` renvoyé par le serveur reste un `null` valide).
      const resolvedStatus = memberInResponse ? memberInResponse.status : status;

      setGridData((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          members: previous.members.map((member) =>
            member.userId === editTarget.member.userId
              ? {
                  ...member,
                  answers: {
                    ...member.answers,
                    [String(editTarget.event.id)]: resolvedStatus,
                  },
                }
              : member
          ),
        };
      });

      if (String(editTarget.event.id) === selectedEventId) {
        setDetails(updated);
      }

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-16 w-full max-w-md rounded-lg" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Présences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Réponses de présence par pupitre, pour préparer les décisions liées à un événement.
        </p>
      </div>

      <ViewSwitcher active={activeView} onChange={setActiveView} />

      {activeView === "decision" && (
        <div className="space-y-6">
          <div className="max-w-md">
            <label
              htmlFor="presence-event"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Événement
            </label>
            <Select value={selectedEventId} onValueChange={(value) => setSelectedEventId(value)}>
              <SelectTrigger id="presence-event" className="w-full">
                <SelectValue placeholder="Sélectionner un événement" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={String(event.id)}>
                    {event.title} — {formatDateShort(event.date)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm"
            >
              {error}
            </div>
          )}

          {!loading && events.length === 0 && (
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  icon={<ClipboardList className="w-12 h-12" />}
                  title="Aucun événement avec présence requise"
                  description="Activez « Réponse de présence demandée » sur un événement pour le voir apparaître ici."
                />
              </CardContent>
            </Card>
          )}

          {detailsLoading && (
            <div className="space-y-6">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
              </div>
            </div>
          )}

          {!detailsLoading && details && (
            <div className="space-y-6">
              <EventMetaCard event={details.event} />

              {details.lateChanges.length > 0 && (
                <LateChangesBanner members={details.lateChanges} />
              )}

              <ResponseRateHero details={details} />

              <div>
                <h2 className="font-heading text-xl font-bold text-foreground mb-1">
                  Répartition par pupitre
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Un musicien jouant plusieurs instruments est compté dans chaque pupitre ; le taux
                  global le compte une seule fois.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {details.byInstrument.map((breakdown) => (
                    <InstrumentCard key={breakdown.instrument} breakdown={breakdown} />
                  ))}
                </div>
              </div>

              <NonRespondersCard details={details} copied={copied} onCopy={copyNonResponders} />
            </div>
          )}
        </div>
      )}

      {activeView === "grid" && (
        <PresenceGrid
          data={gridData}
          loading={gridLoading}
          error={gridError}
          onEdit={(member, event) => {
            setEditError(null);
            setEditTarget({ member, event });
          }}
        />
      )}

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
