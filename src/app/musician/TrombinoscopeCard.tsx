import { ChevronRight, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { LockedCardOverlay } from "./LockedCardOverlay";
import { LockableCardBody } from "./LockableCardBody";

interface TrombinoscopeCardProps {
  profileComplete: boolean;
}

export function TrombinoscopeCard({ profileComplete }: TrombinoscopeCardProps) {
  const locked = !profileComplete;

  return (
    <Card className="relative flex min-h-[220px] flex-col">
      <LockableCardBody locked={locked}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            Trombinoscope
          </CardTitle>
          <CardDescription>
            Découvrez les musiciens de l&apos;orchestre : photos, instruments et ancienneté.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <div className="flex-1" />
          <a href="/musician/trombinoscope" className="mt-auto">
            <Button variant="outline" className="w-full">
              Voir le trombinoscope
              <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </a>
        </CardContent>
      </LockableCardBody>
      {locked && <LockedCardOverlay reason="profile" />}
    </Card>
  );
}
