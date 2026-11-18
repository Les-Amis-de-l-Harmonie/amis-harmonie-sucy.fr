"use client";

import { useId, useState } from "react";
import { ArrowLeftRight, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { fullName, useMusicianSession } from "./MusicianSession";
import {
  ProfileAvatar,
  ProfileOptionsList,
  SwitchError,
  useProfileSwitch,
} from "./ProfileSwitcher";

/**
 * Bandeau affiché en haut de chaque page du portail quand un responsable agit
 * pour un enfant. Il reste dans le flux (jamais fixé) : la navigation, la barre
 * du bas et la barre d'actions du profil gardent leur place. Sur téléphone,
 * l'en-tête rappelle aussi le prénom en permanence (voir `MusicianMobileHeader`).
 */
export function DelegationBanner() {
  const { delegated, effective, profiles, userId } = useMusicianSession();
  const { switchTo, pendingKey, error, busy } = useProfileSwitch();
  const [choosing, setChoosing] = useState(false);
  const listId = useId();

  if (!delegated || !effective) return null;

  const self = profiles.find((profile) => profile.isSelf);
  // « Changer » n'a de sens que s'il existe un autre enfant que celui affiché.
  const otherChildren = profiles.filter((profile) => !profile.isSelf && profile.userId !== userId);

  return (
    <section
      aria-label="Profil actif"
      className="mb-6 rounded-xl border border-primary/25 bg-primary/10 p-3 sm:px-4"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-60 items-center gap-3">
          <ProfileAvatar profile={effective} />
          <p className="min-w-0 text-sm text-foreground">
            Vous agissez pour{" "}
            <strong className="font-semibold">{fullName(effective) || "ce musicien"}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {otherChildren.length > 0 && (
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 bg-background"
              aria-expanded={choosing}
              aria-controls={listId}
              onClick={() => setChoosing((value) => !value)}
            >
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              Changer
            </Button>
          )}
          {self && (
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 bg-background"
              disabled={busy}
              onClick={() => void switchTo(self)}
            >
              {pendingKey === "self" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Undo2 className="h-4 w-4" aria-hidden="true" />
              )}
              Revenir à mon espace
            </Button>
          )}
        </div>
      </div>

      <div
        id={listId}
        hidden={!choosing}
        className="mt-3 space-y-2 border-t border-primary/20 pt-3"
      >
        <ProfileOptionsList
          profiles={profiles.filter((profile) => !profile.isSelf)}
          currentUserId={userId}
          onSelect={(profile) => void switchTo(profile)}
          pendingKey={pendingKey}
        />
      </div>
      <SwitchError message={error} className="mt-3" />
    </section>
  );
}
