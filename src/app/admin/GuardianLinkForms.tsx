"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createGuardianAccount,
  errorMessage,
  handoverEmail,
  linkGuardian,
} from "./guardians-client";
import { getFullName, matchesUserSearch, type UserWithProfile } from "./users-shared";

const MAX_RESULTS = 8;

export interface ChildSummary {
  id: number;
  name: string;
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm"
    >
      {message}
    </div>
  );
}

function displayName(user: UserWithProfile): string {
  return getFullName(user) || "Sans nom";
}

/* -------------------------------------------------------------------------- */
/* Lien de parenté                                                            */
/* -------------------------------------------------------------------------- */

const RELATION_SUGGESTIONS = ["mère", "père", "tutrice", "tuteur", "grand-mère", "grand-père"];

function RelationField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  const listId = `${id}-suggestions`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Lien de parenté (facultatif)</Label>
      <Input
        id={id}
        list={listId}
        value={value}
        maxLength={50}
        onChange={(e) => onChange(e.target.value)}
        placeholder="mère, père, tutrice…"
      />
      <datalist id={listId}>
        {RELATION_SUGGESTIONS.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Recherche d'un compte existant                                             */
/* -------------------------------------------------------------------------- */

interface AccountPickerProps {
  users: UserWithProfile[];
  excludeIds: ReadonlySet<number>;
  selected: UserWithProfile | null;
  onSelect: (user: UserWithProfile | null) => void;
  label: string;
}

/**
 * Un responsable est un compte musicien ou responsable actif. Les comptes
 * administrateurs et les comptes gérés ne sont jamais proposés.
 */
export function getLinkableAccounts(
  users: UserWithProfile[],
  excludeIds: ReadonlySet<number>
): UserWithProfile[] {
  return users.filter(
    (user) =>
      user.id !== undefined &&
      !excludeIds.has(user.id) &&
      user.role === "MUSICIAN" &&
      (user.kind ?? "member") !== "managed" &&
      user.is_active !== 0
  );
}

export function AccountPicker({
  users,
  excludeIds,
  selected,
  onSelect,
  label,
}: AccountPickerProps) {
  const id = useId();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return getLinkableAccounts(users, excludeIds)
      .filter((user) => matchesUserSearch(user, query, { includeRelations: false }))
      .sort((a, b) => {
        const guardianFirst = Number(b.kind === "guardian") - Number(a.kind === "guardian");
        if (guardianFirst !== 0) return guardianFirst;
        return displayName(a).localeCompare(displayName(b), "fr");
      });
  }, [users, excludeIds, query]);

  if (selected) {
    return (
      <div className="grid gap-2">
        <Label>{label}</Label>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
          <div className="min-w-0 text-sm">
            <p className="font-medium truncate">{displayName(selected)}</p>
            {selected.email && (
              <p className="text-xs text-muted-foreground truncate">{selected.email}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelect(null)}
            aria-label="Choisir un autre compte"
          >
            <X className="w-4 h-4 mr-1" />
            Changer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, prénom ou e-mail"
          className="pl-9"
          autoComplete="off"
        />
      </div>
      {query.trim() === "" ? (
        <p className="text-xs text-muted-foreground">
          Tapez un nom ou une adresse e-mail pour retrouver le compte.
        </p>
      ) : results.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aucun compte trouvé. Seuls les comptes actifs de musiciens ou de responsables peuvent être
          choisis.
        </p>
      ) : (
        <ul
          role="listbox"
          aria-label="Comptes trouvés"
          className="max-h-48 overflow-y-auto rounded-lg border border-border bg-card divide-y divide-border"
        >
          {results.slice(0, MAX_RESULTS).map((user) => (
            <li key={user.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => onSelect(user)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none cursor-pointer"
              >
                <span className="min-w-0">
                  <span className="block font-medium truncate">{displayName(user)}</span>
                  <span className="block text-xs text-muted-foreground truncate">{user.email}</span>
                </span>
                {user.kind === "guardian" && (
                  <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                    Responsable
                  </span>
                )}
              </button>
            </li>
          ))}
          {results.length > MAX_RESULTS && (
            <li role="presentation" className="px-3 py-2 text-xs text-muted-foreground">
              {results.length - MAX_RESULTS} autres comptes : précisez la recherche.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Relier un compte existant                                                  */
/* -------------------------------------------------------------------------- */

interface LinkExistingFormProps {
  child: ChildSummary;
  users: UserWithProfile[];
  excludeIds: ReadonlySet<number>;
  onLinked: () => void;
  onCancel: () => void;
}

export function LinkExistingForm({
  child,
  users,
  excludeIds,
  onLinked,
  onCancel,
}: LinkExistingFormProps) {
  const [selected, setSelected] = useState<UserWithProfile | null>(null);
  const [relation, setRelation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected?.id) return;
    setSaving(true);
    setError(null);
    const result = await linkGuardian({
      childUserId: child.id,
      guardianUserId: selected.id,
      relation: relation.trim(),
    });
    setSaving(false);
    if (result.ok) onLinked();
    else setError(errorMessage(result));
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-sm font-medium">Lier un compte existant à {child.name}</p>
      <ErrorBanner message={error} />
      <AccountPicker
        label="Compte du responsable"
        users={users}
        excludeIds={excludeIds}
        selected={selected}
        onSelect={setSelected}
      />
      <RelationField value={relation} onChange={setRelation} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={!selected || saving}>
          {saving ? "Liaison..." : "Lier ce compte"}
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Créer un compte responsable                                                */
/* -------------------------------------------------------------------------- */

interface CreateGuardianFormProps {
  child: ChildSummary;
  users: UserWithProfile[];
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateGuardianForm({ child, users, onCreated, onCancel }: CreateGuardianFormProps) {
  const id = useId();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingUserId, setExistingUserId] = useState<number | null>(null);

  const existingUser = existingUserId
    ? (users.find((user) => user.id === existingUserId) ?? null)
    : null;
  const canSubmit = firstName.trim() && lastName.trim() && email.trim();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    setExistingUserId(null);
    const result = await createGuardianAccount({
      childUserId: child.id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      relation: relation.trim(),
    });
    setSaving(false);
    if (result.ok) {
      onCreated();
      return;
    }
    setError(errorMessage(result));
    if (result.status === 409 && result.data.existingUserId) {
      setExistingUserId(result.data.existingUserId);
    }
  };

  const linkExisting = async () => {
    if (!existingUserId) return;
    setSaving(true);
    setError(null);
    const result = await linkGuardian({
      childUserId: child.id,
      guardianUserId: existingUserId,
      relation: relation.trim(),
    });
    setSaving(false);
    if (result.ok) onCreated();
    else {
      setExistingUserId(null);
      setError(errorMessage(result));
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4">
      <div>
        <p className="text-sm font-medium">Créer un compte responsable pour {child.name}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Le responsable se connectera avec son adresse e-mail (lien de connexion envoyé par
          e-mail).
        </p>
      </div>
      <ErrorBanner message={error} />
      {existingUserId && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/50 dark:bg-amber-900/10">
          <p>
            Cette adresse appartient déjà à
            {existingUser ? ` ${displayName(existingUser)}` : " un compte existant"}.
          </p>
          <Button type="button" size="sm" className="mt-2" onClick={linkExisting} disabled={saving}>
            Lier ce compte existant à {child.name}
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-first`}>Prénom *</Label>
          <Input
            id={`${id}-first`}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Marie"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-last`}>Nom *</Label>
          <Input
            id={`${id}-last`}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Dupont"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-email`}>E-mail *</Label>
          <Input
            id={`${id}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="marie.dupont@email.com"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-phone`}>Téléphone</Label>
          <Input
            id={`${id}-phone`}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="06 12 34 56 78"
          />
        </div>
      </div>
      <RelationField value={relation} onChange={setRelation} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={!canSubmit || saving}>
          {saving ? "Création..." : "Créer le responsable"}
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Transférer l'adresse à un parent                                           */
/* -------------------------------------------------------------------------- */

interface HandoverFormProps {
  child: ChildSummary & { email: string };
  users: UserWithProfile[];
  excludeIds: ReadonlySet<number>;
  /** Vrai dans la fiche en modification : les changements non enregistrés seront perdus. */
  inEditForm?: boolean;
  onDone: (notice: string) => void;
  onCancel: () => void;
}

type HandoverMode = "new" | "existing";

export function HandoverForm({
  child,
  users,
  excludeIds,
  inEditForm,
  onDone,
  onCancel,
}: HandoverFormProps) {
  const [mode, setMode] = useState<HandoverMode>("new");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selected, setSelected] = useState<UserWithProfile | null>(null);
  const [relation, setRelation] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  const guardianName =
    mode === "new"
      ? `${firstName.trim()} ${lastName.trim()}`.trim()
      : selected
        ? displayName(selected)
        : "";
  const canContinue = mode === "new" ? !!(firstName.trim() && lastName.trim()) : !!selected?.id;

  const run = async () => {
    setSaving(true);
    setError(null);
    const result = await handoverEmail(
      mode === "new"
        ? {
            childUserId: child.id,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            relation: relation.trim(),
          }
        : { childUserId: child.id, guardianUserId: selected?.id, relation: relation.trim() }
    );
    setSaving(false);
    setConfirmOpen(false);
    if (!result.ok) {
      setError(errorMessage(result));
      return;
    }
    if (mode === "new") {
      onDone(
        `L'adresse ${child.email} est maintenant celle de ${guardianName}. ${child.name} n'a plus de connexion personnelle.`
      );
    } else {
      const previous = result.data.previousEmail ?? child.email;
      onDone(
        `${guardianName} est maintenant responsable de ${child.name}. L'ancienne adresse ${previous} n'est plus utilisée.`
      );
    }
  };

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4">
      <div>
        <p className="text-sm font-medium">Transférer l'adresse de {child.name} à un parent</p>
        <p className="text-xs text-muted-foreground mt-1">
          À utiliser quand l'adresse e-mail de {child.name} est en réalité celle de ses parents.
        </p>
      </div>
      <ErrorBanner message={error} />

      <div role="radiogroup" aria-label="Situation du parent" className="flex flex-wrap gap-2">
        {(
          [
            ["new", "Le parent n'a pas encore de compte"],
            ["existing", "Le parent a déjà un compte"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-full border transition-colors cursor-pointer",
              mode === value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:bg-muted"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "new" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`${id}-first`}>Prénom du parent *</Label>
            <Input
              id={`${id}-first`}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Marie"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-last`}>Nom du parent *</Label>
            <Input
              id={`${id}-last`}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Dupont"
            />
          </div>
        </div>
      ) : (
        <AccountPicker
          label="Compte du parent"
          users={users}
          excludeIds={excludeIds}
          selected={selected}
          onSelect={setSelected}
        />
      )}
      <RelationField value={relation} onChange={setRelation} />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canContinue}
          onClick={() => setConfirmOpen(true)}
        >
          Continuer
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !saving && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transférer l'adresse de {child.name} ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Voici ce qui va se passer :</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  {mode === "new" ? (
                    <li>
                      L'adresse <strong>{child.email}</strong> devient l'adresse de connexion de{" "}
                      <strong>{guardianName}</strong>, qui reçoit un nouveau compte responsable.
                    </li>
                  ) : (
                    <li>
                      L'adresse <strong>{child.email}</strong> est abandonnée : elle ne sera pas
                      reprise par le compte de <strong>{guardianName}</strong>, qui garde son
                      adresse actuelle.
                    </li>
                  )}
                  <li>
                    {child.name} n'aura plus de connexion personnelle : son compte sera géré par{" "}
                    {guardianName}.
                  </li>
                  <li>Les connexions en cours de {child.name} sont fermées tout de suite.</li>
                  <li>Vous pourrez lui donner une adresse personnelle plus tard.</li>
                </ul>
                {inEditForm && (
                  <p className="font-medium">
                    Les modifications non enregistrées de cette fiche seront perdues.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                void run();
              }}
            >
              {saving ? "Transfert..." : "Transférer l'adresse"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
