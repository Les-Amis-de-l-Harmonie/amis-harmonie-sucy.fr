import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { compareInstruments, resolveDeclaredPrimaryInstrument } from "@/lib/instruments";

interface PrimaryInstrumentPickerProps {
  instruments: string[];
  primaryInstrument: string | null | undefined;
  onSelect: (instrument: string) => void;
}

/**
 * Extrait de l'ancienne IIFE de 80 lignes dans `MusicianProfile.tsx` (§D4).
 * Aucun changement de comportement : 0 instrument → rien ; 1 → mention
 * automatique ; 2+ → sélecteur de pupitre obligatoire.
 */
export function PrimaryInstrumentPicker({
  instruments,
  primaryInstrument,
  onSelect,
}: PrimaryInstrumentPickerProps) {
  if (instruments.length === 0) return null;

  if (instruments.length === 1) {
    return (
      <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
        <Star className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" aria-hidden="true" />
        <span>
          <span className="font-medium text-foreground">{instruments[0]}</span> est votre instrument
          principal.
        </span>
      </p>
    );
  }

  const primary = resolveDeclaredPrimaryInstrument(instruments, primaryInstrument);

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border p-3 transition-colors",
        primary ? "border-border bg-muted/30" : "border-warning/40 bg-warning/10"
      )}
    >
      <div className="flex items-start gap-2">
        <Star
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            primary ? "fill-primary text-primary" : "text-warning"
          )}
          aria-hidden="true"
        />
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">
            Quel est votre instrument principal (pupitre){" "}
            <span className="text-destructive">*</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Vous jouez plusieurs instruments : indiquez votre instrument principal.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Instrument principal">
        {instruments
          .slice()
          .sort(compareInstruments)
          .map((instrument) => {
            const checked = primary === instrument;
            return (
              <button
                key={instrument}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onSelect(instrument)}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors",
                  checked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-muted"
                )}
              >
                {instrument}
              </button>
            );
          })}
      </div>
    </div>
  );
}
