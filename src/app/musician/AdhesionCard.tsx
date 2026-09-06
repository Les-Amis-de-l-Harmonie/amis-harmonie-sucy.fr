import { ChevronRight, Download, Heart } from "lucide-react";
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

interface AdhesionCardProps {
  profile: ProfileWithExtras | null;
  loading: boolean;
  profileComplete: boolean;
}

/**
 * Écart assumé par rapport à l'ancien `MusicianHome.tsx` : la carte n'est
 * plus verrouillée quand le profil est incomplet, parce que bloquer l'adhésion
 * derrière la complétude du profil est contre-productif et que la zone
 * essentiels doit justement pouvoir orienter vers `/adhesion`. Seul le badge
 * de statut se tait si le profil n'est pas encore complet.
 */
export function AdhesionCard({ profile, loading, profileComplete }: AdhesionCardProps) {
  const isMember = profile?.adhesion_2026_2027 === 1;

  return (
    <Card className="flex min-h-[220px] flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="h-5 w-5 text-primary" aria-hidden="true" />
          Adhésion
        </CardTitle>
        <CardDescription>
          Adhésion à l&apos;association &quot;Les Amis de l&apos;Harmonie de Sucy-en-Brie&quot;
          15€/an.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="mb-4 flex-1">
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : profileComplete ? (
            isMember ? (
              <div className="space-y-2">
                <Badge variant="success">Adhérent 2026-2027</Badge>
                <p className="text-sm italic text-muted-foreground">Merci pour votre soutien !</p>
              </div>
            ) : (
              <Badge variant="warning">Non adhérent en 2026-2027</Badge>
            )
          ) : null}
        </div>
        <div className="mt-auto space-y-3">
          {!loading && !isMember && (
            <a href="/adhesion" className="block">
              <Button className="w-full">
                Adhérer maintenant
                <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </a>
          )}
          <a
            href="/plaquette-association.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Télécharger la plaquette
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
