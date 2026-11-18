"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Link2, Unlink, UserPlus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
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
import {
  entryName,
  errorMessage,
  fetchEffectiveImageConsent,
  fetchGuardianLinks,
  joinNames,
  recordImageConsent,
  removeGuardianLink,
  type GuardianLinkEntry,
  type GuardianLinksData,
} from "./guardians-client";
import {
  CreateGuardianForm,
  HandoverForm,
  LinkExistingForm,
  type ChildSummary,
} from "./GuardianLinkForms";
import {
  getAccountKind,
  getFullName,
  isAdultWithLinkedGuardian,
  type UserWithProfile,
} from "./users-shared";

export interface LinkedNames {
  guardians: string | null;
  children: string | null;
  /** Valeur effective du droit à l'image relue après une saisie (absente si inconnue). */
  imageConsent?: number | null;
}

interface UserGuardianLinksProps {
  /** Compte dont on ouvre la fiche (doit déjà exister). */
  user: Partial<UserWithProfile>;
  /** Liste déjà chargée, utilisée pour chercher un compte à lier. */
  users: UserWithProfile[];
  /** Super-administrateur : seul à pouvoir créer un responsable ou transférer une adresse. */
  canManageAccounts: boolean;
  /** Vrai dans la fiche en modification (avertit des changements non enregistrés). */
  inEditForm?: boolean;
  /** Après un lien ajouté ou retiré : la liste des utilisateurs doit être rechargée. */
  onLinksChanged: (names: LinkedNames) => void;
  /** Après un transfert d'adresse : le compte a changé de nature, la fiche doit se fermer. */
  onAccountChanged: (notice: string) => void;
}

type Panel = "link" | "create" | "handover" | null;

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

interface LinkRowProps {
  entry: GuardianLinkEntry;
  onRemove: (entry: GuardianLinkEntry) => void;
  /** Affiche la réponse « droit à l'image » (fiche d'un musicien, pas d'un responsable). */
  showConsent?: boolean;
  /** Seul un super-administrateur peut saisir une réponse papier. */
  canRecordConsent?: boolean;
  consentBusy?: boolean;
  onRecordConsent?: (entry: GuardianLinkEntry, consent: 0 | 1 | null) => Promise<boolean>;
}

function ConsentBadge({ entry }: { entry: GuardianLinkEntry }) {
  const consent = entry.imageConsent ?? null;
  const tone =
    consent === 1
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : consent === 0
        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
      >
        {consent === 1 ? "Oui" : consent === 0 ? "Non" : "Pas de réponse"}
      </span>
      {consent !== null && entry.imageConsentRecordedByAdmin && (
        <span className="text-xs text-muted-foreground">saisi par un admin</span>
      )}
    </span>
  );
}

function LinkRow({
  entry,
  onRemove,
  showConsent,
  canRecordConsent,
  consentBusy,
  onRecordConsent,
}: LinkRowProps) {
  const name = entryName(entry);
  const [editing, setEditing] = useState(false);
  const hasAnswer = entry.imageConsent === 0 || entry.imageConsent === 1;
  // Le panneau se referme une fois la réponse enregistrée ; en cas d'erreur il reste ouvert.
  const record = async (consent: 0 | 1 | null) => {
    if (await onRecordConsent?.(entry, consent)) setEditing(false);
  };
  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm">
          <p className="font-medium truncate">
            {name}
            {entry.relation && (
              <span className="font-normal text-muted-foreground"> · {entry.relation}</span>
            )}
            {!entry.isActive && (
              <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
                Compte inactif
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {entry.email ?? "Pas d'e-mail (compte géré)"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(entry)}
          aria-label={`Retirer ${name}`}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Unlink className="w-4 h-4 mr-1.5" />
          Retirer
        </Button>
      </div>
      {showConsent && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <span className="text-muted-foreground">Droit à l'image :</span>
          <ConsentBadge entry={entry} />
          {canRecordConsent && !editing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setEditing(true)}
              aria-label={`Saisir la réponse de ${name}`}
            >
              Saisir sa réponse
            </Button>
          )}
        </div>
      )}
      {showConsent && canRecordConsent && editing && (
        <div className="mt-2 rounded-md border border-border bg-muted/30 p-2.5 space-y-2">
          <p className="text-xs text-muted-foreground">Réponse reçue sur papier de {name} :</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={consentBusy}
              onClick={() => void record(1)}
            >
              Autorise
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={consentBusy}
              onClick={() => void record(0)}
            >
              N'autorise pas
            </Button>
            {hasAnswer && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={consentBusy}
                onClick={() => void record(null)}
              >
                Effacer la réponse
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={consentBusy}
              onClick={() => setEditing(false)}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

export function UserGuardianLinks({
  user,
  users,
  canManageAccounts,
  inEditForm,
  onLinksChanged,
  onAccountChanged,
}: UserGuardianLinksProps) {
  const userId = user.id;
  const kind = getAccountKind(user);
  const isGuardianView = kind === "guardian";
  const [data, setData] = useState<GuardianLinksData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [removing, setRemoving] = useState<GuardianLinkEntry | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [consentBusy, setConsentBusy] = useState(false);

  const refresh = useCallback(async (): Promise<GuardianLinksData | null> => {
    if (!userId || user.role !== "MUSICIAN") return null;
    const result = await fetchGuardianLinks(userId);
    if (!result.ok) {
      setLoadError(errorMessage(result));
      return null;
    }
    const next: GuardianLinksData = {
      guardians: result.data.guardians ?? [],
      children: result.data.children ?? [],
    };
    setLoadError(null);
    setData(next);
    return next;
  }, [user.id, user.role]);

  useEffect(() => {
    setData(null);
    setPanel(null);
    setActionError(null);
    void refresh();
  }, [refresh]);

  const entries = isGuardianView ? (data?.children ?? []) : (data?.guardians ?? []);

  const excludeIds = useMemo(() => {
    const ids = new Set<number>();
    if (userId) ids.add(userId);
    for (const entry of [...(data?.guardians ?? []), ...(data?.children ?? [])]) {
      ids.add(entry.userId);
    }
    return ids;
  }, [userId, data]);

  const afterChange = async () => {
    setPanel(null);
    setActionError(null);
    const next = await refresh();
    // Un lien ajouté ou retiré, ou une réponse saisie, change la valeur effective du droit à l'image.
    let imageConsent: number | null | undefined;
    if (userId) {
      const fresh = await fetchEffectiveImageConsent(userId);
      if (fresh.ok) imageConsent = fresh.data.image_consent ?? null;
    }
    if (next) {
      onLinksChanged({
        guardians: joinNames(next.guardians),
        children: joinNames(next.children),
        imageConsent,
      });
    }
  };

  const saveImageConsent = async (
    entry: GuardianLinkEntry,
    consent: 0 | 1 | null
  ): Promise<boolean> => {
    if (!userId) return false;
    setConsentBusy(true);
    setActionError(null);
    const result = await recordImageConsent({
      childUserId: userId,
      guardianUserId: entry.userId,
      consent,
    });
    setConsentBusy(false);
    if (!result.ok) {
      setActionError(errorMessage(result));
      return false;
    }
    await afterChange();
    return true;
  };

  const confirmRemoval = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    setActionError(null);
    const result = await removeGuardianLink(removing.linkId);
    setRemoveBusy(false);
    setRemoving(null);
    if (!result.ok) {
      setActionError(errorMessage(result));
      return;
    }
    await afterChange();
  };

  if (!userId || user.role !== "MUSICIAN") return null;

  const personName = getFullName(user) || "ce musicien";
  const child: ChildSummary = { id: userId, name: personName };
  const isInactive = user.is_active === 0;
  const canHandover =
    canManageAccounts && kind === "member" && !!user.email && !isInactive && !isGuardianView;
  const showAdultWarning =
    !isGuardianView && isAdultWithLinkedGuardian({ ...user, guardian_names: joinNames(entries) });
  const isManagedWithoutGuardian = kind === "managed" && data !== null && entries.length === 0;

  const removeTitle = removing ? `Retirer ${entryName(removing)} ?` : "";
  const removeDescription = removing
    ? isGuardianView
      ? `${personName} ne pourra plus agir pour ${entryName(removing)}. Les deux comptes sont conservés.`
      : `${entryName(removing)} ne pourra plus agir pour ${personName}. Les deux comptes sont conservés.`
    : "";
  const removeWarning =
    removing && !isGuardianView && kind === "managed" && entries.length === 1
      ? `${personName} n'a pas de connexion : sans responsable, plus personne ne pourra ouvrir son espace.`
      : removing && isGuardianView && removing.kind === "managed"
        ? `${entryName(removing)} n'a pas de connexion : s'il n'a pas d'autre responsable, plus personne ne pourra ouvrir son espace.`
        : null;

  return (
    <div className="border-t border-border pt-4" data-testid="guardian-links">
      <h3 className="font-medium text-foreground">
        {isGuardianView ? "Enfants" : "Responsables légaux"}
      </h3>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        {isGuardianView
          ? "Les musiciens pour lesquels ce responsable peut agir dans l'espace musicien."
          : "Les personnes qui peuvent agir à la place de ce musicien dans l'espace musicien (parents, tuteurs)."}
      </p>

      <div className="grid gap-3">
        <ErrorBanner message={loadError} />
        <ErrorBanner message={actionError} />

        {data === null && !loadError ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isGuardianView ? "Aucun enfant relié à ce compte." : "Aucun responsable légal."}
          </p>
        ) : (
          <ul className="rounded-lg border border-border divide-y divide-border">
            {entries.map((entry) => (
              <LinkRow
                key={entry.linkId}
                entry={entry}
                onRemove={setRemoving}
                showConsent={!isGuardianView}
                canRecordConsent={canManageAccounts}
                consentBusy={consentBusy}
                onRecordConsent={saveImageConsent}
              />
            ))}
          </ul>
        )}

        {!isGuardianView && entries.length > 0 && (
          <p className="text-xs text-muted-foreground" data-testid="image-consent-summary">
            Droit à l'image appliqué :{" "}
            <span className="font-medium text-foreground">
              {user.image_consent === 1
                ? "autorisé"
                : user.image_consent === 0
                  ? "refusé"
                  : "pas de réponse"}
            </span>
            . Un refus d'un responsable l'emporte ; sinon, un seul accord suffit.
          </p>
        )}

        {isManagedWithoutGuardian && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/50 dark:bg-amber-900/10">
            Ce musicien n'a pas de connexion et aucun responsable : personne ne peut ouvrir son
            espace. Ajoutez un responsable.
          </p>
        )}
        {showAdultWarning && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/50 dark:bg-amber-900/10">
            Ce musicien est majeur. Vérifiez si ses responsables doivent encore avoir accès à son
            espace.
          </p>
        )}

        {!isGuardianView && isInactive && (
          <p className="text-xs text-muted-foreground">
            Ce compte est inactif : réactivez-le pour modifier ses responsables.
          </p>
        )}

        {!isGuardianView && !isInactive && panel === null && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setPanel("link")}>
              <Link2 className="w-4 h-4 mr-1.5" />
              Lier un compte existant
            </Button>
            {canManageAccounts && (
              <Button type="button" variant="outline" size="sm" onClick={() => setPanel("create")}>
                <UserPlus className="w-4 h-4 mr-1.5" />
                Créer un responsable
              </Button>
            )}
            {canHandover && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPanel("handover")}
              >
                <ArrowRightLeft className="w-4 h-4 mr-1.5" />
                Transférer l'adresse à un parent
              </Button>
            )}
          </div>
        )}
        {!isGuardianView && !isInactive && !canManageAccounts && panel === null && (
          <p className="text-xs text-muted-foreground">
            Créer un responsable ou transférer une adresse est réservé aux super-administrateurs.
          </p>
        )}

        {panel === "link" && (
          <LinkExistingForm
            child={child}
            users={users}
            excludeIds={excludeIds}
            onLinked={afterChange}
            onCancel={() => setPanel(null)}
          />
        )}
        {panel === "create" && canManageAccounts && (
          <CreateGuardianForm
            child={child}
            users={users}
            onCreated={afterChange}
            onCancel={() => setPanel(null)}
          />
        )}
        {panel === "handover" && canHandover && user.email && (
          <HandoverForm
            child={{ ...child, email: user.email }}
            users={users}
            excludeIds={excludeIds}
            inEditForm={inEditForm}
            onDone={onAccountChanged}
            onCancel={() => setPanel(null)}
          />
        )}
      </div>

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{removeTitle}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>{removeDescription}</p>
                {removeWarning && <p className="font-medium">{removeWarning}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeBusy}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeBusy}
              onClick={(event) => {
                event.preventDefault();
                void confirmRemoval();
              }}
            >
              {removeBusy ? "Retrait..." : "Retirer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
