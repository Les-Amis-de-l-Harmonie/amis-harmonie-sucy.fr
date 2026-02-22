"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Camera, Save, Loader2, Plus, Trash2, Check } from "lucide-react";
import type { MusicianProfile, MusicianInstrument } from "@/db/types";
import { HARMONIE_INSTRUMENTS } from "@/db/types";

interface ProfileWithInstruments extends Partial<MusicianProfile> {
  instruments?: Partial<MusicianInstrument>[];
  harmonieInstruments?: string[];
  email?: string;
}

interface MusicianProfileClientProps {
  userId: number;
}

export function MusicianProfileClient({ userId: _userId }: MusicianProfileClientProps) {
  const [profile, setProfile] = useState<ProfileWithInstruments>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/musician/profile");
      if (response.ok) {
        const data = (await response.json()) as ProfileWithInstruments;
        if (!data.instruments || data.instruments.length === 0) {
          data.instruments = [{ instrument_name: "", start_date: "", level: "" }];
        }
        if (!data.harmonieInstruments) {
          data.harmonieInstruments = [];
        }
        setProfile(data);
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Veuillez sélectionner une image" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "L'image ne doit pas dépasser 5 Mo" });
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/musician/avatar", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (response.ok && data.url) {
        setProfile({ ...profile, avatar: data.url });
        setMessage({ type: "success", text: "Photo de profil mise à jour" });
      } else {
        setMessage({ type: "error", text: data.error || "Erreur lors du téléchargement" });
      }
    } catch (err) {
      console.error("Error uploading avatar:", err);
      setMessage({ type: "error", text: "Erreur lors du téléchargement" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const addInstrument = () => {
    setProfile({
      ...profile,
      instruments: [
        ...(profile.instruments || []),
        { instrument_name: "", start_date: "", level: "" },
      ],
    });
  };

  const removeInstrument = (index: number) => {
    const newInstruments = [...(profile.instruments || [])];
    newInstruments.splice(index, 1);
    if (newInstruments.length === 0) {
      newInstruments.push({ instrument_name: "", start_date: "", level: "" });
    }
    setProfile({ ...profile, instruments: newInstruments });
  };

  const updateInstrument = (index: number, field: keyof MusicianInstrument, value: string) => {
    const newInstruments = [...(profile.instruments || [])];
    newInstruments[index] = { ...newInstruments[index], [field]: value };
    setProfile({ ...profile, instruments: newInstruments });
  };

  const validateProfile = (): string | null => {
    const errors: string[] = [];

    if (!profile.first_name?.trim()) errors.push("Prénom");
    if (!profile.last_name?.trim()) errors.push("Nom");
    if (!profile.date_of_birth?.trim()) errors.push("Date de naissance");
    if (!profile.phone?.trim()) errors.push("Téléphone");
    if (!profile.address_line1?.trim()) errors.push("Adresse");
    if (!profile.postal_code?.trim()) errors.push("Code postal");
    if (!profile.city?.trim()) errors.push("Ville");
    if (!profile.harmonie_start_date?.trim()) errors.push("Date d'entrée à l'Harmonie");
    if (!profile.harmonieInstruments || profile.harmonieInstruments.length === 0) {
      errors.push("Instrument(s) joué(s) à l'Harmonie");
    }
    if (profile.is_conservatory_student === undefined || profile.is_conservatory_student === null) {
      errors.push("Élève au Conservatoire de Sucy-en-Brie");
    }
    if (profile.image_consent === undefined || profile.image_consent === null) {
      errors.push("Droit à l'image");
    }
    if (!profile.emergency_contact_first_name?.trim()) errors.push("Prénom du contact d'urgence");
    if (!profile.emergency_contact_last_name?.trim()) errors.push("Nom du contact d'urgence");
    if (!profile.emergency_contact_phone?.trim()) errors.push("Téléphone du contact d'urgence");

    if (errors.length > 0) {
      return "Veuillez renseigner les champs obligatoires : " + errors.join(", ");
    }

    return null;
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setValidationError(null);

    const validationResult = validateProfile();
    if (validationResult) {
      setValidationError(validationResult);
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/musician/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      const data = (await response.json()) as { success?: boolean; error?: string };

      if (response.ok && data.success) {
        setMessage({ type: "success", text: "Profil enregistré avec succès" });
        window.location.href = "/musician/";
      } else {
        setMessage({ type: "error", text: data.error || "Erreur lors de l'enregistrement" });
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setMessage({ type: "error", text: "Erreur lors de l'enregistrement" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Mon Profil</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Gérez vos informations personnelles</p>
      </div>

      {message?.type === "success" && (
        <div className="p-4 rounded-md text-sm bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Photo de profil</CardTitle>
          <CardDescription>
            Cliquez sur l'image pour changer votre photo.
            <br />
            <span className="text-xs text-muted-foreground">
              Votre photo pourra être affichée sur le site internet pour le trombinoscope des
              musiciens.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>Format : JPG, PNG ou WebP</p>
              <p>Taille max : 5 Mo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                Prénom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="first_name"
                value={profile.first_name || ""}
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                placeholder="Jean"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">
                Nom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="last_name"
                value={profile.last_name || ""}
                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                placeholder="Dupont"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">
                Date de naissance <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date_of_birth"
                type="date"
                value={profile.date_of_birth || ""}
                onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                Téléphone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone || ""}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="06 12 34 56 78"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email || ""}
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              L'email ne peut pas être modifié. Contactez un administrateur en cas de changement.
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Adresse postale
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address_line1">
                  Adresse <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address_line1"
                  value={profile.address_line1 || ""}
                  onChange={(e) => setProfile({ ...profile, address_line1: e.target.value })}
                  placeholder="123 rue de la Musique"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_line2">Complément d'adresse</Label>
                <Input
                  id="address_line2"
                  value={profile.address_line2 || ""}
                  onChange={(e) => setProfile({ ...profile, address_line2: e.target.value })}
                  placeholder="Appartement 4B, Bâtiment C"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postal_code">
                    Code postal <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="postal_code"
                    value={profile.postal_code || ""}
                    onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                    placeholder="94370"
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">
                    Ville <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={profile.city || ""}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    placeholder="Sucy-en-Brie"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Harmonie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="harmonie_start_date">
                Date d'entrée à l'Harmonie <span className="text-red-500">*</span>
              </Label>
              <Input
                id="harmonie_start_date"
                type="date"
                value={profile.harmonie_start_date || ""}
                onChange={(e) => setProfile({ ...profile, harmonie_start_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Instrument(s) joué(s) à l'Harmonie <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {HARMONIE_INSTRUMENTS.map((instrument) => {
                const isSelected = profile.harmonieInstruments?.includes(instrument);
                return (
                  <button
                    key={instrument}
                    type="button"
                    onClick={() => {
                      const current = profile.harmonieInstruments || [];
                      if (isSelected) {
                        setProfile({
                          ...profile,
                          harmonieInstruments: current.filter((i) => i !== instrument),
                        });
                      } else {
                        setProfile({
                          ...profile,
                          harmonieInstruments: [...current, instrument],
                        });
                      }
                    }}
                    className={`p-2 text-sm rounded border transition-colors text-left flex items-center gap-2 ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:bg-muted"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {instrument}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Droit à l'image <span className="text-red-500">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg space-y-2">
            <p>
              Dans le cadre des activités de l'Harmonie (répétitions, concerts, déplacements, voyage
              en Allemagne 🇩🇪, etc.), des photos et/ou vidéos pourront être réalisées.
            </p>
            <p>
              En cochant la case ci-dessous, j'autorise l'association à utiliser mon image (ou celle
              de mon enfant mineur) sur les supports de communication de l'association :
            </p>
            <ul className="list-disc list-inside ml-2">
              <li>site internet</li>
              <li>réseaux sociaux</li>
              <li>presse locale</li>
              <li>supports de communication</li>
            </ul>
            <p className="italic">
              Cette autorisation est accordée à titre gratuit et sans limitation de durée.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-muted/30 rounded">
              <input
                type="radio"
                name="image_consent"
                checked={profile.image_consent === 1}
                onChange={() => setProfile({ ...profile, image_consent: 1 })}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm">J'autorise l'utilisation de mon image</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-muted/30 rounded">
              <input
                type="radio"
                name="image_consent"
                checked={profile.image_consent !== 1}
                onChange={() => setProfile({ ...profile, image_consent: 0 })}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm">Je n'autorise pas l'utilisation de mon image</span>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pratique instrumentale et formation musicale</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>
              Élève au Conservatoire de Sucy-en-Brie <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-4 h-10">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="conservatory"
                  checked={profile.is_conservatory_student === 1}
                  onChange={() => setProfile({ ...profile, is_conservatory_student: 1 })}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm">Oui</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="conservatory"
                  checked={profile.is_conservatory_student !== 1}
                  onChange={() => setProfile({ ...profile, is_conservatory_student: 0 })}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm">Non</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="music_theory_level">
              Formation Musicale (solfège) - Niveau conservatoire
            </Label>
            <Input
              id="music_theory_level"
              value={profile.music_theory_level || ""}
              onChange={(e) => setProfile({ ...profile, music_theory_level: e.target.value })}
              placeholder="Ex: Cycle 2, 3ème année"
            />
          </div>

          <div className="space-y-4">
            <Label>Instruments</Label>
            {(profile.instruments || []).map((instrument, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Instrument {index + 1}
                  </span>
                  {(profile.instruments?.length || 0) > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeInstrument(index)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Instrument</Label>
                    <Input
                      value={instrument.instrument_name || ""}
                      onChange={(e) => updateInstrument(index, "instrument_name", e.target.value)}
                      placeholder="Ex: Clarinette"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de début</Label>
                    <Input
                      type="date"
                      value={instrument.start_date || ""}
                      onChange={(e) => updateInstrument(index, "start_date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Niveau conservatoire</Label>
                    <Input
                      value={instrument.level || ""}
                      onChange={(e) => updateInstrument(index, "level", e.target.value)}
                      placeholder="Ex: Cycle 3"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addInstrument} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un instrument
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Contact d'urgence / Représentant légal <span className="text-red-500">*</span>
          </CardTitle>
          <CardDescription>Pour les mineurs ou en cas d'urgence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_first_name">
                Prénom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="emergency_contact_first_name"
                value={profile.emergency_contact_first_name || ""}
                onChange={(e) =>
                  setProfile({ ...profile, emergency_contact_first_name: e.target.value })
                }
                placeholder="Marie"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_last_name">
                Nom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="emergency_contact_last_name"
                value={profile.emergency_contact_last_name || ""}
                onChange={(e) =>
                  setProfile({ ...profile, emergency_contact_last_name: e.target.value })
                }
                placeholder="Dupont"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_email">Email</Label>
              <Input
                id="emergency_contact_email"
                type="email"
                value={profile.emergency_contact_email || ""}
                onChange={(e) =>
                  setProfile({ ...profile, emergency_contact_email: e.target.value })
                }
                placeholder="marie.dupont@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone">
                Téléphone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="emergency_contact_phone"
                type="tel"
                value={profile.emergency_contact_phone || ""}
                onChange={(e) =>
                  setProfile({ ...profile, emergency_contact_phone: e.target.value })
                }
                placeholder="06 12 34 56 78"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-4">
        {validationError && (
          <span className="text-sm text-red-600 dark:text-red-400">{validationError}</span>
        )}
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
