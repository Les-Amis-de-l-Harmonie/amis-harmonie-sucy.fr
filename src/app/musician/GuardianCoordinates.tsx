"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { cn } from "@/lib/utils";
import { ChooseMusicianState } from "./ChooseMusicianState";
import { validateField } from "./profile-validation";

interface GuardianProfileData {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
}

interface FormValues {
  first_name: string;
  last_name: string;
  phone: string;
}

const EMPTY_FORM: FormValues = { first_name: "", last_name: "", phone: "" };

/**
 * « Mon profil » d'un responsable sur son propre compte : seules ses
 * coordonnées existent (prénom, nom, téléphone) — le serveur n'enregistre rien
 * d'autre. Pas de photo, d'adresse, d'instrument ni de droit à l'image : ces
 * informations sont celles du musicien, qu'on choisit plus bas.
 */
export function GuardianCoordinates() {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [email, setEmail] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch("/api/musician/profile");
      if (!response.ok) throw new Error("Erreur lors du chargement de vos coordonnées.");
      const data = (await response.json()) as GuardianProfileData;
      setValues({
        first_name: data.first_name ?? "",
        last_name: data.last_name ?? "",
        phone: data.phone ?? "",
      });
      setEmail(data.email);
    } catch (error) {
      console.error("Error fetching guardian profile:", error);
      setFetchError(error instanceof Error ? error.message : "Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function handleChange(field: keyof FormValues, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: validateField(field, value) ?? "" }));
    setMessage(null);
  }

  async function handleSave() {
    const nextErrors: Record<string, string> = {};
    if (!values.first_name.trim()) nextErrors.first_name = "Prénom obligatoire";
    if (!values.last_name.trim()) nextErrors.last_name = "Nom obligatoire";
    for (const field of ["first_name", "last_name", "phone"] as const) {
      const formatError = validateField(field, values[field]);
      if (formatError && !nextErrors[field]) nextErrors[field] = formatError;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/musician/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as { success?: boolean; error?: string };
      if (response.ok && data.success) {
        setMessage({ type: "success", text: "Vos coordonnées sont enregistrées." });
      } else {
        setMessage({ type: "error", text: data.error || "Erreur lors de l'enregistrement." });
      }
    } catch (error) {
      console.error("Error saving guardian profile:", error);
      setMessage({ type: "error", text: "Erreur lors de l'enregistrement." });
    } finally {
      setSaving(false);
    }
  }

  const fields: { id: keyof FormValues; label: string; type?: string; placeholder: string }[] = [
    { id: "first_name", label: "Prénom", placeholder: "Jean" },
    { id: "last_name", label: "Nom", placeholder: "Dupont" },
    { id: "phone", label: "Téléphone", type: "tel", placeholder: "06 12 34 56 78" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mes coordonnées</h1>
        <p className="mt-1 text-muted-foreground">
          Vos informations de responsable, pour que l&apos;association puisse vous joindre.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Chargement" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Coordonnées</CardTitle>
            <CardDescription>
              Ces informations sont les seules que vous pouvez modifier ici.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fetchError && (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                <span>{fetchError}</span>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  Réessayer
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={`guardian-${field.id}`}>{field.label}</Label>
                  <Input
                    id={`guardian-${field.id}`}
                    type={field.type}
                    value={values[field.id]}
                    placeholder={field.placeholder}
                    aria-invalid={errors[field.id] ? true : undefined}
                    aria-describedby={errors[field.id] ? `guardian-${field.id}-error` : undefined}
                    onChange={(event) => handleChange(field.id, event.target.value)}
                    className={cn(errors[field.id] && "border-destructive")}
                  />
                  {errors[field.id] && (
                    <p id={`guardian-${field.id}-error`} className="text-xs text-destructive">
                      {errors[field.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {email && (
              <div className="space-y-2">
                <Label htmlFor="guardian-email">Email</Label>
                <Input
                  id="guardian-email"
                  type="email"
                  value={email}
                  disabled
                  className="cursor-not-allowed bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  L&apos;email ne peut pas être modifié. Contactez un administrateur en cas de
                  changement.
                </p>
              </div>
            )}

            {message?.type === "success" && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                {message.text}
              </div>
            )}
            {message?.type === "error" && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {message.text}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => void handleSave()} disabled={saving} size="lg">
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
            </div>
          </CardContent>
        </Card>
      )}

      <ChooseMusicianState
        showProfileLink={false}
        intro="Pour voir ou compléter la fiche d'un musicien (photo, adresse, instrument, droit à l'image), choisissez-le."
      />
    </div>
  );
}
