"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
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
  Ticket,
  MapPin,
  Cake,
} from "lucide-react";
import type { MusicianProfile, OutingSettings, MusicianCardType } from "@/db/types";
import { Info } from "lucide-react";
import { formatDateShort } from "@/lib/dates";
import { SocialIcons } from "@/app/components/SocialIcons";

function MembersOnlyBadge() {
  return (
    <span className="inline-flex w-fit items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 mb-3">
      Réservé aux adhérents
    </span>
  );
}

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

interface Birthday {
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string;
  avatar: string | null;
}

interface InfoSettings {
  id: number;
  title: string;
  subtitle: string;
  content: string;
  bg_color: string;
  text_color: string;
  border_color: string;
  icon: string;
  is_active: number;
}

interface MusicianHomeClientProps {
  userId: number;
  firstName: string;
  lastName: string;
}

export function MusicianHomeClient({
  userId: _userId,
  firstName,
  lastName: _lastName,
}: MusicianHomeClientProps) {
  const [profile, setProfile] = useState<ProfileWithExtras | null>(null);
  const [nextEvent, setNextEvent] = useState<UpcomingEvent | null>(null);
  const [outingSettings, setOutingSettings] = useState<OutingSettings | null>(null);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [infoSettings, setInfoSettings] = useState<InfoSettings | null>(null);
  const DEFAULT_CARDS: MusicianCardType[] = [
    "profile",
    "adhesion",
    "assurance",
    "planning",
    "partitions",
    "boite-a-idee",
    "outing",
    "birthdays",
    "social",
  ];
  const [cardOrder, setCardOrder] = useState<MusicianCardType[]>(DEFAULT_CARDS);
  const [loading, setLoading] = useState(true);
  const [unreadIdeasCount, setUnreadIdeasCount] = useState(0);

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, eventsRes, outingRes, cardOrderRes, infoRes, birthdaysRes, ideasRes] =
        await Promise.all([
          fetch("/api/musician/profile"),
          fetch("/api/events"),
          fetch("/api/outing-settings"),
          fetch("/api/card-order"),
          fetch("/api/info-settings"),
          fetch("/api/musician/birthdays"),
          fetch("/api/musician/ideas?count=unread"),
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

      if (outingRes.ok) {
        const outingData = (await outingRes.json()) as OutingSettings;
        setOutingSettings(outingData);
      }

      if (cardOrderRes.ok) {
        const cardData = (await cardOrderRes.json()) as { card_order: string };
        if (cardData.card_order) {
          try {
            const parsed = JSON.parse(cardData.card_order) as MusicianCardType[];
            // Validate that all cards are present
            const validCards = parsed.filter((card): card is MusicianCardType =>
              DEFAULT_CARDS.includes(card)
            );
            // Add any missing cards
            const missingCards = DEFAULT_CARDS.filter((card) => !validCards.includes(card));
            setCardOrder([...validCards, ...missingCards]);
          } catch {
            // Keep default order
          }
        }
      }

      if (infoRes.ok) {
        const infoData = (await infoRes.json()) as InfoSettings;
        // Only set if the info card is active
        if (infoData.is_active === 1) {
          setInfoSettings(infoData);
        } else {
          setInfoSettings(null);
        }
      }

      if (birthdaysRes.ok) {
        const birthdaysData = (await birthdaysRes.json()) as Birthday[];
        setBirthdays(birthdaysData);
      }

      if (ideasRes.ok) {
        const ideasData = (await ideasRes.json()) as { count: number };
        setUnreadIdeasCount(ideasData.count);
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

  const displayName = firstName ? firstName : "Musicien";

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

  const renderCard = (cardType: MusicianCardType) => {
    const isDisabled = !profileComplete;

    switch (cardType) {
      case "profile":
        return (
          <Card
            key={cardType}
            className="hover:shadow-md transition-shadow h-[320px] flex flex-col"
          >
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
                    <div className="space-y-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Profil incomplet
                      </span>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        👉 Complétez votre profil pour accéder à toutes les fonctionnalités.
                      </p>
                    </div>
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
        );

      case "adhesion":
        return (
          <Card
            key={cardType}
            className={`h-[320px] flex flex-col ${isDisabled ? "opacity-50 pointer-events-none grayscale" : "hover:shadow-md transition-shadow"}`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="w-5 h-5 text-primary" />
                Adhésion
              </CardTitle>
              <CardDescription>
                Adhésion à l&apos;association &quot;Les Amis de l&apos;Harmonie de
                Sucy-en-Brie&quot; 15€/an.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="mb-4 flex-1">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                ) : profileComplete ? (
                  profile?.adhesion_2025_2026 === 1 ? (
                    <div className="space-y-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Adhérent 2025-2026
                      </span>
                      <p className="text-sm text-muted-foreground italic">
                        Merci pour votre soutien !
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Non adhérent en 2025-2026
                      </span>
                    </div>
                  )
                ) : null}
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
        );

      case "assurance":
        return (
          <Card
            key={cardType}
            className={`h-[320px] flex flex-col ${
              !profileComplete || profile?.adhesion_2025_2026 !== 1
                ? "opacity-50 pointer-events-none grayscale"
                : "hover:shadow-md transition-shadow"
            }`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-primary" />
                Assurance
              </CardTitle>
              <CardDescription>
                Les adhérents à l&apos;association bénéficient d&apos;une assurance instrument
                comprise dans le prix de l&apos;adhésion annuelle.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="mb-4 flex-1">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                ) : profileComplete ? (
                  profile?.adhesion_2025_2026 !== 1 ? (
                    <MembersOnlyBadge />
                  ) : profile?.insurance_complete ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Assurance active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      Pas d&apos;assurance, en attente informations
                    </span>
                  )
                ) : null}
              </div>
              {profile?.adhesion_2025_2026 === 1 ? (
                <a href="/musician/assurance" className="mt-auto">
                  <Button variant="outline" className="w-full">
                    {profile?.insurance_complete
                      ? "Gérer mes instruments"
                      : "Compléter le formulaire"}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              ) : (
                <Button variant="outline" className="w-full mt-auto" disabled>
                  Gérer mes instruments
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
        );

      case "planning":
        return (
          <Card
            key={cardType}
            className={`h-[320px] flex flex-col ${isDisabled ? "opacity-50 pointer-events-none grayscale" : "hover:shadow-md transition-shadow"}`}
          >
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
                    <p className="text-sm font-medium text-foreground">Prochain évènement :</p>
                    <p className="text-sm text-primary font-semibold">{nextEvent.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateShort(nextEvent.date)}
                    </p>
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
        );

      case "partitions":
        return (
          <Card
            key={cardType}
            className={`h-[320px] flex flex-col ${isDisabled ? "opacity-50 pointer-events-none grayscale" : "hover:shadow-md transition-shadow"}`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderOpen className="w-5 h-5 text-primary" />
                Partitions
              </CardTitle>
              <CardDescription>
                Retrouvez l&apos;ensemble des partitions scannées, s&apos;il vous manque une
                partition vous pouvez la demander aux collègues sur le groupe whatsapp ou à David.
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
        );

      case "boite-a-idee":
        return (
          <Card
            key={cardType}
            className={`h-[320px] flex flex-col ${isDisabled ? "opacity-50 pointer-events-none grayscale" : "hover:shadow-md transition-shadow"}`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="w-5 h-5 text-primary" />
                Boîte à idée
                {unreadIdeasCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[20px] h-5 px-1">
                    {unreadIdeasCount}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Vous avez une idée pour faire évoluer l&apos;association ou enrichir la vie de
                l&apos;orchestre ?
                <br />
                Partagez-la avec nous !
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
        );

      case "outing":
        if (outingSettings?.is_active !== 1) return null;
        return (
          <Card
            key={cardType}
            className={`h-[320px] flex flex-col ${
              !profileComplete || profile?.adhesion_2025_2026 !== 1
                ? "opacity-50 pointer-events-none grayscale"
                : "hover:shadow-md transition-shadow"
            }`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Ticket className="w-5 h-5 text-primary" />
                {outingSettings.title}
              </CardTitle>
              {outingSettings.subtitle && (
                <CardDescription className="text-sm text-primary font-medium">
                  {outingSettings.subtitle}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {(!profileComplete || profile?.adhesion_2025_2026 !== 1) && <MembersOnlyBadge />}
              {outingSettings.description && (
                <p className="text-xs text-muted-foreground mb-2">{outingSettings.description}</p>
              )}
              {outingSettings.location && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{outingSettings.location}</span>
                </div>
              )}
              {outingSettings.price && (
                <p className="text-xs text-muted-foreground mb-4">💰 {outingSettings.price}</p>
              )}
              <div className="flex-1" />
              {profile?.adhesion_2025_2026 === 1 && outingSettings.button_link && (
                <a
                  href={outingSettings.button_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto"
                >
                  <Button variant="outline" className="w-full">
                    {outingSettings.button_text}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>
        );

      case "social":
        return (
          <Card
            key={cardType}
            className={`h-[320px] flex flex-col ${isDisabled ? "opacity-50 pointer-events-none grayscale" : "hover:shadow-md transition-shadow"}`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-primary" />
                Suivez-nous
              </CardTitle>
              <CardDescription>Soutenez votre orchestre préféré !</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <SocialIcons iconSize={32} />
            </CardContent>
          </Card>
        );

      case "birthdays": {
        const monthNames = [
          "janvier",
          "février",
          "mars",
          "avril",
          "mai",
          "juin",
          "juillet",
          "août",
          "septembre",
          "octobre",
          "novembre",
          "décembre",
        ];
        const currentMonth = monthNames[new Date().getMonth()];
        return (
          <Card
            key={cardType}
            className={`h-[320px] flex flex-col ${isDisabled ? "opacity-50 pointer-events-none grayscale" : "hover:shadow-md transition-shadow"}`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Cake className="w-5 h-5 text-primary" />
                {birthdays.length === 1 ? "Anniversaire" : "Anniversaires"}
              </CardTitle>
              <CardDescription>
                {birthdays.length === 0
                  ? `Pas d'anniversaire en ${currentMonth}`
                  : birthdays.length === 1
                    ? `Anniversaire du mois de ${currentMonth}`
                    : `Anniversaires du mois de ${currentMonth}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden">
              {loading ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : isDisabled ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Complète ton profil pour accéder à cette fonctionnalité
                  </p>
                </div>
              ) : birthdays.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun anniversaire ce mois-ci</p>
              ) : (
                <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                  {birthdays.map((b, i) => {
                    const day = new Date(b.date_of_birth).getDate();
                    const name =
                      [b.first_name, b.last_name].filter(Boolean).join(" ") || "Musicien";
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2"
                      >
                        {b.avatar ? (
                          <img
                            src={b.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-primary/30"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{name}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {day} {currentMonth}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      }
      default:
        return null;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      },
    },
  };

  const cardHoverVariants = {
    rest: {
      scale: 1,
      y: 0,
      boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    },
    hover: {
      scale: 1.02,
      y: -4,
      boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      },
    },
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      },
    },
  };

  const infoCardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <div className="space-y-6">
      <motion.div initial="hidden" animate="visible" variants={headerVariants}>
        <h1 className="text-2xl font-bold text-foreground">Bonjour, {displayName} !</h1>
        <p className="text-muted-foreground">Bienvenue dans votre espace personnel</p>
      </motion.div>

      {/* Info Card - Displayed at the top if active */}
      {infoSettings?.is_active === 1 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={infoCardVariants}
          className={`p-4 rounded-lg border ${infoSettings.bg_color} ${infoSettings.border_color}`}
        >
          <div className="flex items-start gap-3">
            <Info className={`w-5 h-5 mt-0.5 ${infoSettings.text_color}`} />
            <div className="flex-1">
              <h3 className={`font-semibold text-lg ${infoSettings.text_color}`}>
                {infoSettings.title || "Information"}
              </h3>
              {infoSettings.subtitle && (
                <p className={`text-sm font-medium mt-1 ${infoSettings.text_color} opacity-80`}>
                  {infoSettings.subtitle}
                </p>
              )}
              {infoSettings.content && (
                <div
                  className={`mt-2 ${infoSettings.text_color} prose prose-sm max-w-none`}
                  dangerouslySetInnerHTML={{
                    __html: infoSettings.content,
                  }}
                />
              )}
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch"
      >
        {cardOrder.map((cardType) => (
          <motion.div
            key={cardType}
            variants={itemVariants}
            initial="rest"
            whileHover="hover"
            animate="rest"
            style={{ cursor: "pointer" }}
          >
            <motion.div variants={cardHoverVariants}>{renderCard(cardType)}</motion.div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
