import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { cn } from "@/lib/utils";
import type { ProfileWithInstruments } from "./profile-validation";

interface AddressSectionProps {
  profile: ProfileWithInstruments;
  fieldErrors: Record<string, string>;
  onFieldChange: (field: string, value: string) => void;
  onProfileChange: (patch: Partial<ProfileWithInstruments>) => void;
}

/**
 * Séparée de `PersonalInfoSection` (§D4) : dans l'ancien formulaire,
 * l'adresse était une simple sous-section imbriquée sans son propre repère
 * de navigation, invisible du sommaire de progression.
 */
export function AddressSection({
  profile,
  fieldErrors,
  onFieldChange,
  onProfileChange,
}: AddressSectionProps) {
  return (
    <Card id="address">
      <CardHeader>
        <CardTitle>Adresse postale</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address_line1">
            Adresse <span className="text-destructive">*</span>
          </Label>
          <Input
            id="address_line1"
            value={profile.address_line1 || ""}
            onChange={(e) => onProfileChange({ address_line1: e.target.value })}
            placeholder="123 rue de la Musique"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address_line2">Complément d&apos;adresse</Label>
          <Input
            id="address_line2"
            value={profile.address_line2 || ""}
            onChange={(e) => onProfileChange({ address_line2: e.target.value })}
            placeholder="Appartement 4B, Bâtiment C"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="postal_code">
              Code postal <span className="text-destructive">*</span>
            </Label>
            <Input
              id="postal_code"
              value={profile.postal_code || ""}
              onChange={(e) => onFieldChange("postal_code", e.target.value)}
              placeholder="94370"
              maxLength={5}
              className={cn(
                fieldErrors.postal_code && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {fieldErrors.postal_code && (
              <p className="text-xs text-destructive">{fieldErrors.postal_code}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">
              Ville <span className="text-destructive">*</span>
            </Label>
            <Input
              id="city"
              value={profile.city || ""}
              onChange={(e) => onFieldChange("city", e.target.value)}
              placeholder="Sucy-en-Brie"
              className={cn(
                fieldErrors.city && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {fieldErrors.city && <p className="text-xs text-destructive">{fieldErrors.city}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
