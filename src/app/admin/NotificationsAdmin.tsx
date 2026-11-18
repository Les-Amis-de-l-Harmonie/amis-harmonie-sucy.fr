"use client";

import { useEffect, useId, useState } from "react";
import {
  AlertTriangle,
  BellOff,
  BellRing,
  Eye,
  FlaskConical,
  Loader2,
  Lock,
  Send,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { NOTIFICATION_MODES, type NotificationMode } from "@/db/types";
import { cn } from "@/lib/utils";
import {
  apiError,
  fetchNotifications,
  fetchPreview,
  formatDateTime,
  hoursSince,
  isPlausibleEmail,
  MODE_LABELS,
  saveNotificationSettings,
  sendTestNow,
  STALE_RUN_HOURS,
  type NotificationSettingsView,
  type NotificationsOverview,
  type NotificationsPreview,
} from "./notifications-client";
import { LogTable, PreviewTable } from "./NotificationsParts";

// --- État actuel, bien visible ------------------------------------------------------

function StateBanner({ settings }: { settings: NotificationSettingsView }) {
  const mode = settings.presenceRemindersMode;
  const recipient = settings.testRecipient?.trim() ?? "";
  const testReady = mode === "test" && isPlausibleEmail(recipient);

  let tone =
    "border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";
  let icon = <BellOff className="h-7 w-7 shrink-0" aria-hidden="true" />;
  let title = "Désactivé : aucun e-mail n'est envoyé";
  let detail =
    "Ni les musiciens ni les parents ne reçoivent de rappel. C'est l'état normal tant que vous n'avez pas décidé d'activer.";

  if (mode === "test" && testReady) {
    tone =
      "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100";
    icon = <FlaskConical className="h-7 w-7 shrink-0" aria-hidden="true" />;
    title = `Essai : un seul e-mail récapitulatif part vers ${recipient}`;
    detail = "Il liste ce qui serait envoyé. Aucun musicien et aucun parent ne reçoit de message.";
  } else if (mode === "test") {
    title = "Essai sans adresse valide : aucun e-mail n'est envoyé";
    detail =
      "Sans adresse d'essai correcte, le mode Essai se comporte comme Désactivé. Ni les musiciens ni les parents ne reçoivent rien.";
  } else if (mode === "on") {
    tone =
      "border-emerald-400 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-100";
    icon = <BellRing className="h-7 w-7 shrink-0" aria-hidden="true" />;
    title = "Activé : les rappels partent vraiment";
    detail =
      "Chaque jour, les musiciens qui n'ont pas répondu et leurs parents reçoivent un rappel.";
  }

  return (
    <div
      role="status"
      data-testid="state-banner"
      data-mode={mode}
      className={cn("flex items-start gap-4 rounded-xl border-2 p-5", tone)}
    >
      {icon}
      <div>
        <p className="text-xl font-bold leading-tight">{title}</p>
        <p className="mt-1 text-sm opacity-90">{detail}</p>
      </div>
    </div>
  );
}

function LastRunCard({ settings }: { settings: NotificationSettingsView }) {
  const when = formatDateTime(settings.lastRunAt);
  const hours = hoursSince(settings.lastRunAt);
  const stale = hours !== null && hours > STALE_RUN_HOURS;
  return (
    <Card data-testid="last-run">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Dernière exécution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {when ? (
          <>
            <p className="text-lg font-semibold text-foreground">{when}</p>
            {settings.lastRunSummary && (
              <p className="text-sm text-foreground">{settings.lastRunSummary}</p>
            )}
          </>
        ) : (
          <p className="text-lg font-semibold text-foreground">Jamais exécutée</p>
        )}
        {stale && (
          <p className="flex items-start gap-1.5 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            La tâche n&apos;a pas tourné depuis plus d&apos;un jour et demi. Vérifiez qu&apos;elle
            est bien programmée.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          La tâche tourne chaque jour, même quand les rappels sont désactivés : elle note alors
          seulement qu&apos;elle est passée, sans rien envoyer.
        </p>
      </CardContent>
    </Card>
  );
}

// --- Choix du mode --------------------------------------------------------------------

const MODE_DESCRIPTIONS: Record<NotificationMode, string> = {
  off: "Aucun e-mail. C'est le réglage par défaut.",
  test: "Un seul e-mail récapitulatif, envoyé à l'adresse d'essai. Il liste ce qui serait envoyé. Rien aux musiciens ni aux parents.",
  on: "Les rappels partent vraiment, aux musiciens et à leurs parents.",
};

function ModeChoice({
  value,
  onChange,
  disabled,
}: {
  value: NotificationMode;
  onChange: (mode: NotificationMode) => void;
  disabled: boolean;
}) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label="Mode des rappels de présence"
      className="grid gap-3 md:grid-cols-3"
    >
      {NOTIFICATION_MODES.map((mode) => (
        <label key={mode} className="block cursor-pointer has-[:disabled]:cursor-not-allowed">
          <input
            type="radio"
            name={name}
            value={mode}
            checked={value === mode}
            disabled={disabled}
            onChange={() => onChange(mode)}
            className="peer sr-only"
          />
          <span
            className={cn(
              "block h-full rounded-lg border-2 p-3 transition-colors",
              "border-border bg-card hover:bg-muted/50",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-primary",
              "peer-disabled:opacity-70",
              value === mode &&
                (mode === "on"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                  : mode === "test"
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                    : "border-slate-500 bg-slate-100 dark:bg-slate-800")
            )}
          >
            <span className="block text-sm font-semibold text-foreground">{MODE_LABELS[mode]}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {MODE_DESCRIPTIONS[mode]}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

// --- Page -------------------------------------------------------------------------------

export function NotificationsAdminClient() {
  const recipientId = useId();
  const [overview, setOverview] = useState<NotificationsOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draftMode, setDraftMode] = useState<NotificationMode>("off");
  const [draftRecipient, setDraftRecipient] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [preview, setPreview] = useState<NotificationsPreview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [testBusy, setTestBusy] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const load = async () => {
    setLoadError(null);
    const result = await fetchNotifications();
    const { settings, canEdit, log } = result.data;
    if (!result.ok || !settings) {
      setLoadError(apiError(result));
      return;
    }
    setOverview({ settings, canEdit: canEdit === true, log: log ?? [] });
    setDraftMode(settings.presenceRemindersMode);
    setDraftRecipient(settings.testRecipient ?? "");
  };

  useEffect(() => {
    void load();
  }, []);

  if (loadError && !overview) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">E-mails automatiques</h1>
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
        >
          {loadError}
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="space-y-4" aria-busy="true">
        <h1 className="text-3xl font-bold text-foreground">E-mails automatiques</h1>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const { settings, canEdit, log } = overview;
  const savedMode = settings.presenceRemindersMode;
  const savedRecipient = settings.testRecipient ?? "";
  const dirty = draftMode !== savedMode || draftRecipient.trim() !== savedRecipient.trim();
  const recipientFilled = draftRecipient.trim() !== "";
  // Exigée en mode Essai ; ailleurs elle est facultative, mais ne doit pas être invalide.
  const recipientMissing = draftMode === "test" && !isPlausibleEmail(draftRecipient);
  const recipientInvalid = recipientFilled && !isPlausibleEmail(draftRecipient);

  const persist = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    const result = await saveNotificationSettings({
      presenceRemindersMode: draftMode,
      testRecipient: draftRecipient.trim() || null,
    });
    setSaving(false);
    setConfirmOpen(false);
    if (!result.ok) {
      setSaveError(apiError(result));
      return;
    }
    const next: NotificationSettingsView = result.data.settings ?? {
      ...settings,
      presenceRemindersMode: draftMode,
      testRecipient: draftRecipient.trim() || null,
    };
    setOverview({ ...overview, settings: next });
    setDraftMode(next.presenceRemindersMode);
    setDraftRecipient(next.testRecipient ?? "");
    setTestMessage(null);
    setTestError(null);
    setSaveMessage(
      next.presenceRemindersMode === "on"
        ? "Rappels activés. Les premiers partiront à la prochaine exécution de la tâche."
        : next.presenceRemindersMode === "test"
          ? "Mode essai enregistré. Aucun musicien ni parent ne recevra de message."
          : "Rappels désactivés. Aucun e-mail ne sera envoyé."
    );
  };

  const requestSave = () => {
    // Passer à « Activé » est la seule action qui déclenche de vrais envois : on confirme.
    if (draftMode === "on" && savedMode !== "on") setConfirmOpen(true);
    else void persist();
  };

  const loadPreview = async () => {
    setPreviewBusy(true);
    setPreviewError(null);
    const result = await fetchPreview();
    setPreviewBusy(false);
    const { today, items, capped } = result.data;
    if (!result.ok || !today || !items) {
      setPreviewError(apiError(result));
      return;
    }
    setPreview({ today, items, capped: capped === true });
  };

  const sendTest = async () => {
    setTestBusy(true);
    setTestError(null);
    setTestMessage(null);
    setSaveMessage(null);
    const result = await sendTestNow();
    setTestBusy(false);
    if (!result.ok) {
      setTestError(apiError(result));
      return;
    }
    const count = result.data.itemCount ?? 0;
    setTestMessage(
      `Récapitulatif envoyé à ${result.data.sentTo ?? savedRecipient} (${count} rappel${count > 1 ? "s" : ""} listé${count > 1 ? "s" : ""}).`
    );
    void load();
  };

  const showSendTest = canEdit && savedMode === "test";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">E-mails automatiques</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Les e-mails que le site envoie tout seul. Rien ne part tant que vous ne l&apos;avez pas
          décidé. Le lien de connexion et les e-mails de réservation ne sont pas concernés : ils
          partent comme avant.
        </p>
      </div>

      <StateBanner settings={settings} />
      <LastRunCard settings={settings} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Rappels de présence</CardTitle>
          <p className="text-sm text-muted-foreground">
            Quand un musicien n&apos;a pas répondu à un événement qui demande une réponse, il reçoit
            un rappel s&apos;il a une adresse e-mail, et ses parents aussi. Deux rappels : 7 jours
            puis 2 jours avant la date limite de réponse (ou avant l&apos;événement s&apos;il
            n&apos;y a pas de date limite). Un e-mail par personne et par rappel, jamais deux fois
            le même.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {!canEdit && (
            <p
              className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm"
              data-testid="read-only-note"
            >
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              Seul un super-administrateur peut modifier ces réglages. Vous pouvez tout consulter
              ici.
            </p>
          )}

          <ModeChoice
            value={draftMode}
            onChange={(mode) => {
              setDraftMode(mode);
              setSaveMessage(null);
              setSaveError(null);
            }}
            disabled={!canEdit || saving}
          />

          {(canEdit || recipientFilled) && (
            <div className="grid max-w-md gap-2">
              <Label htmlFor={recipientId}>Adresse d&apos;essai</Label>
              <Input
                id={recipientId}
                type="email"
                value={draftRecipient}
                readOnly={!canEdit}
                onChange={(event) => setDraftRecipient(event.target.value)}
                placeholder="prenom.nom@email.com"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                {canEdit && recipientMissing
                  ? "Indiquez une adresse e-mail valide pour pouvoir enregistrer le mode Essai."
                  : canEdit && recipientInvalid
                    ? "Cette adresse e-mail n'est pas valide."
                    : `Sert seulement en mode Essai : le récapitulatif part ici, et nulle part ailleurs.${canEdit ? " Vous pouvez l'effacer." : ""}`}
              </p>
            </div>
          )}

          {saveError && (
            <p
              role="alert"
              className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
            >
              {saveError}
            </p>
          )}
          {saveMessage && (
            <p
              role="status"
              className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300"
            >
              {saveMessage}
            </p>
          )}

          {canEdit && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={requestSave}
                disabled={!dirty || saving || recipientMissing || recipientInvalid}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
              {dirty && (
                <span className="text-sm text-muted-foreground">
                  Modifications non enregistrées : rien n&apos;a changé tant que vous
                  n&apos;enregistrez pas.
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showSendTest && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Essai</CardTitle>
            <p className="text-sm text-muted-foreground">
              Envoie maintenant le récapitulatif à {savedRecipient || "l'adresse d'essai"}. Seule
              cette adresse reçoit un message.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => void sendTest()}
                disabled={testBusy || dirty}
              >
                {testBusy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Envoyer l&apos;essai maintenant
              </Button>
              {dirty && (
                <span className="text-sm text-muted-foreground">
                  Enregistrez d&apos;abord vos modifications.
                </span>
              )}
            </div>
            {testMessage && (
              <p
                role="status"
                className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300"
              >
                {testMessage}
              </p>
            )}
            {testError && (
              <p
                role="alert"
                className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
              >
                {testError}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Qui recevrait quoi</CardTitle>
          <p className="text-sm text-muted-foreground">
            Les e-mails qui partiraient aujourd&apos;hui si les rappels étaient activés.
            {savedMode === "on" ? "" : " Les rappels ne sont pas activés : rien ne part vraiment."}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadPreview()}
            disabled={previewBusy}
          >
            {previewBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            Voir qui recevrait
          </Button>
          {previewError && (
            <p
              role="alert"
              className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
            >
              {previewError}
            </p>
          )}
          {preview && <PreviewTable preview={preview} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Journal des envois</CardTitle>
          <p className="text-sm text-muted-foreground">Les 50 derniers e-mails automatiques.</p>
        </CardHeader>
        <CardContent>
          <LogTable log={log} />
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !saving && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activer les rappels automatiques ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>À partir de maintenant, le site enverra de vrais e-mails, chaque jour :</p>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>
                    aux <strong>musiciens</strong> qui n&apos;ont pas répondu à un événement et qui
                    ont une adresse personnelle ;
                  </li>
                  <li>
                    à leurs <strong>parents</strong> (responsables légaux actifs), pour les enfants
                    qui n&apos;ont pas répondu ;
                  </li>
                  <li>7 jours, puis 2 jours avant la date limite de réponse ;</li>
                  <li>
                    un seul e-mail par personne et par rappel, jamais en double, et au plus 30
                    e-mails par jour.
                  </li>
                </ul>
                <p>
                  Pour voir d&apos;abord qui recevrait quoi, annulez et utilisez « Voir qui
                  recevrait ». Vous pourrez revenir à « Désactivé » à tout moment.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>
              Annuler : rien n&apos;est envoyé
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                void persist();
              }}
            >
              {saving ? "Activation..." : "Oui, activer les rappels"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
