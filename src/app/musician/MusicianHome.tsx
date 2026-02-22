"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import {
  User,
  ChevronRight,
  Heart,
  Download,
  CalendarDays,
  FolderOpen,
  Lightbulb,
  Shield,
  Users,
} from "lucide-react";
import type { MusicianProfile } from "@/db/types";
import { formatDateShort } from "@/lib/dates";
import { SocialIcons } from "@/app/components/SocialIcons";

interface ProfileWithExtras extends Partial<MusicianProfile> {
  harmonieInstruments?: string[];
  email?: string;
  adhesion_2025_2026?: number;
  insurance_complete?: boolean;
}

interface UpcomingEvent {
  id: number;
  title: string;
  date: string;
}

interface MusicianHomeClientProps {
  userId: number;
  firstName: string;
  lastName: string;
}

export function MusicianHomeClient({
  userId: _userId,
  firstName,
  lastName,
}: MusicianHomeClientProps) {
  const [profile, setProfile] = useState<ProfileWithExtras | null>(null);
  const [nextEvent, setNextEvent] = useState<UpcomingEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, eventsRes] = await Promise.all([
        fetch("/api/musician/profile"),
        fetch("/api/events"),
      ]);

      if (profileRes.ok) {
        const data = (await profileRes.json()) as ProfileWithExtras;
        setProfile(data);
      }

      if (eventsRes.ok) {
        const eventsData = (await eventsRes.json()) as { upcoming: UpcomingEvent[] };
        if (eventsData.upcoming && eventsData.upcoming.length > 0) {
          setNextEvent(eventsData.upcoming[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const displayName = firstName && lastName ? `${firstName} ${lastName}` : "Musicien";

  const isProfileComplete = (profile: ProfileWithExtras | null): boolean => {
    if (!profile) return false;

    const requiredFields = [
      profile.first_name,
      profile.last_name,
      profile.date_of_birth,
      profile.phone,
      profile.address_line1,
      profile.postal_code,
      profile.city,
      profile.harmonie_start_date,
      profile.emergency_contact_first_name,
      profile.emergency_contact_last_name,
      profile.emergency_contact_phone,
    ];

    const allTextFieldsFilled = requiredFields.every((field) => field && field.trim() !== "");
    const hasHarmonieInstruments =
      profile.harmonieInstruments !== undefined &&
      profile.harmonieInstruments !== null &&
      profile.harmonieInstruments.length > 0;
    const hasConservatoryChoice =
      profile.is_conservatory_student === 0 || profile.is_conservatory_student === 1;
    const hasImageConsentChoice = profile.image_consent === 0 || profile.image_consent === 1;

    return (
      allTextFieldsFilled &&
      hasHarmonieInstruments &&
      hasConservatoryChoice &&
      hasImageConsentChoice
    );
  };

  const profileComplete = !loading && profile ? isProfileComplete(profile) : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bonjour, {displayName} !</h1>
        <p className="text-muted-foreground">Bienvenue dans votre espace personnel</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
        <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-primary" />
              Mon Profil
            </CardTitle>
            <CardDescription>Gérez vos informations personnelles</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex items-center gap-4 mb-4">
              {loading ? (
                <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
              ) : profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                ) : profileComplete ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Profil complété
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Profil à compléter
                  </span>
                )}
              </div>
            </div>
            <a href="/musician/profile" className="mt-auto">
              <Button variant="outline" className="w-full">
                Accéder à mon profil
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="w-5 h-5 text-primary" />
              Adhésion
            </CardTitle>
            <CardDescription>
              Adhésion à l'association "Les Amis de l'Harmonie de Sucy-en-Brie" 15€/an.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="mb-4 flex-1">
              {loading ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : profile?.adhesion_2025_2026 === 1 ? (
                <div className="space-y-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Adhérent 2025-2026
                  </span>
                  <p className="text-sm text-muted-foreground italic">Merci pour votre soutien !</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Non adhérent en 2025-2026
                  </span>
                </div>
              )}
            </div>
            <div className="mt-auto space-y-3">
              {!loading && profile?.adhesion_2025_2026 !== 1 && (
                <a href="/adhesion" className="block">
                  <Button className="w-full">
                    Adhérer maintenant
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              )}
              <a
                href="https://drive.google.com/file/d/1rVXEI46FWbo0NTyN9MzTsuIL0zYR1HGp/view?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger la plaquette
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-primary" />
              Assurance
            </CardTitle>
            <CardDescription>
              Les adhérents à l'association bénéficient d'une assurance instrument comprise dans le
              prix de l'adhésion annuelle.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="mb-4 flex-1">
              {loading ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : profile?.adhesion_2025_2026 !== 1 ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                  Pas d'assurance, non adhérent
                </span>
              ) : profile?.insurance_complete ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Assurance active
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  Pas d'assurance, en attente informations
                </span>
              )}
            </div>
            <a href="/musician/assurance" className="mt-auto">
              <Button variant="outline" className="w-full">
                {profile?.adhesion_2025_2026 === 1 && !profile?.insurance_complete
                  ? "Compléter le formulaire"
                  : "Gérer mes instruments"}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="w-5 h-5 text-primary" />
              Planning
            </CardTitle>
            <CardDescription>
              Merci de le mettre à jour le plus régulièrement possible !
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="mb-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : nextEvent ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Prochain concert :</p>
                  <p className="text-sm text-primary font-semibold">{nextEvent.title}</p>
                  <p className="text-sm text-muted-foreground">{formatDateShort(nextEvent.date)}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun concert à venir</p>
              )}
            </div>
            <div className="flex-1" />
            <a
              href="https://docs.google.com/spreadsheets/d/17UAV3DKOReGBluVfPCSybkAj1OxObkC9fUiSsljZOac/edit?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto"
            >
              <Button variant="outline" className="w-full">
                Accéder au planning
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FolderOpen className="w-5 h-5 text-primary" />
              Partitions
            </CardTitle>
            <CardDescription>
              Retrouvez l'ensemble des partitions scannées, s'il vous manque une partition vous
              pouvez la demander aux collègues sur le groupe whatsapp ou à David.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1" />
            <a
              href="https://drive.google.com/drive/folders/1pUqqJonhyugZCuT3SrWrpNTQ_NFI0BAz?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto"
            >
              <Button variant="outline" className="w-full">
                Accéder aux partitions
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="w-5 h-5 text-primary" />
              Boîte à idée
            </CardTitle>
            <CardDescription>
              Vous avez une idée pour faire évoluer l'association ou enrichir la vie de l'orchestre
              ? Partagez-la avec nous !
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1" />
            <a href="/musician/idee" className="mt-auto">
              <Button variant="outline" className="w-full">
                Soumettre une idée
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow h-full flex flex-col lg:col-span-3">
          <CardHeader className="pb-3 text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-lg">
              <Users className="w-5 h-5 text-primary" />
              Suivez-nous
            </CardTitle>
            <CardDescription>Soutenez votre orchestre préféré !</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center items-center text-center">
            <SocialIcons iconSize={32} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
