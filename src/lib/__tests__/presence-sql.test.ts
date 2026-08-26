// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
  PRESENCE_MEMBER_QUERY,
  summarisePresence,
  type PresenceRow,
} from "../presence";

describe("PRESENCE_MEMBER_QUERY", () => {
  it("selects only eligible members and preserves one row per harmonie instrument", () => {
    const database = new DatabaseSync(":memory:");
    database.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'ADMIN', 'MUSICIAN')),
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE musician_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        first_name TEXT,
        last_name TEXT,
        avatar TEXT,
        date_of_birth TEXT,
        phone TEXT,
        address_line1 TEXT,
        address_line2 TEXT,
        postal_code TEXT,
        city TEXT,
        harmonie_start_date TEXT,
        is_conservatory_student INTEGER NOT NULL DEFAULT 0,
        music_theory_level TEXT,
        emergency_contact_last_name TEXT,
        emergency_contact_first_name TEXT,
        emergency_contact_email TEXT,
        emergency_contact_phone TEXT,
        image_consent INTEGER,
        -- Ce nom littéral est volontaire : sans migration correspondante, changer
        -- ADHESION_SEASON_COLUMN doit faire échouer ce test avec « no such column ».
        adhesion_2026_2027 INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE harmonie_instruments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        instrument_name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE event_presences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK(status IN ('present', 'absent')),
        comment TEXT,
        status_changed_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(event_id, user_id)
      );
    `);

    const insertUser = database.prepare(
      "INSERT INTO users (id, email, role, is_active) VALUES (?, ?, ?, ?)"
    );
    const insertProfile = database.prepare(
      "INSERT INTO musician_profiles (user_id, first_name, last_name, adhesion_2026_2027) VALUES (?, ?, ?, ?)"
    );
    const insertInstrument = database.prepare(
      "INSERT INTO harmonie_instruments (user_id, instrument_name) VALUES (?, ?)"
    );
    const insertPresence = database.prepare(
      "INSERT INTO event_presences (event_id, user_id, status, status_changed_at) VALUES (?, ?, ?, ?)"
    );

    const fixtures = [
      [1, "un@exemple.fr", "MUSICIAN", 1, "Une", "Instrument", 1],
      [2, "deux@exemple.fr", "MUSICIAN", 1, "Deux", "Instruments", 1],
      [3, "trois@exemple.fr", "MUSICIAN", 1, "Sans", "Pupitre", 1],
      [4, "quatre@exemple.fr", "MUSICIAN", 1, "Non", "Adherent", 0],
      [5, "cinq@exemple.fr", "MUSICIAN", 0, "Inactif", "Adherent", 1],
      [6, "chef@exemple.fr", "ADMIN", 1, "Chef", "Orchestre", 1],
      [7, "admin@exemple.fr", "ADMIN", 1, "Admin", "Bureau", 1],
    ] as const;

    for (const [id, email, role, isActive, firstName, lastName, adhesion] of fixtures) {
      insertUser.run(id, email, role, isActive);
      insertProfile.run(id, firstName, lastName, adhesion);
    }
    insertInstrument.run(1, "Flûte traversière");
    insertInstrument.run(2, "Trombone");
    insertInstrument.run(2, "Trompette");
    insertInstrument.run(4, "Clarinette");
    insertInstrument.run(5, "Saxophone alto");
    insertInstrument.run(6, "Chef d'orchestre");
    insertPresence.run(42, 1, "present", "2026-09-01 10:00:00");
    insertPresence.run(42, 2, "absent", "2026-09-01 11:00:00");
    insertPresence.run(42, 6, "present", "2026-09-01 12:00:00");

    const rows: PresenceRow[] = database.prepare(PRESENCE_MEMBER_QUERY).all(42).map((result) => ({
      userId: result.userId as number,
      firstName: result.firstName as string | null,
      lastName: result.lastName as string | null,
      instrument: result.instrument as string | null,
      status: result.status as PresenceRow["status"],
      statusChangedAt: result.statusChangedAt as string | null,
    }));

    expect(rows.map((row) => row.userId).sort((a, b) => a - b)).toEqual([1, 2, 2, 3, 6]);
    expect(rows.filter((row) => row.userId === 2)).toHaveLength(2);
    expect(rows.find((row) => row.userId === 3)?.instrument).toBeNull();
    expect(rows.some((row) => row.userId === 4)).toBe(false);
    expect(rows.some((row) => row.userId === 5)).toBe(false);
    expect(rows.some((row) => row.userId === 6)).toBe(true);
    expect(rows.some((row) => row.userId === 7)).toBe(false);

    const summary = summarisePresence(rows, "2026-09-01");
    expect(summary.totalMembers).toBe(4);
    expect(summary.lateChanges).toHaveLength(0);

    insertPresence.run(42, 3, "present", "2026-09-02 10:00:00");
    const lateRows: PresenceRow[] = database
      .prepare(PRESENCE_MEMBER_QUERY)
      .all(42)
      .map((result) => ({
        userId: result.userId as number,
        firstName: result.firstName as string | null,
        lastName: result.lastName as string | null,
        instrument: result.instrument as string | null,
        status: result.status as PresenceRow["status"],
        statusChangedAt: result.statusChangedAt as string | null,
      }));
    const summaryWithLateChange = summarisePresence(lateRows, "2026-09-01");
    expect(summaryWithLateChange.lateChanges).toHaveLength(1);
    expect(summaryWithLateChange.lateChanges[0]?.userId).toBe(3);

    database.close();
  });
});
