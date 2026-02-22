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
import { Shield, Plus, Trash2, Loader2, CheckCircle } from "lucide-react";
import type { InsuranceInstrument } from "@/db/types";

interface InstrumentForm {
  id?: number;
  instrument_name: string;
  brand: string;
  model: string;
  serial_number: string;
}

export function MusicianAssuranceClient() {
  const [instruments, setInstruments] = useState<InstrumentForm[]>([
    { instrument_name: "", brand: "", model: "", serial_number: "" },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchInstruments = useCallback(async () => {
    try {
      const response = await fetch("/api/musician/insurance");
      if (response.ok) {
        const data = (await response.json()) as InsuranceInstrument[];
        if (data.length > 0) {
          setInstruments(
            data.map((i) => ({
              id: i.id,
              instrument_name: i.instrument_name,
              brand: i.brand,
              model: i.model,
              serial_number: i.serial_number,
            }))
          );
        }
      }
    } catch (err) {
      console.error("Error fetching insurance instruments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    instruments.forEach((instr, index) => {
      if (!instr.instrument_name.trim()) {
        newErrors[`instrument_${index}_name`] = "Le nom de l'instrument est obligatoire";
      }
      if (!instr.brand.trim()) {
        newErrors[`instrument_${index}_brand`] = "La marque est obligatoire";
      }
      if (!instr.model.trim()) {
        newErrors[`instrument_${index}_model`] = "Le modèle est obligatoire";
      }
      if (!instr.serial_number.trim()) {
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
        setSaved(true);
        setTimeout(() => {
          window.location.href = "/musician/";
        }, 1500);
      } else {
        const data = (await response.json()) as { error?: string };
        setErrors({ submit: data.error || "Une erreur est survenue" });
      }
    } catch (err) {
      console.error("Error saving insurance instruments:", err);
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
      setInstruments(instruments.filter((_, i) => i !== index));
    }
  };

  const updateInstrument = (index: number, field: keyof InstrumentForm, value: string) => {
    const updated = [...instruments];
    updated[index] = { ...updated[index], [field]: value };
    setInstruments(updated);
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Assurance instrument
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Enregistrez vos instruments pour bénéficier de l'assurance de l'association
        </p>
      </div>

      {saved ? (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Instruments enregistrés avec succès !
            </h2>
            <p className="text-gray-500 dark:text-gray-400">Redirection en cours...</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Mes instruments assurés
            </CardTitle>
            <CardDescription>
              Vous pouvez enregistrer jusqu'à 2 instruments. Tous les champs sont obligatoires.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {errors.submit && (
              <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                {errors.submit}
              </div>
            )}

            {instruments.map((instrument, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Instrument {index + 1}
                  </h3>
                  {instruments.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInstrument(index)}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`instrument_${index}_name`}>
                    Instrument <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`instrument_${index}_name`}
                    value={instrument.instrument_name}
                    onChange={(e) => updateInstrument(index, "instrument_name", e.target.value)}
                    placeholder="Ex : Violon"
                  />
                  {errors[`instrument_${index}_name`] && (
                    <p className="text-sm text-red-500">{errors[`instrument_${index}_name`]}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`instrument_${index}_brand`}>
                      Marque <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`instrument_${index}_brand`}
                      value={instrument.brand}
                      onChange={(e) => updateInstrument(index, "brand", e.target.value)}
                      placeholder="Ex : Stradivarius"
                    />
                    {errors[`instrument_${index}_brand`] && (
                      <p className="text-sm text-red-500">{errors[`instrument_${index}_brand`]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`instrument_${index}_model`}>
                      Modèle <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`instrument_${index}_model`}
                      value={instrument.model}
                      onChange={(e) => updateInstrument(index, "model", e.target.value)}
                      placeholder="Ex : Messiah"
                    />
                    {errors[`instrument_${index}_model`] && (
                      <p className="text-sm text-red-500">{errors[`instrument_${index}_model`]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`instrument_${index}_serial`}>
                      Numéro de série <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`instrument_${index}_serial`}
                      value={instrument.serial_number}
                      onChange={(e) => updateInstrument(index, "serial_number", e.target.value)}
                      placeholder="Ex : SN12345678"
                    />
                    {errors[`instrument_${index}_serial`] && (
                      <p className="text-sm text-red-500">{errors[`instrument_${index}_serial`]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {instruments.length < 2 && (
              <Button variant="outline" onClick={addInstrument} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Ajouter un instrument
              </Button>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} size="lg">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer mes instruments"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
