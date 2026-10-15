"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { readApiError, type AdminReservation } from "./reservations-utils";

const MAX_PARTY_SIZE = 50;

interface ReservationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventSlug: string;
  /** Réservation à modifier ; absente = nouvelle réservation (prise par téléphone). */
  reservation: AdminReservation | null;
  onSaved: (message: string) => void;
}

export function ReservationFormDialog({
  open,
  onOpenChange,
  eventSlug,
  reservation,
  onSaved,
}: ReservationFormDialogProps) {
  const isEdit = reservation !== null;
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [partySize, setPartySize] = useState("1");
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [sendConfirmation, setSendConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    if (reservation) {
      setLastName(reservation.lastName ?? "");
      setFirstName(reservation.firstName ?? "");
      setEmail(reservation.email ?? "");
      setPartySize(String(reservation.partySize));
      setNewsletterOptIn(reservation.newsletterOptIn);
      setSendConfirmation(false);
    } else {
      setLastName("");
      setFirstName("");
      setEmail("");
      setPartySize("1");
      setNewsletterOptIn(false);
      setSendConfirmation(false);
    }
  }, [open, reservation]);

  const hasEmail = email.trim().length > 0;

  const handleEmailChange = (value: string) => {
    const hadEmail = hasEmail;
    setEmail(value);
    const nowHasEmail = value.trim().length > 0;
    if (!isEdit && !hadEmail && nowHasEmail) setSendConfirmation(true);
    if (!nowHasEmail) {
      setSendConfirmation(false);
      setNewsletterOptIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const size = Number(partySize);
    if (!lastName.trim() || !firstName.trim()) {
      setError("Le nom et le prénom sont obligatoires.");
      return;
    }
    if (!Number.isInteger(size) || size < 1 || size > MAX_PARTY_SIZE) {
      setError(`Le nombre de places doit être compris entre 1 et ${MAX_PARTY_SIZE}.`);
      return;
    }

    setSaving(true);
    try {
      const trimmedEmail = email.trim();
      const base = {
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        email: trimmedEmail || null,
        partySize: size,
        newsletterOptIn: trimmedEmail ? newsletterOptIn : false,
      };

      const response = isEdit
        ? await fetch(`/api/admin/reservations?id=${reservation.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(base),
          })
        : await fetch("/api/admin/reservations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...base,
              eventSlug,
              sendConfirmation: Boolean(trimmedEmail) && sendConfirmation,
            }),
          });

      if (!response.ok) {
        setError(
          await readApiError(response, "L'enregistrement a échoué. Réessayez dans un instant.")
        );
        return;
      }
      onSaved(isEdit ? "Réservation modifiée." : "Réservation ajoutée.");
      onOpenChange(false);
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const idPrefix = isEdit ? "edit-reservation" : "new-reservation";

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la réservation" : "Ajouter une réservation"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Les changements sont enregistrés tout de suite. Aucun e-mail n'est envoyé."
              : "Pour une réservation prise par téléphone ou sur place."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-last-name`}>Nom</Label>
              <Input
                id={`${idPrefix}-last-name`}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="off"
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-first-name`}>Prénom</Label>
              <Input
                id={`${idPrefix}-first-name`}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="off"
                maxLength={100}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-email`}>
              Adresse e-mail{" "}
              <span className="font-normal text-muted-foreground">
                {isEdit ? "(facultative)" : "(facultative, utile pour la confirmation)"}
              </span>
            </Label>
            <Input
              id={`${idPrefix}-email`}
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              autoComplete="off"
              maxLength={254}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-party-size`}>Nombre de places</Label>
            <Input
              id={`${idPrefix}-party-size`}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_PARTY_SIZE}
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              className="w-28"
              required
            />
            <p className="text-xs text-muted-foreground">Entre 1 et {MAX_PARTY_SIZE}.</p>
          </div>

          <div className="space-y-2.5 rounded-lg border border-border bg-muted/40 p-3">
            <label
              className={`flex items-start gap-3 text-sm ${hasEmail ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                checked={newsletterOptIn}
                disabled={!hasEmail}
                onChange={(e) => setNewsletterOptIn(e.target.checked)}
              />
              <span>
                Inscrit(e) à la newsletter
                <span className="block text-xs text-muted-foreground">
                  À cocher seulement si la personne a donné son accord.
                </span>
              </span>
            </label>

            {!isEdit && (
              <label
                className={`flex items-start gap-3 text-sm ${hasEmail ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  checked={sendConfirmation}
                  disabled={!hasEmail}
                  onChange={(e) => setSendConfirmation(e.target.checked)}
                />
                <span>
                  Envoyer l'e-mail de confirmation
                  {!hasEmail && (
                    <span className="block text-xs text-muted-foreground">
                      Saisissez une adresse e-mail pour activer cette option.
                    </span>
                  )}
                </span>
              </label>
            )}
          </div>

          <div aria-live="polite">
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isEdit ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
