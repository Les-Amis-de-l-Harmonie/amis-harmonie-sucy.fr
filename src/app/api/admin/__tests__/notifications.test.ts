// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { handleAdminNotificationsApi } from "../notifications";
import { createD1Database } from "@/app/api/__tests__/d1-adapter";

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const originalDb = env.DB;
const originalApiKey = env.RESEND_API_KEY;
let database: DatabaseSync;
let ids: { admin: number; superAdmin: number };
let fetchMock: ReturnType<typeof vi.fn>;

function addUser(email: string, role: string, kind = "member"): number {
  const result = database
    .prepare("INSERT INTO users (email, role, kind, is_active) VALUES (?, ?, ?, 1)")
    .run(email, role, kind);
  const id = Number(result.lastInsertRowid);
  database
    .prepare("INSERT INTO musician_profiles (user_id, first_name, last_name) VALUES (?, ?, ?)")
    .run(id, `Prénom${id}`, `Nom${id}`);
  return id;
}

function request(
  path = "",
  method = "GET",
  body?: unknown,
  session: "admin" | "super" | null = "admin"
): Request {
  const headers = new Headers();
  if (session === "admin") headers.set("Cookie", "admin_session=admin-session");
  if (session === "super") headers.set("Cookie", "admin_session=super-session");
  if (body !== undefined) headers.set("Content-Type", "application/json");
  return new Request(`https://test.local/api/admin/notifications${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  const migrations = readdirSync("migrations")
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  for (const migration of migrations) database.exec(readFileSync(`migrations/${migration}`, "utf8"));
  Object.assign(env, { DB: createD1Database(database), RESEND_API_KEY: "test-resend-key" });

  const superAdmin = addUser("super@example.test", "SUPER_ADMIN");
  const admin = addUser("admin@example.test", "ADMIN");
  ids = { admin, superAdmin };
  for (const [sessionId, userId] of [
    ["super-session", superAdmin],
    ["admin-session", admin],
  ] as const) {
    database.prepare("INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)").run(
      sessionId,
      userId,
      "2099-01-01T00:00:00.000Z"
    );
  }
  fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ id: "resend-id" }), { status: 200 })
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  database.close();
  Object.assign(env, { DB: originalDb, RESEND_API_KEY: originalApiKey });
  vi.unstubAllGlobals();
});

describe("API de réglage des e-mails automatiques", () => {
  it("renvoie les valeurs par défaut et l'aperçu ne modifie rien et n'envoie aucun e-mail", async () => {
    const get = await handleAdminNotificationsApi(request());
    expect(get.status).toBe(200);
    expect(await get.json()).toMatchObject({
      settings: { presenceRemindersMode: "off", testRecipient: null, lastRunAt: null },
      canEdit: false,
      log: [],
    });

    const preview = await handleAdminNotificationsApi(request("?action=preview"));
    const body = (await preview.json()) as { today: string; items: unknown[]; capped: boolean };
    expect(preview.status).toBe(200);
    expect(body).toMatchObject({ items: [], capped: false });
    expect(body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(database.prepare("SELECT last_run_at, last_run_summary FROM notification_settings").get()).toEqual({
      last_run_at: null,
      last_run_summary: null,
    });
    expect(database.prepare("SELECT count(*) AS count FROM notification_log").get()).toEqual({
      count: 0,
    });
  });

  it("réserve PUT au SUPER_ADMIN et valide mode et adresse d'essai", async () => {
    const denied = await handleAdminNotificationsApi(
      request("", "PUT", { presenceRemindersMode: "on", testRecipient: null }, "admin")
    );
    expect(denied.status).toBe(403);

    const invalidMode = await handleAdminNotificationsApi(
      request("", "PUT", { presenceRemindersMode: "enabled", testRecipient: null }, "super")
    );
    expect(invalidMode.status).toBe(400);

    for (const testRecipient of [null, "not-an-email", "sans-email+test@interne.amis-harmonie-sucy.fr"]) {
      const invalidTest = await handleAdminNotificationsApi(
        request("", "PUT", { presenceRemindersMode: "test", testRecipient }, "super")
      );
      expect(invalidTest.status).toBe(400);
    }

    const saved = await handleAdminNotificationsApi(
      request(
        "",
        "PUT",
        { presenceRemindersMode: "test", testRecipient: "  president@example.test " },
        "super"
      )
    );
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({
      success: true,
      settings: { presenceRemindersMode: "test", testRecipient: "president@example.test" },
    });
    expect(
      database.prepare("SELECT updated_by FROM notification_settings WHERE id = 1").get()
    ).toEqual({ updated_by: ids.superAdmin });
  });

  it("refuse l'envoi manuel hors mode Essai puis envoie un seul récapitulatif au destinataire d'essai", async () => {
    const notTest = await handleAdminNotificationsApi(
      request("?action=send-test", "POST", undefined, "super")
    );
    expect(notTest.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();

    database
      .prepare(
        "UPDATE notification_settings SET presence_reminders_mode = 'test', test_recipient = 'president@example.test' WHERE id = 1"
      )
      .run();
    const sent = await handleAdminNotificationsApi(
      request("?action=send-test", "POST", undefined, "super")
    );
    expect(sent.status).toBe(200);
    expect(await sent.json()).toEqual({
      success: true,
      sentTo: "president@example.test",
      itemCount: 0,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      to: string;
      text: string;
    };
    expect(payload.to).toBe("president@example.test");
    expect(payload.text).toContain("Aucun rappel n'aurait été envoyé");
    expect(database.prepare("SELECT count(*) AS count FROM notification_log").get()).toEqual({
      count: 0,
    });
  });
});
