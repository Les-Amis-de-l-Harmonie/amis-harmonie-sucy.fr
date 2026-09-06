import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface MusicianUserSummaryProps {
  firstName: string;
  lastName: string;
  avatar?: string | null;
  /** `sm` pour le sheet mobile, `md` pour la sidebar desktop. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Bloc identité (avatar + nom + rôle), réutilisé en haut de la sidebar
 * desktop et en tête du sheet mobile « Plus ». Composant purement
 * présentationnel : ni état, ni effet, ni gestionnaire d'événement.
 */
export function MusicianUserSummary({
  firstName,
  lastName,
  avatar,
  size = "md",
  className,
}: MusicianUserSummaryProps) {
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : "Musicien";
  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}` || undefined;
  const dimension = size === "sm" ? "h-10 w-10" : "h-11 w-11";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {avatar ? (
        <img
          src={avatar}
          alt=""
          className={cn("shrink-0 rounded-full border border-border object-cover", dimension)}
        />
      ) : (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary",
            dimension
          )}
          aria-hidden="true"
        >
          {initials ?? <User className="h-5 w-5" />}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{displayName}</p>
        <p className="text-xs text-muted-foreground">Musicien</p>
      </div>
    </div>
  );
}
