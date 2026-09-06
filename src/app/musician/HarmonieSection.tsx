import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { HARMONIE_INSTRUMENTS } from "@/db/types";
import { resolveDeclaredPrimaryInstrument } from "@/lib/instruments";
import { PrimaryInstrumentPicker } from "./PrimaryInstrumentPicker";
import type { ProfileWithInstruments } from "./profile-validation";

interface HarmonieSectionProps {
  profile: ProfileWithInstruments;
  onProfileChange: (patch: Partial<ProfileWithInstruments>) => void;
}

export function HarmonieSection({ profile, onProfileChange }: HarmonieSectionProps) {
  const currentInstruments = profile.harmonieInstruments || [];

  return (
    <Card id="harmonie">
      <CardHeader>
        <CardTitle>Harmonie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="harmonie_start_date">
              Date d&apos;entrée à l&apos;Harmonie <span className="text-destructive">*</span>
            </Label>
            <Input
              id="harmonie_start_date"
              type="date"
              value={profile.harmonie_start_date || ""}
              onChange={(e) => onProfileChange({ harmonie_start_date: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            Instrument(s) joué(s) à l&apos;Harmonie <span className="text-destructive">*</span>
          </Label>
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            role="group"
            aria-label="Instruments joués à l'Harmonie"
          >
            {HARMONIE_INSTRUMENTS.map((instrument) => {
              const isSelected = currentInstruments.includes(instrument);
              return (
                <button
                  key={instrument}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    const nextInstruments = isSelected
                      ? currentInstruments.filter((i) => i !== instrument)
                      : [...currentInstruments, instrument];
                    onProfileChange({
                      harmonieInstruments: nextInstruments,
                      primaryHarmonieInstrument: resolveDeclaredPrimaryInstrument(
                        nextInstruments,
                        profile.primaryHarmonieInstrument
                      ),
                    });
                  }}
                  className={`flex cursor-pointer items-center gap-2 rounded border p-2 text-left text-sm transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" aria-hidden="true" />}
                  {instrument}
                </button>
              );
            })}
          </div>

          <PrimaryInstrumentPicker
            instruments={currentInstruments}
            primaryInstrument={profile.primaryHarmonieInstrument}
            onSelect={(instrument) => onProfileChange({ primaryHarmonieInstrument: instrument })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
