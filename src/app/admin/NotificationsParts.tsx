"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Mail, Monitor, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { formatDateShort } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  formatDateTime,
  stageLabel,
  type NotificationLogItem,
  type NotificationsPreview,
  type PreviewItem,
} from "./notifications-client";

// --- Aperçu : qui recevrait quoi -------------------------------------------------

// --- Aperçu de l'e-mail mis en forme ------------------------------------------------

type PreviewWidth = "desktop" | "mobile";

const PREVIEW_WIDTHS: Record<PreviewWidth, { label: string; px: number }> = {
  desktop: { label: "Ordinateur", px: 640 },
  mobile: { label: "Téléphone", px: 375 },
};

/**
 * Montre l'e-mail tel qu'il arrivera. Le HTML vient du serveur mais est affiché dans un
 * cadre isolé (`sandbox=""`) : aucun script, aucun lien actif, aucun accès à l'admin.
 */
function EmailPreviewDialog({
  item,
  html,
  open,
  onOpenChange,
}: {
  item: PreviewItem;
  html: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [width, setWidth] = useState<PreviewWidth>("desktop");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden grid-rows-[auto_auto_minmax(0,1fr)]">
        <DialogHeader>
          <DialogTitle>Aperçu de l&apos;e-mail</DialogTitle>
          <DialogDescription>
            Pour {item.recipientName ?? item.recipientEmail} : {item.subject}. Rien n&apos;est
            envoyé en regardant cet aperçu.
          </DialogDescription>
        </DialogHeader>
        <div role="group" aria-label="Largeur de l'aperçu" className="flex gap-2">
          {(Object.keys(PREVIEW_WIDTHS) as PreviewWidth[]).map((key) => {
            const Icon = key === "desktop" ? Monitor : Smartphone;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={width === key}
                onClick={() => setWidth(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors cursor-pointer",
                  width === key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {PREVIEW_WIDTHS[key].label}
              </button>
            );
          })}
        </div>
        <div className="min-h-0 overflow-auto rounded-lg border border-border bg-muted/40 p-3">
          <iframe
            title="Aperçu de l'e-mail"
            sandbox=""
            srcDoc={html}
            style={{ width: PREVIEW_WIDTHS[width].px, maxWidth: "100%" }}
            className="mx-auto block h-[68vh] min-h-[24rem] rounded-md border-0 bg-white"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewRow({ item }: { item: PreviewItem }) {
  const [open, setOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  return (
    <Fragment>
      <tr className="border-b border-border align-top">
        <td className="px-3 py-2">
          <p className="font-medium text-foreground">{item.recipientName ?? item.recipientEmail}</p>
          {item.recipientName && (
            <p className="text-xs text-muted-foreground break-all">{item.recipientEmail}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={`${open ? "Masquer" : "Voir"} le texte pour ${item.recipientEmail}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline underline-offset-2 hover:text-primary cursor-pointer"
            >
              {open ? (
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              )}
              {open ? "Masquer le texte" : "Voir le texte"}
            </button>
            {item.html && (
              <button
                type="button"
                onClick={() => setMailOpen(true)}
                aria-label={`Voir l'e-mail pour ${item.recipientEmail}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline underline-offset-2 hover:text-primary cursor-pointer"
              >
                <Mail className="h-3 w-3" aria-hidden="true" />
                Voir l&apos;e-mail
              </button>
            )}
            {item.alreadySent && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Déjà envoyé
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2">
          <p>{item.eventTitle}</p>
          <p className="text-xs text-muted-foreground">{formatDateShort(item.eventDate)}</p>
        </td>
        <td className="px-3 py-2 whitespace-nowrap">{stageLabel(item.stages, item.stage)}</td>
        <td className="px-3 py-2">
          {item.subjectNames.length > 0 ? item.subjectNames.join(", ") : "—"}
        </td>
        <td className="px-3 py-2">
          <p>{item.subject}</p>
        </td>
      </tr>
      {item.html && (
        <EmailPreviewDialog
          item={item}
          html={item.html}
          open={mailOpen}
          onOpenChange={setMailOpen}
        />
      )}
      {open && (
        <tr className="border-b border-border bg-muted/30">
          <td colSpan={5} className="px-3 py-3">
            {/* Collé à gauche et borné à l'écran : le tableau défile, pas le texte. */}
            <div className="sticky left-3 max-w-[calc(100vw-9rem)] md:max-w-none">
              <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground">
                {item.text}
              </pre>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export function PreviewTable({ preview }: { preview: NotificationsPreview }) {
  if (preview.items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="preview-empty">
        Aucun rappel à envoyer aujourd&apos;hui ({formatDateShort(preview.today)}).
      </p>
    );
  }
  const waiting = preview.items.filter((item) => !item.alreadySent).length;
  return (
    <div className="space-y-3" data-testid="preview">
      <p className="text-sm text-foreground">
        <span className="font-medium">
          {preview.items.length} e-mail{preview.items.length > 1 ? "s" : ""}
        </span>{" "}
        pour le {formatDateShort(preview.today)}
        {waiting !== preview.items.length &&
          ` (${waiting} pas encore envoyé${waiting > 1 ? "s" : ""})`}
        . Rien n&apos;est envoyé en regardant cette liste.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-border text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">Destinataire</th>
              <th className="px-3 py-2 font-medium">Événement</th>
              <th className="px-3 py-2 font-medium">Rappel</th>
              <th className="px-3 py-2 font-medium">Musiciens concernés</th>
              <th className="px-3 py-2 font-medium">Objet</th>
            </tr>
          </thead>
          <tbody>
            {preview.items.map((item, index) => (
              <PreviewRow key={`${item.recipientEmail}-${item.eventTitle}-${index}`} item={item} />
            ))}
          </tbody>
        </table>
      </div>
      {preview.capped && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          La liste est limitée : au plus 30 e-mails partent par jour, les suivants attendent le
          lendemain.
        </p>
      )}
    </div>
  );
}

// --- Journal des envois ----------------------------------------------------------

export function LogTable({ log }: { log: NotificationLogItem[] }) {
  if (log.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="log-empty">
        Aucun e-mail envoyé pour le moment.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border" data-testid="log">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-border text-left text-muted-foreground">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Destinataire</th>
            <th className="px-3 py-2 font-medium">Événement</th>
            <th className="px-3 py-2 font-medium">Musiciens concernés</th>
            <th className="px-3 py-2 font-medium">État</th>
          </tr>
        </thead>
        <tbody>
          {log.map((entry) => {
            const sent = entry.status === "sent";
            return (
              <tr key={entry.id} className="border-b border-border last:border-0 align-top">
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {formatDateTime(entry.sentAt ?? entry.createdAt) ?? "—"}
                </td>
                <td className="px-3 py-2 break-all">{entry.recipientEmail}</td>
                <td className="px-3 py-2">
                  {entry.eventTitle ?? "—"}
                  {entry.stage !== null && (
                    <span className="block text-xs text-muted-foreground">
                      {stageLabel([], entry.stage)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {entry.subjectNames.length > 0 ? entry.subjectNames.join(", ") : "—"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      sent
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                    )}
                    title={
                      sent
                        ? undefined
                        : "Envoi commencé mais pas confirmé : il ne sera pas renvoyé tout seul."
                    }
                  >
                    {sent ? "Envoyé" : "Non confirmé"}
                  </span>
                  {entry.error && (
                    <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
                      {entry.error}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
