import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { InstrumentEditor, type Instrument } from "@/app/components/shared/InstrumentEditor";
import type { ProfileWithInstruments } from "./profile-validation";

interface InstrumentPracticeSectionProps {
  profile: ProfileWithInstruments;
  onProfileChange: (patch: Partial<ProfileWithInstruments>) => void;
}

export function InstrumentPracticeSection({
  profile,
  onProfileChange,
}: InstrumentPracticeSectionProps) {
  return (
    <Card id="instrument-practice">
      <CardHeader>
        <CardTitle>Pratique instrumentale et formation musicale</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>
            Élève au Conservatoire de Sucy-en-Brie <span className="text-destructive">*</span>
          </Label>
          <div className="flex h-10 items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="conservatory"
                checked={profile.is_conservatory_student === 1}
                onChange={() => onProfileChange({ is_conservatory_student: 1 })}
                className="h-4 w-4 text-primary"
              />
              <span className="text-sm">Oui</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="conservatory"
                checked={profile.is_conservatory_student === 0}
                onChange={() => onProfileChange({ is_conservatory_student: 0 })}
                className="h-4 w-4 text-primary"
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
            onChange={(e) => onProfileChange({ music_theory_level: e.target.value })}
            placeholder="Ex: Cycle 2, 3ème année"
          />
        </div>

        <InstrumentEditor
          instruments={(profile.instruments || []) as Instrument[]}
          onChange={(instruments) => onProfileChange({ instruments })}
        />
      </CardContent>
    </Card>
  );
}
