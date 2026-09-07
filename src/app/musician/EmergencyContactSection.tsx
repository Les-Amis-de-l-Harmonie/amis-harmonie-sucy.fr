import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { cn } from "@/lib/utils";
import type { ProfileWithInstruments } from "./profile-validation";

interface EmergencyContactSectionProps {
  profile: ProfileWithInstruments;
  fieldErrors: Record<string, string>;
  onFieldChange: (field: string, value: string) => void;
  /** "Représentant légal" si le musicien est mineur, "Contact d'urgence" sinon. */
  title: string;
}

export function EmergencyContactSection({
  profile,
  fieldErrors,
  onFieldChange,
  title,
}: EmergencyContactSectionProps) {
  return (
    <Card id="emergency-contact">
      <CardHeader>
        <CardTitle>
          {title} <span className="text-destructive">*</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_first_name">
              Prénom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="emergency_contact_first_name"
              aria-invalid={!!fieldErrors.emergency_contact_first_name || undefined}
              aria-describedby={
                fieldErrors.emergency_contact_first_name
                  ? "emergency_contact_first_name-error"
                  : undefined
              }
              value={profile.emergency_contact_first_name || ""}
              onChange={(e) => onFieldChange("emergency_contact_first_name", e.target.value)}
              placeholder="Marie"
              className={cn(
                fieldErrors.emergency_contact_first_name &&
                  "border-destructive focus-visible:ring-destructive"
              )}
            />
            {fieldErrors.emergency_contact_first_name && (
              <p id="emergency_contact_first_name-error" className="text-xs text-destructive">
                {fieldErrors.emergency_contact_first_name}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_last_name">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="emergency_contact_last_name"
              aria-invalid={!!fieldErrors.emergency_contact_last_name || undefined}
              aria-describedby={
                fieldErrors.emergency_contact_last_name
                  ? "emergency_contact_last_name-error"
                  : undefined
              }
              value={profile.emergency_contact_last_name || ""}
              onChange={(e) => onFieldChange("emergency_contact_last_name", e.target.value)}
              placeholder="Dupont"
              className={cn(
                fieldErrors.emergency_contact_last_name &&
                  "border-destructive focus-visible:ring-destructive"
              )}
            />
            {fieldErrors.emergency_contact_last_name && (
              <p id="emergency_contact_last_name-error" className="text-xs text-destructive">
                {fieldErrors.emergency_contact_last_name}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_email">Email</Label>
            <Input
              id="emergency_contact_email"
              aria-invalid={!!fieldErrors.emergency_contact_email || undefined}
              aria-describedby={
                fieldErrors.emergency_contact_email ? "emergency_contact_email-error" : undefined
              }
              type="email"
              value={profile.emergency_contact_email || ""}
              onChange={(e) => onFieldChange("emergency_contact_email", e.target.value)}
              placeholder="marie.dupont@email.com"
              className={cn(
                fieldErrors.emergency_contact_email &&
                  "border-destructive focus-visible:ring-destructive"
              )}
            />
            {fieldErrors.emergency_contact_email && (
              <p id="emergency_contact_email-error" className="text-xs text-destructive">
                {fieldErrors.emergency_contact_email}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone">
              Téléphone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="emergency_contact_phone"
              aria-invalid={!!fieldErrors.emergency_contact_phone || undefined}
              aria-describedby={
                fieldErrors.emergency_contact_phone ? "emergency_contact_phone-error" : undefined
              }
              type="tel"
              value={profile.emergency_contact_phone || ""}
              onChange={(e) => onFieldChange("emergency_contact_phone", e.target.value)}
              placeholder="06 12 34 56 78"
              className={cn(
                fieldErrors.emergency_contact_phone &&
                  "border-destructive focus-visible:ring-destructive"
              )}
            />
            {fieldErrors.emergency_contact_phone && (
              <p id="emergency_contact_phone-error" className="text-xs text-destructive">
                {fieldErrors.emergency_contact_phone}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
