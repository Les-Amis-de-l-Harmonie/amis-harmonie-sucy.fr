"use client";

import { useId, useState } from "react";
import { Check, ChevronDown, ChevronRight, Loader2, User } from "lucide-react";
import type { MusicianProfileOption } from "@/app/api/auth";
import { cn } from "@/lib/utils";
import { fullName, useMusicianSession } from "./MusicianSession";
import { reloadPage, switchMusicianProfile } from "./profile-switch";

interface ProfileAvatarProps {
  profile: Pick<MusicianProfileOption, "firstName" | "lastName" | "avatar">;
  className?: string;
}

/** Photo du profil, ou ses initiales à défaut (même rendu que `MusicianUserSummary`). */
export function ProfileAvatar({ profile, className }: ProfileAvatarProps) {
  const initials = `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase();
  if (profile.avatar) {
    return (
      <img
        src={profile.avatar}
        alt=""
        className={cn(
          "h-10 w-10 shrink-0 rounded-full border border-border object-cover",
          className
        )}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary",
        className
      )}
    >
      {initials || <User className="h-4 w-4" />}
    </div>
  );
}

/**
 * Bascule vers un autre profil puis recharge la page : les pages et les
 * données suivent alors la session. En cas d'échec on reste en place et on
 * affiche le message du serveur.
 */
export function useProfileSwitch() {
  const [pendingKey, setPendingKey] = useState<number | "self" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function switchTo(profile: MusicianProfileOption) {
    if (pendingKey !== null) return;
    setError(null);
    setPendingKey(profile.isSelf ? "self" : profile.userId);
    const result = await switchMusicianProfile(profile.isSelf ? null : profile.userId);
    if (result.ok) {
      reloadPage();
      return;
    }
    setError(result.error);
    setPendingKey(null);
  }

  return { switchTo, pendingKey, error, busy: pendingKey !== null };
}

interface ProfileOptionsListProps {
  profiles: MusicianProfileOption[];
  currentUserId: number | null;
  onSelect: (profile: MusicianProfileOption) => void;
  pendingKey: number | "self" | null;
  /** Pas de profil « actuel » à marquer (ex. responsable qui doit choisir). */
  markCurrent?: boolean;
  /** Rangées encadrées avec chevron : pour un choix à faire, pas un simple menu. */
  variant?: "plain" | "choice";
  className?: string;
}

/** Liste de gros boutons « Moi » + enfants, utilisable au doigt (44 px minimum). */
export function ProfileOptionsList({
  profiles,
  currentUserId,
  onSelect,
  pendingKey,
  markCurrent = true,
  variant = "plain",
  className,
}: ProfileOptionsListProps) {
  const busy = pendingKey !== null;
  return (
    <ul className={cn("space-y-1", className)}>
      {profiles.map((profile) => {
        const current = markCurrent && profile.userId === currentUserId;
        const key = profile.isSelf ? "self" : profile.userId;
        const name = fullName(profile) || "Musicien";
        const hint = profile.isSelf
          ? profile.kind === "guardian"
            ? "Mes coordonnées"
            : name
          : null;
        return (
          <li key={profile.userId}>
            <button
              type="button"
              onClick={() => onSelect(profile)}
              disabled={busy}
              aria-current={current ? "true" : undefined}
              className={cn(
                "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70",
                current
                  ? "border-primary/40 bg-primary/10"
                  : variant === "choice"
                    ? "border-border bg-muted/50 hover:border-primary/40 hover:bg-primary/10"
                    : "border-transparent hover:bg-muted/60"
              )}
            >
              <ProfileAvatar profile={profile} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {profile.isSelf ? "Moi" : name}
                </span>
                {hint && (
                  <span className="block truncate text-xs text-muted-foreground">{hint}</span>
                )}
              </span>
              {pendingKey === key ? (
                <Loader2
                  className="h-4 w-4 shrink-0 animate-spin text-primary"
                  aria-label="Changement en cours"
                />
              ) : current ? (
                <>
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="sr-only">(profil actuel)</span>
                </>
              ) : variant === "choice" ? (
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function SwitchError({
  message,
  className,
}: {
  message: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={cn(
        "rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive",
        className
      )}
    >
      {message}
    </p>
  );
}

/**
 * Bloc repliable « Changer de profil », sous l'identité dans la barre latérale
 * et la feuille « Plus ». N'apparaît que s'il y a plusieurs profils.
 */
export function ProfileSwitcher({ className }: { className?: string }) {
  const { profiles, userId } = useMusicianSession();
  const [open, setOpen] = useState(false);
  const { switchTo, pendingKey, error } = useProfileSwitch();
  const panelId = useId();

  if (profiles.length <= 1) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Changer de profil
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform motion-reduce:transition-none",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>
      <div id={panelId} hidden={!open} className="space-y-2">
        <ProfileOptionsList
          profiles={profiles}
          currentUserId={userId}
          onSelect={(profile) => void switchTo(profile)}
          pendingKey={pendingKey}
        />
        <SwitchError message={error} />
      </div>
    </div>
  );
}
