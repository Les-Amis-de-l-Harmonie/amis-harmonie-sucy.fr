import { ChevronRight, MapPin, Ticket } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { LockedCardOverlay, type LockedCardReason } from "./LockedCardOverlay";
import { LockableCardBody } from "./LockableCardBody";
import type { OutingSettings } from "@/db/types";
import type { ProfileWithExtras } from "./musician-types";

interface OutingCardProps {
  outingSettings: OutingSettings;
  profile: ProfileWithExtras | null;
  profileComplete: boolean;
}

/**
 * Le masquage complet (si `is_active !== 1`) se décide au niveau de
 * `SecondaryCardGrid`, pas ici : une seule vérification, jamais deux
 * conditions redondantes comme dans l'ancien `MusicianHome.tsx`.
 */
export function OutingCard({ outingSettings, profile, profileComplete }: OutingCardProps) {
  const isMember = profile?.adhesion_2026_2027 === 1;
  const locked = !profileComplete || !isMember;
  const lockReason: LockedCardReason = !profileComplete ? "profile" : "membership";

  return (
    <Card className="relative flex min-h-[220px] flex-col">
      <LockableCardBody locked={locked}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Ticket className="h-5 w-5 text-primary" aria-hidden="true" />
            {outingSettings.title}
          </CardTitle>
          {outingSettings.subtitle && (
            <CardDescription className="text-sm font-medium text-primary">
              {outingSettings.subtitle}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          {outingSettings.description && (
            <p className="mb-2 text-xs text-muted-foreground">{outingSettings.description}</p>
          )}
          {outingSettings.location && (
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>{outingSettings.location}</span>
            </div>
          )}
          {outingSettings.price && (
            <p className="mb-4 text-xs text-muted-foreground">💰 {outingSettings.price}</p>
          )}
          <div className="flex-1" />
          {!locked && outingSettings.button_link && (
            <a
              href={outingSettings.button_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto"
            >
              <Button variant="outline" className="w-full">
                {outingSettings.button_text}
                <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </a>
          )}
        </CardContent>
      </LockableCardBody>
      {locked && <LockedCardOverlay reason={lockReason} />}
    </Card>
  );
}
