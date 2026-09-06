import { ChevronRight, Lightbulb } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { LockedCardOverlay } from "./LockedCardOverlay";
import { LockableCardBody } from "./LockableCardBody";

interface IdeaBoxCardProps {
  profileComplete: boolean;
  unreadIdeasCount: number;
}

/** Carte de la clé `"boite-a-idee"` (à tiret, gelée — voir `useMusicianDashboardData`). */
export function IdeaBoxCard({ profileComplete, unreadIdeasCount }: IdeaBoxCardProps) {
  const locked = !profileComplete;

  return (
    <Card className="relative flex min-h-[220px] flex-col">
      <LockableCardBody locked={locked}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-primary" aria-hidden="true" />
            Boîte à idée
            {unreadIdeasCount > 0 && (
              <Badge variant="destructive" className="ml-auto rounded-full px-2">
                {unreadIdeasCount}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Vous avez une idée pour faire évoluer l&apos;association ou enrichir la vie de
            l&apos;orchestre ?
            <br />
            Partagez-la avec nous !
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <div className="flex-1" />
          <a href="/musician/idee" className="mt-auto">
            <Button variant="outline" className="w-full">
              Accéder à la boîte à idées
              <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </a>
        </CardContent>
      </LockableCardBody>
      {locked && <LockedCardOverlay reason="profile" />}
    </Card>
  );
}
