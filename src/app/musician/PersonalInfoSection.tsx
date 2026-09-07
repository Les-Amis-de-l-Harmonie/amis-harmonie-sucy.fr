import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { cn } from "@/lib/utils";
import type { ProfileWithInstruments } from "./profile-validation";

interface PersonalInfoSectionProps {
  profile: ProfileWithInstruments;
  fieldErrors: Record<string, string>;
  onFieldChange: (field: string, value: string) => void;
  onProfileChange: (patch: Partial<ProfileWithInstruments>) => void;
}

export function PersonalInfoSection({
  profile,
  fieldErrors,
  onFieldChange,
  onProfileChange,
}: PersonalInfoSectionProps) {
  return (
    <Card id="personal-info">
      <CardHeader>
        <CardTitle>Informations personnelles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">
              Prénom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="first_name"
              aria-invalid={!!fieldErrors.first_name || undefined}
              aria-describedby={fieldErrors.first_name ? "first_name-error" : undefined}
              value={profile.first_name || ""}
              onChange={(e) => onFieldChange("first_name", e.target.value)}
              placeholder="Jean"
              className={cn(
                fieldErrors.first_name && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {fieldErrors.first_name && (
              <p id="first_name-error" className="text-xs text-destructive">
                {fieldErrors.first_name}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="last_name"
              aria-invalid={!!fieldErrors.last_name || undefined}
              aria-describedby={fieldErrors.last_name ? "last_name-error" : undefined}
              value={profile.last_name || ""}
              onChange={(e) => onFieldChange("last_name", e.target.value)}
              placeholder="Dupont"
              className={cn(
                fieldErrors.last_name && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {fieldErrors.last_name && (
              <p id="last_name-error" className="text-xs text-destructive">
                {fieldErrors.last_name}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date_of_birth">
              Date de naissance <span className="text-destructive">*</span>
            </Label>
            <Input
              id="date_of_birth"
              type="date"
              value={profile.date_of_birth || ""}
              onChange={(e) => onProfileChange({ date_of_birth: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">
              Téléphone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              aria-invalid={!!fieldErrors.phone || undefined}
              aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
              type="tel"
              value={profile.phone || ""}
              onChange={(e) => onFieldChange("phone", e.target.value)}
              placeholder="06 12 34 56 78"
              className={cn(
                fieldErrors.phone && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {fieldErrors.phone && (
              <p id="phone-error" className="text-xs text-destructive">
                {fieldErrors.phone}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={profile.email || ""}
            disabled
            className="cursor-not-allowed bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            L&apos;email ne peut pas être modifié. Contactez un administrateur en cas de changement.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
