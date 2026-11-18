"use client";

import { useId, useState } from "react";
import { MailX } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { errorMessage, giveAccess } from "./guardians-client";

interface ManagedAccountNoticeProps {
  /** Identifiant du compte géré. */
  userId: number | undefined;
  /** Prénom et nom du musicien, pour les messages. */
  name: string;
  /** « Prénom Nom, Prénom Nom » ou null. */
  guardianNames: string | null | undefined;
  /** Seul un super-administrateur peut donner un accès personnel. */
  canGiveAccess: boolean;
  inEditForm?: boolean;
  onGiven: (notice: string) => void;
}

/**
 * Remplace le champ e-mail d'un compte géré : ce musicien n'a pas d'adresse,
 * ses responsables agissent à sa place.
 */
export function ManagedAccountNotice({
  userId,
  name,
  guardianNames,
  canGiveAccess,
  inEditForm,
  onGiven,
}: ManagedAccountNoticeProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || !email.trim()) return;
    setSaving(true);
    setError(null);
    const result = await giveAccess({ childUserId: userId, email: email.trim() });
    setSaving(false);
    if (result.ok) {
      onGiven(`${name} peut maintenant se connecter avec l'adresse ${email.trim().toLowerCase()}.`);
    } else {
      setError(errorMessage(result));
    }
  };

  return (
    <div className="grid gap-2 col-span-2" data-testid="managed-account-notice">
      <Label>Connexion</Label>
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 grid gap-3">
        <p className="flex items-start gap-2 text-sm">
          <MailX className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>
            {guardianNames ? (
              <>
                Pas de connexion, géré par <strong>{guardianNames}</strong>
              </>
            ) : (
              <>
                Pas de connexion,{" "}
                <em className="text-muted-foreground">et aucun responsable pour le moment</em>
              </>
            )}
          </span>
        </p>

        {!canGiveAccess && (
          <p className="text-xs text-muted-foreground">
            Seul un super-administrateur peut donner un accès personnel.
          </p>
        )}

        {canGiveAccess && !open && (
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
              Donner un accès personnel
            </Button>
          </div>
        )}

        {canGiveAccess && open && (
          <form onSubmit={submit} className="grid gap-3">
            {error && (
              <div
                role="alert"
                className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm"
              >
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor={id}>Adresse e-mail de {name}</Label>
              <Input
                id={id}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@email.com"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                {name} pourra se connecter avec cette adresse. Ses responsables restent liés tant
                que vous ne les retirez pas.
                {inEditForm && " Les modifications non enregistrées de cette fiche seront perdues."}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={!email.trim() || saving}>
                {saving ? "Enregistrement..." : "Donner l'accès"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
