// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { createD1Database } from "@/app/api/__tests__/d1-adapter";
import { runScheduledTick } from "../scheduled";
import type { NotificationD1Database } from "../store";

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const originalDb = env.DB;
const originalApiKey = env.RESEND_API_KEY;
const now = new Date("2099-06-05T08:00:00.000Z");
let database: DatabaseSync;
let fetchMock: ReturnType<typeof vi.fn>;

function createDatabase(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const migrations = readdirSync("migrations")
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  for (const migration of migrations) db.exec(readFileSync(`migrations/${migration}`, "utf8"));

  const user = db
    .prepare("INSERT INTO users (email, role, kind, is_active) VALUES ('direct@example.test', 'MUSICIAN', 'member', 1)")
    .run();
  db.prepare("INSERT INTO musician_profiles (user_id, first_name, last_name) VALUES (?, 'Sam', 'Musicien')")
    .run(Number(user.lastInsertRowid));
  db.prepare(
    `INSERT INTO events (title, date, response_deadline, presence_required)
     VALUES ('Concert', '2099-06-10', '2099-06-10', 1)`
  ).run();
  return db;
}

function settingRow() {
  return database.prepare("SELECT * FROM notification_settings WHERE id = 1").get() as {
    presence_reminders_mode: string;
    test_recipient: string | null;
    last_run_at: string | null;
    last_run_summary: string | null;
    updated_at: string;
    updated_by: number | null;
  };
}

beforeEach(() => {
  database = createDatabase();
  Object.assign(env, { DB: createD1Database(database), RESEND_API_KEY: "test-resend-key" });
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

describe("runScheduledTick — garde serveur des rappels", () => {
  it("mode off par défaut : pas de fetch, uniquement last_run_* change", async () => {
    database
      .prepare(
        `UPDATE notification_settings
         SET presence_reminders_mode = 'off', test_recipient = 'conserve@example.test',
             updated_at = '2000-01-01 00:00:00', updated_by = 77
         WHERE id = 1`
      )
      .run();

    await runScheduledTick(createD1Database(database), now);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(settingRow()).toMatchObject({
      presence_reminders_mode: "off",
      test_recipient: "conserve@example.test",
      last_run_at: now.toISOString(),
      last_run_summary: "Désactivé : aucun e-mail envoyé.",
      updated_at: "2000-01-01 00:00:00",
      updated_by: 77,
    });
    expect(database.prepare("SELECT count(*) AS count FROM notification_log").get()).toEqual({
      count: 0,
    });
  });

  it("ligne absente : retombe à off, crée le résumé d'exécution et n'appelle jamais Resend", async () => {
    database.prepare("DELETE FROM notification_settings WHERE id = 1").run();

    await runScheduledTick(createD1Database(database), now);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(settingRow()).toMatchObject({
      presence_reminders_mode: "off",
      test_recipient: null,
      last_run_at: now.toISOString(),
      last_run_summary: "Désactivé : aucun e-mail envoyé.",
      updated_by: null,
    });
    expect(database.prepare("SELECT count(*) AS count FROM notification_log").get()).toEqual({
      count: 0,
    });
  });

  it("une valeur de mode inconnue est off sans écraser la configuration", async () => {
    database
      .prepare(
        `UPDATE notification_settings
         SET presence_reminders_mode = 'enabled', test_recipient = 'conserve@example.test',
             updated_at = '2000-01-01 00:00:00', updated_by = 55
         WHERE id = 1`
      )
      .run();

    await runScheduledTick(createD1Database(database), now);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(settingRow()).toMatchObject({
      presence_reminders_mode: "enabled",
      test_recipient: "conserve@example.test",
      last_run_at: now.toISOString(),
      last_run_summary: "Désactivé : aucun e-mail envoyé.",
      updated_at: "2000-01-01 00:00:00",
      updated_by: 55,
    });
    expect(database.prepare("SELECT count(*) AS count FROM notification_log").get()).toEqual({
      count: 0,
    });
  });

  it("une erreur de lecture des réglages est fail-closed et n'envoie rien", async () => {
    database
      .prepare(
        `UPDATE notification_settings
         SET presence_reminders_mode = 'on', test_recipient = 'conserve@example.test',
             updated_at = '2000-01-01 00:00:00', updated_by = 88
         WHERE id = 1`
      )
      .run();
    const base = createD1Database(database);
    const brokenReadDb: NotificationD1Database = {
      prepare(sql) {
        if (sql === "SELECT * FROM notification_settings WHERE id = 1") {
          throw new Error("lecture simulée en panne");
        }
        return base.prepare(sql);
      },
    };

    await runScheduledTick(brokenReadDb, now);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(settingRow()).toMatchObject({
      presence_reminders_mode: "on",
      test_recipient: "conserve@example.test",
      last_run_at: now.toISOString(),
      last_run_summary: "Désactivé : aucun e-mail envoyé.",
      updated_at: "2000-01-01 00:00:00",
      updated_by: 88,
    });
    expect(database.prepare("SELECT count(*) AS count FROM notification_log").get()).toEqual({
      count: 0,
    });
  });
});
