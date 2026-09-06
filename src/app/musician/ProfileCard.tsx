import { ArrowRight, ChevronRight, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import type { ProfileWithExtras } from "./musician-types";

interface ProfileCardProps {
  profile: ProfileWithExtras | null;
  loading: boolean;
  profileComplete: boolean;
}

function seniorityLabel(startDate: string): string {
  const start = new Date(startDate);
  const now = new Date();
  const totalDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const years = Math.floor(totalDays / 365);
  const remainingDays = totalDays - years * 365;

  if (years === 0 && remainingDays === 0) return "aujourd'hui";
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} an${years > 1 ? "s" : ""}`);
  if (remainingDays > 0) parts.push(`${remainingDays} jour${remainingDays > 1 ? "s" : ""}`);
  return parts.join(" et ");
}

export function ProfileCard({ profile, loading, profileComplete }: ProfileCardProps) {
  return (
    <Card className="flex min-h-[220px] flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-primary" aria-hidden="true" />
          Mon Profil
        </CardTitle>
        <CardDescription>Gérez vos informations personnelles</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="mb-3 flex items-center gap-4">
          {loading ? (
            <div className="h-24 w-24 shrink-0 animate-pulse rounded-full bg-muted" />
          ) : profile?.avatar ? (
            <img
              src={profile.avatar}
              alt=""
              className="h-24 w-24 shrink-0 rounded-full border-2 border-primary object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-muted">
              <User className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : (
              <>
                {(profile?.first_name || profile?.last_name) && (
                  <p className="truncate font-semibold text-foreground">
                    {profile.first_name} {profile.last_name}
                  </p>
                )}
                {profileComplete ? (
                  <Badge variant="success">Profil complété</Badge>
                ) : (
                  <div className="space-y-1">
                    <Badge variant="warning">Profil incomplet</Badge>
                    <p className="flex items-center gap-1 text-xs text-warning">
                      <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                      Complétez votre profil pour accéder à toutes les fonctionnalités.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {!loading && profile?.harmonie_start_date && (
          <p className="mb-3 text-xs text-muted-foreground">
            🎼 Dans l&apos;Harmonie depuis {seniorityLabel(profile.harmonie_start_date)}
          </p>
        )}
        <a href="/musician/profile" className="mt-auto">
          <Button variant="outline" className="w-full">
            Accéder à mon profil
            <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}
