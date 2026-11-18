// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationDirectory = join(process.cwd(), "migrations");

describe("migration 0017 — liens de responsables", () => {
  it("ajoute les colonnes sans perdre de lignes ni casser les clés étrangères", () => {
    const database = new DatabaseSync(":memory:");
    database.exec("PRAGMA foreign_keys = ON;");

    const migrations = readdirSync(migrationDirectory)
      .filter((file) => /^00(?:0[1-9]|1[0-6])_.*\.sql$/.test(file))
      .sort();
    expect(migrations).toHaveLength(16);
    for (const migration of migrations) {
      database.exec(readFileSync(join(migrationDirectory, migration), "utf8"));
    }

    const userResult = database
      .prepare("INSERT INTO users (email, role, is_active) VALUES (?, 'MUSICIAN', 1)")
      .run("musicien@example.fr");
    const userId = Number(userResult.lastInsertRowid);
    const eventResult = database
      .prepare("INSERT INTO events (title, date) VALUES (?, ?)")
      .run("Concert", "2099-01-01");
    const eventId = Number(eventResult.lastInsertRowid);
    database
      .prepare("INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)")
      .run("session-fixture", userId, "2099-01-01T00:00:00.000Z");
    database
      .prepare("INSERT INTO musician_profiles (user_id, first_name) VALUES (?, ?)")
      .run(userId, "Musicien");
    database
      .prepare("INSERT INTO musician_instruments (user_id, instrument_name) VALUES (?, ?)")
      .run(userId, "Flûte traversière");
    database
      .prepare("INSERT INTO harmonie_instruments (user_id, instrument_name) VALUES (?, ?)")
      .run(userId, "Flûte traversière");
    database
      .prepare("INSERT INTO event_presences (event_id, user_id, status) VALUES (?, ?, 'present')")
      .run(eventId, userId);
    const ideaResult = database
      .prepare(
        "INSERT INTO ideas (user_id, title, description, category, is_public) VALUES (?, ?, ?, ?, 1)"
      )
      .run(userId, "Idée", "Description", "association");
    database
      .prepare("INSERT INTO idea_likes (idea_id, user_id) VALUES (?, ?)")
      .run(Number(ideaResult.lastInsertRowid), userId);
    database
      .prepare(
        "INSERT INTO insurance_instruments (user_id, instrument_name, brand, model, serial_number) VALUES (?, ?, ?, ?, ?)"
      )
      .run(userId, "Flûte traversière", "Marque", "Modèle", "Série");

    const tables = [
      "users",
      "sessions",
      "musician_profiles",
      "musician_instruments",
      "harmonie_instruments",
      "event_presences",
      "ideas",
      "idea_likes",
      "insurance_instruments",
    ];
    const beforeCounts = Object.fromEntries(
      tables.map((table) => [
        table,
        database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()?.count,
      ])
    );

    database.exec(readFileSync(join(migrationDirectory, "0017_add_guardian_links.sql"), "utf8"));

    const afterCounts = Object.fromEntries(
      tables.map((table) => [
        table,
        database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()?.count,
      ])
    );
    const kinds = database.prepare("SELECT DISTINCT kind FROM users").all() as Array<{
      kind: string;
    }>;

    expect(afterCounts).toEqual(beforeCounts);
    expect(kinds).toEqual([{ kind: "member" }]);
    expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(database.prepare("SELECT COUNT(*) AS count FROM guardian_links").get()).toEqual({
      count: 0,
    });

    database.close();
  });
});
