"use client";

import { useState, useEffect, useCallback } from "react";
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
import { EmptyState } from "@/app/components/ui/empty-state";
import { Shield, Plus, Trash2, Loader2, RefreshCw } from "lucide-react";
import type { InsuranceInstrument } from "@/db/types";
// Pas d'import de `@/lib/logger` ici : ce module commence par
// `import { env } from "cloudflare:workers"`, spécificateur qui n'existe que dans
// le graphe worker. Dans un composant `"use client"` il casse les deux
// environnements : `npm run build` échoue (« Rollup failed to resolve import »),
// et en dev le chargement dynamique du module échoue, donc la page ne rend rien.
// Ni tsc ni ESLint ni Vitest ne peuvent le voir — tsc résout le spécificateur via
// les types Wrangler et vitest.config.ts l'aliase vers un mock. Seul `npm run
// build` distingue le graphe client du graphe worker.
// `console.error` est le repli correct côté client, et ESLint l'autorise.

interface InstrumentForm {
  id?: number;
  instrument_name: string;
  brand: string;
  model: string;
  serial_number: string;
}

type InstrumentField = Exclude<keyof InstrumentForm, "id">;

interface InsuranceInstrumentFormProps {
  instrument: InstrumentForm;
  index: number;
  errors: Record<string, string>;
  canRemove: boolean;
  onRemove: (index: number) => void;
  onChange: (index: number, field: InstrumentField, value: string) => void;
}

function InsuranceInstrumentForm({
  instrument,
  index,
  errors,
  canRemove,
  onRemove,
  onChange,
}: InsuranceInstrumentFormProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Instrument {index + 1}</h3>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-destructive"
            aria-label={`Supprimer l'instrument ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`instrument_${index}_name`}>
          Instrument <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`instrument_${index}_name`}
          value={instrument.instrument_name}
          aria-invalid={errors[`instrument_${index}_name`] ? true : undefined}
          aria-describedby={
            errors[`instrument_${index}_name`] ? `instrument_${index}_name-error` : undefined
          }
          onChange={(event) => onChange(index, "instrument_name", event.target.value)}
          placeholder="Ex : Violon"
        />
        {errors[`instrument_${index}_name`] && (
          <p id={`instrument_${index}_name-error`} className="text-sm text-destructive">
            {errors[`instrument_${index}_name`]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`instrument_${index}_brand`}>
            Marque <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`instrument_${index}_brand`}
            value={instrument.brand}
            aria-invalid={errors[`instrument_${index}_brand`] ? true : undefined}
            aria-describedby={
              errors[`instrument_${index}_brand`] ? `instrument_${index}_brand-error` : undefined
            }
            onChange={(event) => onChange(index, "brand", event.target.value)}
            placeholder="Ex : Stradivarius"
          />
          {errors[`instrument_${index}_brand`] && (
            <p id={`instrument_${index}_brand-error`} className="text-sm text-destructive">
              {errors[`instrument_${index}_brand`]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`instrument_${index}_model`}>
            Modèle <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`instrument_${index}_model`}
            value={instrument.model}
            aria-invalid={errors[`instrument_${index}_model`] ? true : undefined}
            aria-describedby={
              errors[`instrument_${index}_model`] ? `instrument_${index}_model-error` : undefined
            }
            onChange={(event) => onChange(index, "model", event.target.value)}
            placeholder="Ex : Messiah"
          />
          {errors[`instrument_${index}_model`] && (
            <p id={`instrument_${index}_model-error`} className="text-sm text-destructive">
              {errors[`instrument_${index}_model`]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`instrument_${index}_serial`}>
            Numéro de série <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`instrument_${index}_serial`}
            value={instrument.serial_number}
            aria-invalid={errors[`instrument_${index}_serial`] ? true : undefined}
            aria-describedby={
              errors[`instrument_${index}_serial`] ? `instrument_${index}_serial-error` : undefined
            }
            onChange={(event) => onChange(index, "serial_number", event.target.value)}
            placeholder="Ex : SN12345678"
          />
          {errors[`instrument_${index}_serial`] && (
            <p id={`instrument_${index}_serial-error`} className="text-sm text-destructive">
              {errors[`instrument_${index}_serial`]}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function MusicianAssuranceClient() {
  const [instruments, setInstruments] = useState<InstrumentForm[]>([
    { instrument_name: "", brand: "", model: "", serial_number: "" },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchInstruments = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/musician/insurance");
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des instruments assurés.");
      }

      const data = (await response.json()) as InsuranceInstrument[];
      if (data.length > 0) {
        setInstruments(
          data.map((instrument) => ({
            id: instrument.id,
            instrument_name: instrument.instrument_name,
            brand: instrument.brand,
            model: instrument.model,
            serial_number: instrument.serial_number,
          }))
        );
      }
    } catch (err) {
      console.error("Erreur lors du chargement des instruments assurés :", err);
      if (showLoading) {
        setError(err instanceof Error ? err.message : "Une erreur inattendue est survenue.");
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    instruments.forEach((instrument, index) => {
      if (!instrument.instrument_name.trim()) {
        newErrors[`instrument_${index}_name`] = "Le nom de l'instrument est obligatoire";
      }
      if (!instrument.brand.trim()) {
        newErrors[`instrument_${index}_brand`] = "La marque est obligatoire";
      }
      if (!instrument.model.trim()) {
        newErrors[`instrument_${index}_model`] = "Le modèle est obligatoire";
      }
      if (!instrument.serial_number.trim()) {
        newErrors[`instrument_${index}_serial`] = "Le numéro de série est obligatoire";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      const response = await fetch("/api/musician/insurance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruments }),
      });

      if (response.ok) {
        setErrors({});
        setSaved(true);
        await fetchInstruments(false);
      } else {
        const data = (await response.json()) as { error?: string };
        setErrors({ submit: data.error || "Une erreur est survenue" });
      }
    } catch (err) {
      console.error("Erreur lors de l'enregistrement des instruments assurés :", err);
      setErrors({ submit: "Erreur lors de l'enregistrement" });
    } finally {
      setSaving(false);
    }
  };

  const addInstrument = () => {
    if (instruments.length < 2) {
      setInstruments([
        ...instruments,
        { instrument_name: "", brand: "", model: "", serial_number: "" },
      ]);
    }
  };

  const removeInstrument = (index: number) => {
    if (instruments.length > 1) {
      setInstruments(instruments.filter((_, instrumentIndex) => instrumentIndex !== index));
    }
  };

  const updateInstrument = (index: number, field: InstrumentField, value: string) => {
    const updated = [...instruments];
    updated[index] = { ...updated[index], [field]: value };
    setInstruments(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Assurance instrument</h1>
        <p className="mt-1 text-muted-foreground">
          Enregistrez vos instruments pour bénéficier de l'assurance de l'association
        </p>
      </div>

      {error ? (
        <div role="alert">
          <EmptyState
            icon={<Shield className="h-8 w-8" />}
            title={error}
            action={
              <Button type="button" onClick={() => fetchInstruments()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {saved && (
            <div
              role="status"
              className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success"
            >
              Vos instruments assurés ont été enregistrés.
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Mes instruments assurés
              </CardTitle>
              <CardDescription>
                Vous pouvez enregistrer jusqu'à 2 instruments. Tous les champs sont obligatoires.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {errors.submit && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
                >
                  {errors.submit}
                </div>
              )}

              {instruments.map((instrument, index) => (
                <InsuranceInstrumentForm
                  key={instrument.id ?? index}
                  instrument={instrument}
                  index={index}
                  errors={errors}
                  canRemove={instruments.length > 1}
                  onRemove={removeInstrument}
                  onChange={updateInstrument}
                />
              ))}

              {instruments.length < 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addInstrument}
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un instrument
                </Button>
              )}

              <div className="flex justify-end">
                <Button type="button" onClick={handleSave} disabled={saving} size="lg">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer mes instruments"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
