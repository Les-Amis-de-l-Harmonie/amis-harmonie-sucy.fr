// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { resolveMusicianIdentity } from "../auth";
import { handleMusicianBirthdaysApi, handleMusicianTrombinoscopeApi } from "../musician";

vi.mock("../auth", () => ({
  resolveMusicianIdentity: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

interface SqliteStatement {
  bind(...values: Array<string | number | null>): SqliteStatement;
  all<T>(): Promise<{ results: T[] }>;
}

function createD1Database(database: DatabaseSync): { prepare: (sql: string) => SqliteStatement } {
  return {
    prepare(sql: string): SqliteStatement {
      let values: Array<string | number | null> = [];
      const statement: SqliteStatement = {
        bind(...boundValues) {
          values = boundValues;
          return statement;
        },
        async all<T>() {
          return { results: database.prepare(sql).all(...values) as T[] };
        },
      };
      return statement;
    },
  };
}

function createDatabase(): DatabaseSync {
  const database = new DatabaseSync(":memory:");
  const now = new Date();
  const birthMonthDay = `${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
    now.getUTCDate()
  ).padStart(2, "0")}`;
  database.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      role TEXT NOT NULL,
      is_active INTEGER NOT NULL
    );
    CREATE TABLE musician_profiles (
      user_id INTEGER PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      date_of_birth TEXT,
      avatar TEXT,
      image_consent INTEGER,
      harmonie_start_date TEXT
    );
    CREATE TABLE harmonie_instruments (
      user_id INTEGER NOT NULL,
      instrument_name TEXT NOT NULL
    );
    INSERT INTO users (id, role, is_active) VALUES
      (1, 'MUSICIAN', 1),
      (2, 'MUSICIAN', 1),
      (3, 'MUSICIAN', 1),
      (4, 'MUSICIAN', 1),
      (5, 'MUSICIAN', 0);
  `);
  const insertProfile = database.prepare(
    "INSERT INTO musician_profiles (user_id, first_name, last_name, date_of_birth, avatar, image_consent, harmonie_start_date) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  insertProfile.run(
    1,
    "Moi",
    "Musicien",
    `1990-${birthMonthDay}`,
    "/images/r2/moi.webp",
    null,
    null
  );
  insertProfile.run(
    2,
    "Consentement",
    "Accordé",
    `1985-${birthMonthDay}`,
    "/images/r2/consenti.webp",
    1,
    null
  );
  insertProfile.run(
    3,
    "Consentement",
    "Refusé",
    `1980-${birthMonthDay}`,
    "/images/r2/refuse.webp",
    0,
    null
  );
  insertProfile.run(
    4,
    "Consentement",
    "Inconnu",
    `1975-${birthMonthDay}`,
    "/images/r2/inconnu.webp",
    null,
    null
  );
  insertProfile.run(
    5,
    "Compte",
    "Inactif",
    `1970-${birthMonthDay}`,
    "/images/r2/inactif.webp",
    1,
    null
  );
  database
    .prepare("INSERT INTO harmonie_instruments (user_id, instrument_name) VALUES (2, 'Flûte')")
    .run();
  return database;
}

const caller = {
  id: 1,
  email: "musicien@example.fr",
  role: "MUSICIAN" as const,
  is_active: 1,
  created_at: "2026-01-01",
  last_login: null,
  sessionId: "session-id",
};
const originalDb = env.DB;
let database: DatabaseSync;

describe("confidentialité des photos et anniversaires musiciens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database = createDatabase();
    Object.assign(env, { DB: createD1Database(database) });
    vi.mocked(resolveMusicianIdentity).mockResolvedValue({ actor: caller, effective: caller });
  });

  afterEach(() => {
    database.close();
    Object.assign(env, { DB: originalDb });
  });

  it("ne renvoie que le mois et le jour des anniversaires et masque les photos sans accord", async () => {
    const response = await handleMusicianBirthdaysApi(
      new Request("https://test.local/api/musician/birthdays")
    );
    const birthdays = (await response.json()) as Array<Record<string, unknown>>;
    const byLastName = new Map(birthdays.map((birthday) => [birthday.last_name, birthday]));

    expect(response.status).toBe(200);
    expect(birthdays).toHaveLength(4);
    expect(byLastName.get("Musicien")).toEqual(
      expect.objectContaining({ birthday: expect.stringMatching(/^\d{2}-\d{2}$/), avatar: null })
    );
    expect(birthdays.every((birthday) => !("date_of_birth" in birthday))).toBe(true);
    expect(
      birthdays.every(
        (birthday) =>
          Object.keys(birthday).sort().join(",") ===
          "avatar,birthday,days_until,first_name,last_name"
      )
    ).toBe(true);
    expect(byLastName.get("Accordé")?.avatar).toBe("/images/r2/consenti.webp");
    expect(byLastName.get("Refusé")?.avatar).toBeNull();
    expect(byLastName.get("Inconnu")?.avatar).toBeNull();
  });

  it("ne renvoie les photos du trombinoscope qu'avec un consentement explicite", async () => {
    const response = await handleMusicianTrombinoscopeApi(
      new Request("https://test.local/api/musician/trombinoscope")
    );
    const body = (await response.json()) as {
      musicians: Array<{
        user_id: number;
        avatar: string | null;
        image_consent: number | null;
      }>;
    };
    const byUserId = new Map(body.musicians.map((musician) => [musician.user_id, musician]));

    expect(response.status).toBe(200);
    expect(body.musicians).toHaveLength(4);
    expect(byUserId.get(1)?.avatar).toBeNull();
    expect(byUserId.get(1)?.image_consent).toBeNull();
    expect(byUserId.get(2)?.avatar).toBe("/images/r2/consenti.webp");
    expect(byUserId.get(3)?.avatar).toBeNull();
    expect(byUserId.get(4)?.avatar).toBeNull();
  });
});
