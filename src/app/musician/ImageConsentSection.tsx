import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import type { ProfileWithInstruments } from "./profile-validation";

interface ImageConsentSectionProps {
  profile: ProfileWithInstruments;
  onProfileChange: (patch: Partial<ProfileWithInstruments>) => void;
}

export function ImageConsentSection({ profile, onProfileChange }: ImageConsentSectionProps) {
  return (
    <Card id="image-consent">
      <CardHeader>
        <CardTitle>
          Droit à l&apos;image <span className="text-destructive">*</span>
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

        <div className="flex flex-col gap-2 pt-2">
          <label className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-muted/30">
            <input
              type="radio"
              name="image_consent"
              checked={profile.image_consent === 1}
              onChange={() => onProfileChange({ image_consent: 1 })}
              className="h-4 w-4 text-primary"
            />
            <span className="text-sm">J&apos;autorise l&apos;utilisation de mon image</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-muted/30">
            <input
              type="radio"
              name="image_consent"
              checked={profile.image_consent === 0}
              onChange={() => onProfileChange({ image_consent: 0 })}
              className="h-4 w-4 text-primary"
            />
            <span className="text-sm">Je n&apos;autorise pas l&apos;utilisation de mon image</span>
          </label>
          {profile.image_consent === 0 && (
            <p className="mt-1 px-2 text-sm text-destructive">
              Rappel : la reproduction de l&apos;image d&apos;un groupe dans un lieu public ou sur
              scène peut être permise sans solliciter le consentement individuel de chaque personne
              photographiée.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
