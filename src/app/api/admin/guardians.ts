import { env } from "cloudflare:workers";
import { verifySession } from "@/app/api/auth";
import { isAdmin, isReservedEmail, isSuperAdmin, MANAGED_EMAIL_DOMAIN } from "@/db/types";
import { invalidateCache } from "@/lib/cache";
import { logger } from "@/lib/logger";

interface AccountRow {
  id: number;
  email: string;
  role: string;
  kind: string;
  is_active: number;
}

interface LinkRow {
  linkId: number;
  userId: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  kind: string;
  relation: string | null;
  isActive: number;
  imageConsent: number | null;
  imageConsentRecordedBy: number | null;
}

interface AllGuardianLinksRow {
  linkId: number;
  guardianUserId: number;
  childUserId: number;
  relation: string | null;
  createdAt: string;
}

interface LinkInput {
  childUserId?: unknown;
  guardianUserId?: unknown;
  relation?: unknown;
}

interface CreateGuardianInput extends LinkInput {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
}

interface HandoverInput extends LinkInput {
  firstName?: unknown;
  lastName?: unknown;
  guardianUserId?: unknown;
}

interface GiveAccessInput {
  childUserId?: unknown;
  email?: unknown;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseId(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseRelation(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const relation = value.trim();
  if (relation.length > 50) return undefined;
  return relation || null;
}

function parseName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length > 0 ? name : null;
}

async function getAccount(id: number): Promise<AccountRow | null> {
  return env.DB.prepare("SELECT id, email, role, kind, is_active FROM users WHERE id = ?")
    .bind(id)
    .first<AccountRow>();
}

async function validateChild(id: number): Promise<Response | null> {
  const child = await getAccount(id);
  if (!child) return json({ error: "Le compte du musicien est introuvable." }, 404);
  if (child.role !== "MUSICIAN" || child.kind === "guardian") {
    return json({ error: "Ce compte ne peut pas être rattaché comme enfant." }, 400);
  }
  if (child.is_active !== 1) {
    return json({ error: "Le compte du musicien est inactif." }, 409);
  }
  return null;
}

async function validateLink(childId: number, guardianId: number): Promise<Response | null> {
  if (childId === guardianId) {
    return json({ error: "Un compte ne peut pas être lié à lui-même." }, 400);
  }

  const childError = await validateChild(childId);
  if (childError) return childError;

  const guardian = await getAccount(guardianId);
  if (!guardian) return json({ error: "Le compte du responsable est introuvable." }, 404);
  if (guardian.role !== "MUSICIAN" || guardian.kind === "managed") {
    return json({ error: "Ce compte ne peut pas être lié comme responsable." }, 400);
  }
  if (guardian.is_active !== 1) {
    return json({ error: "Le compte du responsable est inactif." }, 409);
  }

  const duplicate = await env.DB.prepare(
    "SELECT id FROM guardian_links WHERE guardian_user_id = ? AND child_user_id = ?"
  )
    .bind(guardianId, childId)
    .first<{ id: number }>();
  if (duplicate) return json({ error: "Ce responsable est déjà lié à ce musicien." }, 409);

  const reverse = await env.DB.prepare(
    "SELECT id FROM guardian_links WHERE guardian_user_id = ? AND child_user_id = ?"
  )
    .bind(childId, guardianId)
    .first<{ id: number }>();
  if (reverse) return json({ error: "Un lien existe déjà dans le sens inverse." }, 409);

  return null;
}

function readLinkInput(
  data: LinkInput
): { childId: number; guardianId: number; relation: string | null } | Response {
  const childId = parseId(data.childUserId);
  const guardianId = parseId(data.guardianUserId);
  const relation = parseRelation(data.relation);
  if (childId === null || guardianId === null) {
    return json(
      {
        error: "Les identifiants du musicien et du responsable doivent être des entiers positifs.",
      },
      400
    );
  }
  if (relation === undefined) {
    return json({ error: "Le lien de parenté doit contenir au maximum 50 caractères." }, 400);
  }
  return { childId, guardianId, relation };
}

async function getGuardians(userId: number): Promise<Response> {
  const user = await getAccount(userId);
  if (!user) return json({ error: "Ce compte est introuvable." }, 404);

  const guardians = await env.DB.prepare(
    `SELECT gl.id AS linkId, u.id AS userId, p.first_name AS firstName, p.last_name AS lastName,
            CASE WHEN u.kind = 'managed' THEN NULL ELSE u.email END AS email,
            u.kind, gl.relation, u.is_active AS isActive,
            gic.consent AS imageConsent, gic.recorded_by AS imageConsentRecordedBy
     FROM guardian_links gl
     JOIN users u ON u.id = gl.guardian_user_id
     LEFT JOIN musician_profiles p ON p.user_id = u.id
     LEFT JOIN guardian_image_consents gic
       ON gic.child_user_id = gl.child_user_id AND gic.guardian_user_id = gl.guardian_user_id
     WHERE gl.child_user_id = ?
     ORDER BY p.first_name, p.last_name, u.id`
  )
    .bind(userId)
    .all<LinkRow>();

  const children = await env.DB.prepare(
    `SELECT gl.id AS linkId, u.id AS userId, p.first_name AS firstName, p.last_name AS lastName,
            CASE WHEN u.kind = 'managed' THEN NULL ELSE u.email END AS email,
            u.kind, gl.relation, u.is_active AS isActive
     FROM guardian_links gl
     JOIN users u ON u.id = gl.child_user_id
     LEFT JOIN musician_profiles p ON p.user_id = u.id
     WHERE gl.guardian_user_id = ?
     ORDER BY p.first_name, p.last_name, u.id`
  )
    .bind(userId)
    .all<LinkRow>();

  return json({
    guardians: (guardians.results ?? []).map((link) => ({
      ...link,
      isActive: link.isActive === 1,
      imageConsent: link.imageConsent === 0 || link.imageConsent === 1 ? link.imageConsent : null,
      imageConsentRecordedByAdmin: link.imageConsentRecordedBy !== null,
    })),
    children: (children.results ?? []).map((link) => ({
      ...link,
      isActive: link.isActive === 1,
    })),
  });
}

async function setImageConsent(
  data: Record<string, unknown>,
  adminId: number
): Promise<Response> {
  const childUserId = parseId(data.childUserId);
  const guardianUserId = parseId(data.guardianUserId);
  const consent = data.consent;
  if (childUserId === null || guardianUserId === null) {
    return json({ error: "Les identifiants du musicien et du responsable sont invalides." }, 400);
  }
  if (consent !== null && consent !== 0 && consent !== 1) {
    return json({ error: "La réponse au droit à l'image doit être 0, 1 ou null." }, 400);
  }

  const link = await env.DB.prepare(
    "SELECT id FROM guardian_links WHERE child_user_id = ? AND guardian_user_id = ?"
  )
    .bind(childUserId, guardianUserId)
    .first<{ id: number }>();
  if (!link) return json({ error: "Ce responsable n'est pas lié à ce musicien." }, 409);

  if (consent === null) {
    await env.DB.prepare(
      "DELETE FROM guardian_image_consents WHERE child_user_id = ? AND guardian_user_id = ?"
    )
      .bind(childUserId, guardianUserId)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO guardian_image_consents (child_user_id, guardian_user_id, consent, recorded_by)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(child_user_id, guardian_user_id) DO UPDATE SET
         consent = excluded.consent, recorded_by = excluded.recorded_by, updated_at = datetime('now')`
    )
      .bind(childUserId, guardianUserId, consent, adminId)
      .run();
  }
  return json({ success: true });
}

async function getAllGuardianLinks(): Promise<Response> {
  const links = await env.DB.prepare(
    `SELECT id AS linkId, guardian_user_id AS guardianUserId, child_user_id AS childUserId,
            relation, created_at AS createdAt
     FROM guardian_links
     ORDER BY guardian_user_id, child_user_id, id`
  ).all<AllGuardianLinksRow>();
  return json({ links: links.results ?? [] });
}

async function createGuardian(data: CreateGuardianInput, actorId: number): Promise<Response> {
  const childId = parseId(data.childUserId);
  const relation = parseRelation(data.relation);
  const firstName = parseName(data.firstName);
  const lastName = parseName(data.lastName);
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const phone = typeof data.phone === "string" ? data.phone.trim() || null : null;
  if (childId === null)
    return json({ error: "L'identifiant du musicien doit être un entier positif." }, 400);
  if (!firstName || !lastName || !email) {
    return json(
      { error: "Le prénom, le nom et l'adresse e-mail du responsable sont obligatoires." },
      400
    );
  }
  if (relation === undefined) {
    return json({ error: "Le lien de parenté doit contenir au maximum 50 caractères." }, 400);
  }
  if (isReservedEmail(email)) {
    return json({ error: "Cette adresse e-mail est réservée aux comptes gérés." }, 400);
  }
  const childError = await validateChild(childId);
  if (childError) return childError;

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: number }>();
  if (existing) {
    return json(
      {
        error: "Cette adresse est déjà utilisée. Vous pouvez lier le compte existant.",
        existingUserId: existing.id,
      },
      409
    );
  }

  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO users (email, role, kind, is_active) VALUES (?, 'MUSICIAN', 'guardian', 1)"
    ).bind(email),
    env.DB.prepare(
      "INSERT INTO musician_profiles (user_id, first_name, last_name, phone) VALUES ((SELECT last_insert_rowid()), ?, ?, ?)"
    ).bind(firstName, lastName, phone),
    env.DB.prepare(
      "INSERT INTO guardian_links (guardian_user_id, child_user_id, relation, created_by) VALUES ((SELECT id FROM users WHERE email = ?), ?, ?, ?)"
    ).bind(email, childId, relation, actorId),
  ]);
  const created = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: number }>();
  await invalidateCache();
  if (!created) return json({ error: "Le compte responsable créé est introuvable." }, 500);
  return json({ success: true, guardianUserId: created.id });
}

async function handover(data: HandoverInput, actorId: number): Promise<Response> {
  const childId = parseId(data.childUserId);
  const relation = parseRelation(data.relation);
  const firstName = parseName(data.firstName);
  const lastName = parseName(data.lastName);
  const guardianId = data.guardianUserId === undefined ? null : parseId(data.guardianUserId);
  if (childId === null)
    return json({ error: "L'identifiant du musicien doit être un entier positif." }, 400);
  if (data.guardianUserId !== undefined && guardianId === null) {
    return json({ error: "L'identifiant du responsable doit être un entier positif." }, 400);
  }
  if (relation === undefined) {
    return json({ error: "Le lien de parenté doit contenir au maximum 50 caractères." }, 400);
  }
  if (guardianId === null && (!firstName || !lastName)) {
    return json({ error: "Le prénom et le nom du nouveau responsable sont obligatoires." }, 400);
  }

  const child = await getAccount(childId);
  if (!child) return json({ error: "Le compte du musicien est introuvable." }, 404);
  if (child.role !== "MUSICIAN" || child.kind !== "member" || isReservedEmail(child.email)) {
    return json(
      { error: "Seul un compte musicien actif avec une adresse personnelle peut être transféré." },
      409
    );
  }
  if (child.is_active !== 1) return json({ error: "Le compte du musicien est inactif." }, 409);

  if (guardianId !== null) {
    const linkError = await validateLink(childId, guardianId);
    if (linkError) return linkError;
  }

  const oldEmail = child.email;
  const managedEmail = `sans-email+${crypto.randomUUID()}@${MANAGED_EMAIL_DOMAIN}`;
  const statements = [
    env.DB.prepare(
      "UPDATE users SET email = ?, kind = 'managed' WHERE id = ? AND email = ? AND kind = 'member' AND role = 'MUSICIAN' AND is_active = 1"
    ).bind(managedEmail, childId, oldEmail),
  ];

  if (guardianId === null) {
    // Les jetons d'authentification encore valides pour l'ancienne adresse ouvriront le compte responsable : c'est voulu.
    statements.push(
      env.DB.prepare(
        "INSERT INTO users (email, role, kind, is_active) SELECT ?, 'MUSICIAN', 'guardian', 1 WHERE EXISTS (SELECT 1 FROM users WHERE id = ? AND email = ? AND kind = 'managed')"
      ).bind(oldEmail, childId, managedEmail),
      env.DB.prepare(
        "INSERT INTO musician_profiles (user_id, first_name, last_name) SELECT id, ?, ? FROM users WHERE email = ? AND kind = 'guardian'"
      ).bind(firstName, lastName, oldEmail),
      env.DB.prepare(
        "INSERT INTO guardian_links (guardian_user_id, child_user_id, relation, created_by) SELECT id, ?, ?, ? FROM users WHERE email = ? AND kind = 'guardian'"
      ).bind(childId, relation, actorId, oldEmail)
    );
  } else {
    statements.push(
      env.DB.prepare(
        "INSERT INTO guardian_links (guardian_user_id, child_user_id, relation, created_by) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM users WHERE id = ? AND email = ? AND kind = 'managed')"
      ).bind(guardianId, childId, relation, actorId, childId, managedEmail)
    );
  }

  statements.push(
    env.DB.prepare(
      "DELETE FROM sessions WHERE user_id = ? AND EXISTS (SELECT 1 FROM users WHERE id = ? AND email = ? AND kind = 'managed')"
    ).bind(childId, childId, managedEmail)
  );
  await env.DB.batch(statements);

  const transferred = await env.DB.prepare(
    "SELECT id FROM users WHERE id = ? AND email = ? AND kind = 'managed'"
  )
    .bind(childId, managedEmail)
    .first<{ id: number }>();
  if (!transferred)
    return json({ error: "Le compte a changé pendant le transfert. Veuillez réessayer." }, 409);

  let finalGuardianId = guardianId;
  if (finalGuardianId === null) {
    const created = await env.DB.prepare(
      "SELECT id FROM users WHERE email = ? AND kind = 'guardian'"
    )
      .bind(oldEmail)
      .first<{ id: number }>();
    finalGuardianId = created?.id ?? null;
  }
  if (finalGuardianId === null) {
    return json({ error: "Le compte responsable n'a pas pu être créé." }, 500);
  }
  await invalidateCache();
  if (guardianId !== null) {
    return json({ success: true, guardianUserId: finalGuardianId, previousEmail: oldEmail });
  }
  return json({ success: true, guardianUserId: finalGuardianId });
}

async function giveAccess(data: GiveAccessInput): Promise<Response> {
  const childId = parseId(data.childUserId);
  const requestedEmail = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (childId === null)
    return json({ error: "L'identifiant du musicien doit être un entier positif." }, 400);
  if (!requestedEmail) return json({ error: "Une adresse e-mail valide est obligatoire." }, 400);
  if (isReservedEmail(requestedEmail)) {
    return json({ error: "Cette adresse e-mail est réservée aux comptes gérés." }, 400);
  }
  const child = await getAccount(childId);
  if (!child) return json({ error: "Le compte du musicien est introuvable." }, 404);
  if (child.role !== "MUSICIAN" || child.kind !== "managed") {
    return json({ error: "Ce compte n'est pas un compte géré." }, 409);
  }
  if (child.is_active !== 1) return json({ error: "Le compte du musicien est inactif." }, 409);

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(requestedEmail)
    .first<{ id: number }>();
  if (existing) return json({ error: "Cette adresse e-mail est déjà utilisée." }, 409);

  const result = await env.DB.prepare(
    "UPDATE users SET email = ?, kind = 'member' WHERE id = ? AND kind = 'managed' AND role = 'MUSICIAN' AND is_active = 1"
  )
    .bind(requestedEmail, childId)
    .run();
  if (result.meta.changes === 0) {
    return json({ error: "Le compte a changé pendant la modification. Veuillez réessayer." }, 409);
  }
  await invalidateCache();
  return json({ success: true, userId: childId });
}

export async function handleGuardiansApi(request: Request): Promise<Response> {
  try {
    const actor = await verifySession(request, "admin");
    if (!actor || !isAdmin(actor.role)) return json({ error: "Non autorisé." }, 401);

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (request.method === "GET") {
      const userIdParam = url.searchParams.get("userId");
      if (userIdParam === null) return await getAllGuardianLinks();
      const userId = parseId(userIdParam);
      if (userId === null)
        return json({ error: "L'identifiant du compte doit être un entier positif." }, 400);
      return await getGuardians(userId);
    }

    if (request.method === "POST") {
      const elevatedAction =
        action === "create-guardian" ||
        action === "handover" ||
        action === "give-access" ||
        action === "image-consent";
      if (elevatedAction && !isSuperAdmin(actor.role)) {
        return json({ error: "Cette action est réservée aux super-administrateurs." }, 403);
      }
      let data: unknown;
      try {
        data = await request.json();
      } catch {
        return json({ error: "Le corps de la requête est invalide." }, 400);
      }
      if (data === null || typeof data !== "object" || Array.isArray(data)) {
        return json({ error: "Le corps de la requête doit être un objet JSON." }, 400);
      }
      const input = data as Record<string, unknown>;
      if (action === "image-consent") return await setImageConsent(input, actor.id);
      if (action === "create-guardian") return await createGuardian(input, actor.id);
      if (action === "handover") return await handover(input, actor.id);
      if (action === "give-access") return await giveAccess(input);
      if (action !== null) return json({ error: "Action inconnue." }, 400);

      const linkInput = readLinkInput(input);
      if (linkInput instanceof Response) return linkInput;
      const linkError = await validateLink(linkInput.childId, linkInput.guardianId);
      if (linkError) return linkError;
      await env.DB.prepare(
        "INSERT INTO guardian_links (guardian_user_id, child_user_id, relation, created_by) VALUES (?, ?, ?, ?)"
      )
        .bind(linkInput.guardianId, linkInput.childId, linkInput.relation, actor.id)
        .run();
      await invalidateCache();
      return json({ success: true });
    }

    if (request.method === "DELETE") {
      const linkId = parseId(url.searchParams.get("id"));
      if (linkId === null)
        return json({ error: "L'identifiant du lien doit être un entier positif." }, 400);
      const result = await env.DB.prepare("DELETE FROM guardian_links WHERE id = ?")
        .bind(linkId)
        .run();
      if (result.meta.changes === 0) return json({ error: "Ce lien est introuvable." }, 404);
      await invalidateCache();
      return json({ success: true });
    }

    return json({ error: "Méthode non autorisée." }, 405);
  } catch (error) {
    logger.error("Guardians API error:", error);
    return json({ error: "Une erreur interne est survenue." }, 500);
  }
}
