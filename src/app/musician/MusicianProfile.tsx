"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { AvatarUploader } from "@/app/components/shared/AvatarUploader";
import { resolveDeclaredPrimaryInstrument } from "@/lib/instruments";
import {
  PROFILE_SECTIONS,
  validateField,
  validateProfile,
  getSectionCompletion,
  type ProfileWithInstruments,
  type ProfileFieldError,
} from "./profile-validation";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { AddressSection } from "./AddressSection";
import { HarmonieSection } from "./HarmonieSection";
import { InstrumentPracticeSection } from "./InstrumentPracticeSection";
import { EmergencyContactSection } from "./EmergencyContactSection";
import { ImageConsentSection } from "./ImageConsentSection";

interface MusicianProfileClientProps {
  userId: number;
}

function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Formulaire du profil musicien, décomposé en 6 sections + le bloc photo
 * (§D4). Ce composant ne fait plus que l'assemblage et la logique de
 * sauvegarde : la validation vit dans `profile-validation.ts`, chaque
 * section dans son propre fichier.
 */
export function MusicianProfileClient({ userId: _userId }: MusicianProfileClientProps) {
  const [profile, setProfile] = useState<ProfileWithInstruments>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // N'affiche la liste d'erreurs qu'après une tentative d'enregistrement — pas
  // avant, pour ne pas accueillir un profil vide avec un mur de messages.
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch("/api/musician/profile");
      if (!response.ok) {
        throw new Error("Erreur lors du chargement du profil.");
      }
      const data = (await response.json()) as ProfileWithInstruments;
      if (!data.instruments || data.instruments.length === 0) {
        data.instruments = [{ instrument_name: "", start_date: "", level: "" }];
      }
      if (!data.harmonieInstruments) {
        data.harmonieInstruments = [];
      }
      data.primaryHarmonieInstrument = resolveDeclaredPrimaryInstrument(
        data.harmonieInstruments,
        data.primaryHarmonieInstrument ?? null
      );
      setProfile(data);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setFetchError(err instanceof Error ? err.message : "Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    const error = validateField(field, value);
    setFieldErrors((prev) => ({ ...prev, [field]: error || "" }));
  }, []);

  const handleProfileChange = useCallback((patch: Partial<ProfileWithInstruments>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  const errors = useMemo(() => validateProfile(profile, fieldErrors), [profile, fieldErrors]);
  const sectionCompletion = useMemo(() => getSectionCompletion(profile, errors), [profile, errors]);
  const completedCount = useMemo(
    () => Object.values(sectionCompletion).filter(Boolean).length,
    [sectionCompletion]
  );

  const emergencyContactTitle = useMemo(() => {
    const age = calculateAge(profile.date_of_birth);
    if (age === null) return "Contact d'urgence / Représentant légal";
    return age < 18 ? "Représentant légal" : "Contact d'urgence";
  }, [profile.date_of_birth]);

  function scrollToError(error: ProfileFieldError) {
    const fieldEl = document.getElementById(error.field);
    const target = fieldEl ?? document.getElementById(error.sectionId);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    // La cible n'est pas toujours un champ précis (ex. le choix d'instrument
    // principal n'a pas d'élément unique focusable) : on ne tente le focus
    // que quand un vrai champ existe, jamais sur le simple ancrage de section.
    if (fieldEl instanceof HTMLElement) {
      window.setTimeout(() => fieldEl.focus(), 400);
    }
  }

  const handleSave = async () => {
    setSubmitAttempted(true);
    setMessage(null);

    if (errors.length > 0) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...profile,
        primaryHarmonieInstrument: resolveDeclaredPrimaryInstrument(
          profile.harmonieInstruments || [],
          profile.primaryHarmonieInstrument
        ),
      };
      const response = await fetch("/api/musician/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { success?: boolean; error?: string };

      if (response.ok && data.success) {
        setMessage({ type: "success", text: "Profil enregistré avec succès." });
        setSubmitAttempted(false);
        // Décision D8 : plus de redirection vers /musician/ — l'ancien code
        // posait ce message puis naviguait dans le même tick, ce qui le
        // rendait invisible. On reste en place et on relit le profil pour
        // refléter ce que le serveur a réellement enregistré.
        await fetchProfile();
      } else {
        setMessage({ type: "error", text: data.error || "Erreur lors de l'enregistrement." });
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setMessage({ type: "error", text: "Erreur lors de l'enregistrement." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const showErrors = submitAttempted && errors.length > 0;

  const saveButton = (
    <Button onClick={handleSave} disabled={saving} size="lg">
      {saving ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Enregistrement...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" />
          Enregistrer
        </>
      )}
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Barre d'action sticky (§3) : titre, progression compacte sur mobile,
          bouton Enregistrer toujours accessible sans redescendre en bas du
          formulaire après avoir corrigé une erreur signalée en haut.
          `top-14` sous 640px pour se poser juste sous le bandeau de titre
          mobile de la coquille (`MusicianMobileHeader`, également sticky,
          hauteur 56px) ; `top-0` au-delà, puisque ce bandeau disparaît. */}
      <div className="sticky top-14 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:top-0 sm:mx-0 sm:rounded-xl sm:border sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">Mon Profil</h1>
            <p className="hidden text-sm text-muted-foreground sm:block">
              Gérez vos informations personnelles
            </p>
          </div>
          {saveButton}
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Progression du profil</span>
            <span>
              {completedCount} section{completedCount > 1 ? "s" : ""} sur {PROFILE_SECTIONS.length}{" "}
              complètes
            </span>
          </div>
          <Progress
            value={completedCount}
            max={PROFILE_SECTIONS.length}
            aria-label={`Progression du profil, ${completedCount} sections sur ${PROFILE_SECTIONS.length} complètes`}
          />
        </div>
      </div>

      {message?.type === "success" && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {message.text}
        </div>
      )}
      {message?.type === "error" && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {message.text}
        </div>
      )}
      {fetchError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={() => void fetchProfile()}
            className="font-medium underline-offset-2 hover:underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {showErrors && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {errors.length} information{errors.length > 1 ? "s" : ""} à corriger avant
            d&apos;enregistrer :
          </p>
          <ul className="space-y-1">
            {errors.map((error) => (
              <li key={`${error.sectionId}-${error.field}`}>
                <button
                  type="button"
                  onClick={() => scrollToError(error)}
                  className="text-sm text-destructive underline-offset-2 hover:underline"
                >
                  {error.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="min-w-0 space-y-6">
        <Card id="photo">
          <CardHeader>
            <CardTitle>Photo de profil</CardTitle>
            <CardDescription>
              Cliquez sur l&apos;image pour changer votre photo.
              <br />
              <span className="text-xs text-muted-foreground">
                Votre photo pourra être affichée sur le site internet pour le trombinoscope des
                musiciens.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarUploader
              avatar={profile.avatar}
              onUpload={(url) => {
                handleProfileChange({ avatar: url });
                setMessage({ type: "success", text: "Photo de profil mise à jour." });
              }}
              uploadEndpoint="/api/musician/avatar"
              size={96}
              showInstructions={false}
              onError={(errorMsg) => setMessage({ type: "error", text: errorMsg })}
            />
            <div className="mt-4 text-sm text-muted-foreground">
              <p>Format : JPG, PNG ou WebP</p>
              <p>Taille max : 5 Mo</p>
            </div>
          </CardContent>
        </Card>

        <PersonalInfoSection
          profile={profile}
          fieldErrors={fieldErrors}
          onFieldChange={handleFieldChange}
          onProfileChange={handleProfileChange}
        />

        <AddressSection
          profile={profile}
          fieldErrors={fieldErrors}
          onFieldChange={handleFieldChange}
          onProfileChange={handleProfileChange}
        />

        <HarmonieSection profile={profile} onProfileChange={handleProfileChange} />

        <InstrumentPracticeSection profile={profile} onProfileChange={handleProfileChange} />

        <EmergencyContactSection
          profile={profile}
          fieldErrors={fieldErrors}
          onFieldChange={handleFieldChange}
          title={emergencyContactTitle}
        />

        <ImageConsentSection profile={profile} onProfileChange={handleProfileChange} />

        <div className="flex items-center justify-end">{saveButton}</div>
      </div>
    </div>
  );
}
