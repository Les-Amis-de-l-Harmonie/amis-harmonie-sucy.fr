// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { PRESENCE_MEMBER_QUERY, summarisePresence, type PresenceRow } from "../presence";

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
        -- La colonne existe toujours en base, mais l'effectif de référence ne la
        -- consulte plus : elle est conservée ici pour que le schéma de test reste
        -- fidèle à celui de src/db/schema.sql.
        adhesion_2026_2027 INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE harmonie_instruments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        instrument_name TEXT NOT NULL,
        is_primary INTEGER NOT NULL DEFAULT 0,
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
      // Non à jour de sa cotisation : compte quand même dans l'effectif.
      [4, "quatre@exemple.fr", "MUSICIAN", 1, "Non", "Adherent", 0],
      // Compte désactivé : ne compte pas, quelle que soit son adhésion.
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
    insertInstrument.run(6, "Chef adjoint");
    database
      .prepare(
        "UPDATE harmonie_instruments SET is_primary = 1 WHERE user_id = 2 AND instrument_name = ?"
      )
      .run("Trompette");
    database.prepare("UPDATE harmonie_instruments SET is_primary = 1 WHERE user_id = 6").run();
    insertPresence.run(42, 1, "present", "2026-09-01 10:00:00");
    insertPresence.run(42, 2, "absent", "2026-09-01 11:00:00");
    insertPresence.run(42, 6, "present", "2026-09-01 12:00:00");

    const rows: PresenceRow[] = database
      .prepare(PRESENCE_MEMBER_QUERY)
      .all(42)
      .map((result) => ({
        userId: result.userId as number,
        firstName: result.firstName as string | null,
        lastName: result.lastName as string | null,
        instrument: result.instrument as string | null,
        isPrimary: result.isPrimary as number | null,
        status: result.status as PresenceRow["status"],
        statusChangedAt: result.statusChangedAt as string | null,
      }));

    expect(rows.map((row) => row.userId).sort((a, b) => a - b)).toEqual([1, 2, 2, 3, 4, 6, 6]);
    expect(rows.filter((row) => row.userId === 2)).toHaveLength(2);
    expect(
      summarisePresence(rows).members.find((member) => member.userId === 2)?.primaryInstrument
    ).toBe("Trompette");
    expect(
      summarisePresence(rows).members.find((member) => member.userId === 1)?.primaryInstrument
    ).toBe("Flûte traversière");
    expect(
      summarisePresence(rows).members.find((member) => member.userId === 6)?.primaryInstrument
    ).toBe("Chef d'orchestre");
    expect(rows.find((row) => row.userId === 3)?.instrument).toBeNull();
    // Non à jour de sa cotisation : PRÉSENT dans l'effectif. L'adhésion est remise à
    // zéro à chaque saison ; la filtrer viderait le dénominateur pendant des mois.
    expect(rows.some((row) => row.userId === 4)).toBe(true);
    // Compte désactivé : absent de l'effectif.
    expect(rows.some((row) => row.userId === 5)).toBe(false);
    // Chef d'orchestre : ADMIN mais joue, donc compté.
    expect(rows.some((row) => row.userId === 6)).toBe(true);
    // Administrateur sans instrument : hors effectif.
    expect(rows.some((row) => row.userId === 7)).toBe(false);

    expect(summarisePresence(rows).totalMembers).toBe(5);

    database.close();
  });

  it("choisit le principal marqué avec le même résultat quel que soit l'ordre", () => {
    const rows: PresenceRow[] = [
      {
        userId: 1,
        firstName: "A",
        lastName: "Un",
        instrument: "Trompette",
        isPrimary: 1,
        status: null,
        statusChangedAt: null,
      },
      {
        userId: 1,
        firstName: "A",
        lastName: "Un",
        instrument: "Clarinette",
        isPrimary: 0,
        status: null,
        statusChangedAt: null,
      },
      {
        userId: 2,
        firstName: "B",
        lastName: "Deux",
        instrument: "Trompette",
        isPrimary: 0,
        status: null,
        statusChangedAt: null,
      },
      {
        userId: 2,
        firstName: "B",
        lastName: "Deux",
        instrument: "Clarinette",
        isPrimary: 0,
        status: null,
        statusChangedAt: null,
      },
      {
        userId: 3,
        firstName: "C",
        lastName: "Trois",
        instrument: "Trompette",
        isPrimary: 1,
        status: null,
        statusChangedAt: null,
      },
      {
        userId: 3,
        firstName: "C",
        lastName: "Trois",
        instrument: "Clarinette",
        isPrimary: 1,
        status: null,
        statusChangedAt: null,
      },
    ];
    const summary = summarisePresence(rows);

    expect(summary.members.map((member) => member.primaryInstrument)).toEqual([
      "Clarinette",
      "Clarinette",
      "Trompette",
    ]);
  });

  it("applique le rattrapage du principal sur l'id le plus bas", () => {
    const database = new DatabaseSync(":memory:");
    database.exec(`
      CREATE TABLE harmonie_instruments (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        instrument_name TEXT NOT NULL,
        is_primary INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO harmonie_instruments (id, user_id, instrument_name) VALUES
        (20, 2, 'Trompette'),
        (10, 1, 'Clarinette'),
        (15, 1, 'Trombone'),
        (30, 2, 'Cor');
    `);
    database.exec(`
      UPDATE harmonie_instruments
      SET is_primary = 1
      WHERE id IN (SELECT MIN(id) FROM harmonie_instruments GROUP BY user_id);
    `);

    const rows = database
      .prepare("SELECT user_id, id, is_primary FROM harmonie_instruments ORDER BY id")
      .all() as Array<{ user_id: number; id: number; is_primary: number }>;
    expect(rows.filter((row) => row.is_primary === 1).map((row) => row.id)).toEqual([10, 20]);
    database.close();
  });
});

describe("filtrage JSON des événements de présence", () => {
  it("accepte les identifiants JSON numériques et rejette les chaînes", () => {
    const database = new DatabaseSync(":memory:");
    database.exec("CREATE TABLE event_presences (event_id INTEGER NOT NULL)");
    database.exec("INSERT INTO event_presences (event_id) VALUES (42), (43), (99)");

    const query =
      "SELECT event_id FROM event_presences WHERE event_id IN (SELECT value FROM json_each(?) WHERE type = 'integer') ORDER BY event_id";

    expect(database.prepare(query).all(JSON.stringify([42, 43]))).toEqual([
      { event_id: 42 },
      { event_id: 43 },
    ]);
    expect(database.prepare(query).all(JSON.stringify(["42", "43"]))).toEqual([]);
    database.close();
  });
});
