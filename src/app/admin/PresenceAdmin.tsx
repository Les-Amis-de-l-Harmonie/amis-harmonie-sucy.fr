"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  ClipboardList,
  Copy,
  Globe,
  HelpCircle,
  Lock,
  MapPin,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
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

function formatMemberName(member: PresenceMember): string {
  return [member.firstName, member.lastName].filter(Boolean).join(" ") || `Membre ${member.userId}`;
}

function formatOtherInstruments(member: PresenceMember, instrument: string): string {
  return member.instruments
    .filter((memberInstrument) => memberInstrument !== instrument)
    .join(", ");
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
  const todayIso = new Date().toISOString().slice(0, 10);
  const deadlineState: "none" | "open" | "passed" = !deadline
    ? "none"
    : deadline < todayIso
      ? "passed"
      : "open";
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

          {deadlineState === "none" && (
            <Pill tone="gray" icon={<Clock className="w-3.5 h-3.5" />}>
              Pas de date limite
            </Pill>
          )}
          {deadlineState === "open" && (
            <Pill tone="blue" icon={<Clock className="w-3.5 h-3.5" />}>
              Date limite : {deadlineLabel}
            </Pill>
          )}
          {deadlineState === "passed" && (
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

export function PresenceAdminClient() {
  const [events, setEvents] = useState<PresenceEventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [details, setDetails] = useState<PresenceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

          {details.lateChanges.length > 0 && <LateChangesBanner members={details.lateChanges} />}

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
  );
}
