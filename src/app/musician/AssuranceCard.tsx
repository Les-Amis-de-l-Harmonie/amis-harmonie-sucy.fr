import { ChevronRight, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { LockedCardOverlay, type LockedCardReason } from "./LockedCardOverlay";
import { LockableCardBody } from "./LockableCardBody";
import type { ProfileWithExtras } from "./musician-types";

interface AssuranceCardProps {
  profile: ProfileWithExtras | null;
  loading: boolean;
  profileComplete: boolean;
}

export function AssuranceCard({ profile, loading, profileComplete }: AssuranceCardProps) {
  const isMember = profile?.adhesion_2026_2027 === 1;
  const locked = !profileComplete || !isMember;
  // "profile" l'emporte sur "membership" quand les deux s'appliquent — même
  // hiérarchie que la zone essentiels (voir LockedCardOverlay).
  const lockReason: LockedCardReason = !profileComplete ? "profile" : "membership";

  return (
    <Card className="relative flex min-h-[220px] flex-col">
      <LockableCardBody locked={locked}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
            Assurance
          </CardTitle>
          <CardDescription>
            Les adhérents à l&apos;association bénéficient d&apos;une assurance instrument comprise
            dans le prix de l&apos;adhésion annuelle.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <div className="mb-4 flex-1">
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : !locked ? (
              profile?.insurance_complete ? (
                <div className="space-y-2">
                  <Badge variant="success">Assurance active</Badge>
                  {profile.insuranceInstruments && profile.insuranceInstruments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        {profile.insuranceInstruments.length === 1
                          ? "Instrument assuré"
                          : "Instruments assurés"}{" "}
                        :
                      </p>
                      <ul className="space-y-0.5 text-xs text-foreground">
                        {profile.insuranceInstruments.map((inst) => (
                          <li key={inst.id} className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" />
                            {inst.instrument_name} {inst.brand && `(${inst.brand})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <Badge variant="warning">
                  Pas d&apos;assurance, en attente d&apos;informations
                </Badge>
              )
            ) : null}
          </div>
          {locked ? (
            <Button variant="outline" className="mt-auto w-full" disabled>
              {profile?.insurance_complete ? "Gérer mes instruments" : "Compléter le formulaire"}
              <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <a href="/musician/assurance" className="mt-auto">
              <Button variant="outline" className="w-full">
                {profile?.insurance_complete ? "Gérer mes instruments" : "Compléter le formulaire"}
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
