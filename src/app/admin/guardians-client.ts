import type { UserKind } from "@/db/types";

/** Ligne renvoyée par `GET /api/admin/guardians?userId=` (un responsable ou un enfant). */
export interface GuardianLinkEntry {
  linkId: number;
  userId: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  kind: UserKind;
  relation: string | null;
  isActive: boolean;
  /** Réponse de ce responsable sur le droit à l'image de l'enfant (0 = refus, 1 = accord). */
  imageConsent?: 0 | 1 | null;
  /** Vrai si la réponse a été saisie par un admin (papier) et non par le responsable. */
  imageConsentRecordedByAdmin?: boolean;
}

export interface GuardianLinksData {
  guardians: GuardianLinkEntry[];
  children: GuardianLinkEntry[];
}

export interface GuardianApiResult<T> {
  ok: boolean;
  status: number;
  data: T & { error?: string };
}

const GENERIC_ERROR = "Une erreur est survenue. Réessayez dans un instant.";

async function request<T>(
  url: string,
  init?: Parameters<typeof fetch>[1]
): Promise<GuardianApiResult<T>> {
  try {
    const response = await fetch(url, init);
    let data: unknown = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    return {
      ok: response.ok,
      status: response.status,
      data: data as T & { error?: string },
    };
  } catch {
    return { ok: false, status: 0, data: { error: GENERIC_ERROR } as T & { error?: string } };
  }
}

function postJson<T>(action: string | null, body: unknown) {
  return request<T>(`/api/admin/guardians${action ? `?action=${action}` : ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function errorMessage(result: GuardianApiResult<unknown>): string {
  return result.data.error || GENERIC_ERROR;
}

export function fetchGuardianLinks(userId: number) {
  return request<Partial<GuardianLinksData>>(`/api/admin/guardians?userId=${userId}`);
}

export function linkGuardian(input: {
  childUserId: number;
  guardianUserId: number;
  relation: string;
}) {
  return postJson<{ success?: boolean }>(null, input);
}

export function createGuardianAccount(input: {
  childUserId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  relation: string;
}) {
  return postJson<{ success?: boolean; guardianUserId?: number; existingUserId?: number }>(
    "create-guardian",
    input
  );
}

export function handoverEmail(input: {
  childUserId: number;
  firstName?: string;
  lastName?: string;
  relation: string;
  guardianUserId?: number;
}) {
  return postJson<{ success?: boolean; guardianUserId?: number; previousEmail?: string }>(
    "handover",
    input
  );
}

export function giveAccess(input: { childUserId: number; email: string }) {
  return postJson<{ success?: boolean; userId?: number }>("give-access", input);
}

/** Saisie papier de la réponse d'un responsable ; `null` efface sa réponse. SUPER_ADMIN. */
export function recordImageConsent(input: {
  childUserId: number;
  guardianUserId: number;
  consent: 0 | 1 | null;
}) {
  return postJson<{ success?: boolean }>("image-consent", input);
}

/** Valeur effective du droit à l'image d'un compte, relue après une saisie. */
export function fetchEffectiveImageConsent(userId: number) {
  return request<{ image_consent?: number | null; image_consent_managed?: boolean }>(
    `/api/admin/users?id=${userId}`
  );
}

export function removeGuardianLink(linkId: number) {
  return request<{ success?: boolean }>(`/api/admin/guardians?id=${linkId}`, {
    method: "DELETE",
  });
}

export function entryName(entry: Pick<GuardianLinkEntry, "firstName" | "lastName">): string {
  return `${entry.firstName ?? ""} ${entry.lastName ?? ""}`.trim() || "Sans nom";
}

export function joinNames(entries: GuardianLinkEntry[]): string | null {
  const names = entries.map(entryName);
  return names.length > 0 ? names.join(", ") : null;
}

/**
 * Saisie papier d'une autorisation parentale (responsable facultatif, mais relié s'il est donné)
 * ou retrait (`authorize: false`). ADMIN.
 */
export function postAuthorization(input: {
  eventId: number;
  childUserId: number;
  authorize: boolean;
  guardianUserId?: number;
}) {
  return request<{ success?: boolean }>("/api/admin/authorizations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
