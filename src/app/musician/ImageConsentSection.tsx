"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { getActingLabels } from "./acting-labels";
import type { ImageConsentDetail, ImageConsentGuardian } from "./musician-types";
import type { ProfileWithInstruments } from "./profile-validation";

interface ImageConsentSectionProps {
  profile: ProfileWithInstruments;
  onProfileChange: (patch: Partial<ProfileWithInstruments>) => void;
  /** Lecture seule : le choix appartient au responsable légal (`imageConsentLocked`). */
  locked?: boolean;
  /** Droit à l'image d'un musicien relié à des responsables (réponse de chacun). */
  detail?: ImageConsentDetail;
  /**
   * Prénom du musicien quand un responsable agit pour lui (sinon `null`). Les textes
   * passent alors à la troisième personne, et c'est la réponse du responsable qu'on saisit.
   */
  actingForName?: string | null;
}

function AnswerBadge({ consent }: { consent: ImageConsentGuardian["consent"] }) {
  const [label, className] =
    consent === 1
      ? ["Oui", "bg-success/15 text-success"]
      : consent === 0
        ? ["Non", "bg-destructive/10 text-destructive"]
        : ["Pas encore répondu", "bg-muted text-muted-foreground"];
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        className
      )}
    >
      {label}
    </span>
  );
}

function GuardianAnswers({
  title,
  guardians,
}: {
  title: string;
  guardians: ImageConsentGuardian[];
}) {
  if (guardians.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <ul aria-label={title} className="divide-y divide-border rounded-lg border border-border">
        {guardians.map((guardian, index) => (
          <li
            key={`${guardian.name}-${index}`}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5 text-sm"
          >
            <span className="min-w-0 text-foreground">
              {guardian.name}
              {guardian.relation && (
                <span className="text-muted-foreground"> ({guardian.relation})</span>
              )}
            </span>
            <AnswerBadge consent={guardian.consent} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EffectiveStatus({
  text,
  effective,
  rule,
  pendingNote,
}: {
  text: string;
  effective: 0 | 1 | null;
  rule: string;
  /** Rappel quand la réponse choisie n'est pas encore enregistrée. */
  pendingNote?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border p-4 text-sm",
        effective === 1
          ? "border-success/30 bg-success/10"
          : effective === 0
            ? "border-destructive/30 bg-destructive/10"
            : "border-border bg-muted/50"
      )}
    >
      <p className="font-semibold text-foreground">{text}</p>
      <p className="mt-1 text-muted-foreground">{rule}</p>
      {pendingNote && <p className="mt-2 font-medium text-warning">{pendingNote}</p>}
    </div>
  );
}

export function ImageConsentSection({
  profile,
  onProfileChange,
  locked = false,
  detail,
  actingForName = null,
}: ImageConsentSectionProps) {
  const labels = getActingLabels(actingForName);
  const delegatedAndLinked = Boolean(detail?.linked && actingForName);
  const readOnlyLinked = Boolean(detail?.linked && !actingForName && locked);
  const noAnswerYet = profile.image_consent === null || profile.image_consent === undefined;

  const radios: ReactNode = (
    <fieldset className="flex flex-col gap-2 pt-2">
      {delegatedAndLinked ? (
        <legend className="mb-1 text-sm font-semibold text-foreground">
          {labels.consentYourAnswer}
        </legend>
      ) : (
        <legend className="sr-only">Droit à l&apos;image</legend>
      )}
      <label
        className={cn(
          "flex items-center gap-3 rounded p-2",
          locked ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:bg-muted/30"
        )}
      >
        <input
          type="radio"
          name="image_consent"
          checked={profile.image_consent === 1}
          disabled={locked}
          aria-describedby={locked ? "image-consent-locked" : undefined}
          onChange={() => onProfileChange({ image_consent: 1 })}
          className="h-4 w-4 text-primary"
        />
        <span className="text-sm">{labels.consentAllow}</span>
      </label>
      <label
        className={cn(
          "flex items-center gap-3 rounded p-2",
          locked ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:bg-muted/30"
        )}
      >
        <input
          type="radio"
          name="image_consent"
          checked={profile.image_consent === 0}
          disabled={locked}
          aria-describedby={locked ? "image-consent-locked" : undefined}
          onChange={() => onProfileChange({ image_consent: 0 })}
          className="h-4 w-4 text-primary"
        />
        <span className="text-sm">{labels.consentDeny}</span>
      </label>
      {profile.image_consent === 0 && (
        <p className="mt-1 px-2 text-sm text-destructive">
          Rappel : la reproduction de l&apos;image d&apos;un groupe dans un lieu public ou sur scène
          peut être permise sans solliciter le consentement individuel de chaque personne
          photographiée.
        </p>
      )}
    </fieldset>
  );

  return (
    <Card id="image-consent">
      <CardHeader>
        <CardTitle>
          Droit à l&apos;image{" "}
          {!locked && !(delegatedAndLinked && detail?.effective != null) && (
            <span className="text-destructive">*</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p>
            Dans le cadre des activités de l&apos;association « Les Amis de l&apos;Harmonie » et de
            l&apos;Harmonie Municipale de Sucy-en-Brie, des photographies, vidéos ou captations
            numériques peuvent être réalisées.
          </p>
          <p>Ces images peuvent représenter :</p>
          <ul className="ml-2 list-inside list-disc space-y-1">
            <li>moi-même</li>
            <li>et/ou mon enfant (si représentant légal)</li>
          </ul>
          <p>
            Si vous acceptez, vous autorisez l&apos;association « Les Amis de l&apos;Harmonie » et
            l&apos;Harmonie Municipale de Sucy-en-Brie à :
          </p>
          <ul className="ml-2 list-inside list-disc space-y-1">
            <li>
              fixer, reproduire et communiquer au public les photographies, vidéos ou captations
              numériques réalisées dans ce cadre ;
            </li>
            <li>
              exploiter et utiliser ces images, directement ou par l&apos;intermédiaire de tiers,
              sous toute forme et sur tous supports (presse, livre, supports numériques, exposition,
              publicité, projection publique, concours, site internet, réseaux sociaux, etc.) ;
            </li>
            <li>
              utiliser ces images pour un territoire illimité et sans limitation de durée,
              intégralement ou par extraits.
            </li>
          </ul>
          <p>
            Cette autorisation est consentie à titre gratuit et ne donnera lieu à aucune
            rémunération.
          </p>
          <p>
            Les bénéficiaires de l&apos;autorisation s&apos;engagent à ne pas utiliser les images
            dans un cadre susceptible de porter atteinte à la vie privée, à la dignité ou à la
            réputation des personnes concernées.
          </p>
          <p>
            Vous garantissez ne pas être lié(e), ni la personne que vous représentez le cas échéant,
            par un contrat exclusif relatif à l&apos;utilisation de votre image ou de votre nom.
          </p>
          <p>
            Conformément à la réglementation en vigueur, vous pouvez retirer votre consentement à
            tout moment par demande écrite adressée à l&apos;association (sans effet rétroactif sur
            les utilisations déjà réalisées).
          </p>
        </div>

        {readOnlyLinked && detail ? (
          <>
            <div
              id="image-consent-locked"
              role="note"
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4 text-sm text-foreground"
            >
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p>
                Ce choix revient à vos parents (ou responsables légaux) : ils peuvent le modifier
                depuis leur compte.
              </p>
            </div>
            <EffectiveStatus
              text={labels.consentStatus(detail.effective)}
              effective={detail.effective}
              rule={labels.consentRule}
            />
            <GuardianAnswers title={labels.consentOthersTitle} guardians={detail.guardians} />
          </>
        ) : delegatedAndLinked && detail ? (
          <>
            {radios}
            <GuardianAnswers
              title={labels.consentOthersTitle}
              guardians={detail.guardians.filter((guardian) => !guardian.isYou)}
            />
            <EffectiveStatus
              text={labels.consentStatus(detail.effective)}
              effective={detail.effective}
              rule={labels.consentRule}
              pendingNote={
                (profile.image_consent ?? null) !== detail.mine
                  ? "Votre nouvelle réponse sera prise en compte après l'enregistrement."
                  : undefined
              }
            />
          </>
        ) : (
          <>
            {locked && (
              <div
                id="image-consent-locked"
                role="note"
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4 text-sm text-foreground"
              >
                <Lock
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <p>
                  Ce choix revient à vos parents (ou responsables légaux) : ils peuvent le modifier
                  depuis leur compte.
                  {noAnswerYet ? " Aucune réponse n'a encore été enregistrée." : ""}
                </p>
              </div>
            )}
            {radios}
          </>
        )}
      </CardContent>
    </Card>
  );
}
