"use client";

import { cn } from "@/lib/utils";
import type { UserKind } from "@/db/types";
import { Label } from "@/app/components/ui/label";

const OPTIONS: { value: UserKind; title: string; description: string }[] = [
  {
    value: "member",
    title: "Musicien",
    description: "Se connecte avec son adresse e-mail. Peut aussi être administrateur.",
  },
  {
    value: "guardian",
    title: "Responsable légal",
    description: "Parent ou tuteur : agit pour un ou plusieurs musiciens, ne joue pas.",
  },
  {
    value: "managed",
    title: "Musicien sans e-mail",
    description: "Pas de connexion : ses responsables gèrent son espace à sa place.",
  },
];

interface AccountTypePickerProps {
  value: UserKind;
  onChange: (value: UserKind) => void;
}

/** Choix du type de compte à la création d'un utilisateur. */
export function AccountTypePicker({ value, onChange }: AccountTypePickerProps) {
  return (
    <div className="grid gap-2">
      <Label id="account-type-label">Type de compte</Label>
      <div
        role="radiogroup"
        aria-labelledby="account-type-label"
        className="grid grid-cols-1 sm:grid-cols-3 gap-2"
      >
        {OPTIONS.map((option) => {
          const checked = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors cursor-pointer",
                checked
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              <span className="block text-sm font-medium text-foreground">{option.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
