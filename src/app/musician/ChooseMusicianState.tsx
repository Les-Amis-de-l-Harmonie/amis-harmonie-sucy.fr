"use client";

import type { ReactNode } from "react";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { useMusicianSession } from "./MusicianSession";
import { ProfileOptionsList, SwitchError, useProfileSwitch } from "./ProfileSwitcher";

interface ChooseMusicianStateProps {
  /** Titre de la page, pour garder un <h1> comme les autres pages du portail. */
  title?: string;
  /** Texte sous « Choisissez un musicien », quand le contexte de la page l'exige. */
  intro?: string;
  /** Lien « Mon profil » en bas de carte (inutile sur la page profil elle-même). */
  showProfileLink?: boolean;
}

/**
 * État d'une page du portail pour un responsable sur son propre compte : ces
 * pages parlent d'un musicien, pas d'un responsable. On propose les enfants
 * reliés plutôt que d'appeler des API qui répondraient 403.
 */
export function ChooseMusicianState({
  title,
  intro,
  showProfileLink = true,
}: ChooseMusicianStateProps) {
  const { profiles } = useMusicianSession();
  const { switchTo, pendingKey, error } = useProfileSwitch();
  const children = profiles.filter((profile) => !profile.isSelf);

  return (
    <div className="space-y-6">
      {title && <h1 className="text-3xl font-bold text-foreground">{title}</h1>}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Choisissez un musicien</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {children.length > 0
                  ? (intro ??
                    "Cette page concerne un musicien. Choisissez celui pour qui vous souhaitez agir.")
                  : "Aucun musicien n'est relié à votre compte pour l'instant. Contactez le bureau de l'association pour faire le lien."}
              </p>
            </div>
          </div>
          {children.length > 0 && (
            <ProfileOptionsList
              profiles={children}
              currentUserId={null}
              markCurrent={false}
              variant="choice"
              onSelect={(profile) => void switchTo(profile)}
              pendingKey={pendingKey}
            />
          )}
          <SwitchError message={error} />
          {showProfileLink && (
            <p className="text-sm text-muted-foreground">
              Pour modifier vos propres informations, rendez-vous dans{" "}
              <a
                href="/musician/profile"
                className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
              >
                Mon profil
              </a>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface MusicianChoiceGateProps {
  title?: string;
  children: ReactNode;
}

/**
 * N'affiche (et donc ne monte) `children` que si un musicien est actif. Les
 * enfants sont des éléments non encore rendus : leurs hooks et leurs `fetch`
 * ne s'exécutent pas pour un responsable sur « Moi ».
 */
export function MusicianChoiceGate({ title, children }: MusicianChoiceGateProps) {
  const { needsMusicianChoice } = useMusicianSession();
  if (needsMusicianChoice) return <ChooseMusicianState title={title} />;
  return <>{children}</>;
}
