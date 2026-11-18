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
      kind TEXT NOT NULL DEFAULT 'member',
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
    CREATE TABLE guardian_links (
      id INTEGER PRIMARY KEY,
      guardian_user_id INTEGER NOT NULL,
      child_user_id INTEGER NOT NULL,
      relation TEXT
    );
    CREATE TABLE guardian_image_consents (
      id INTEGER PRIMARY KEY,
      child_user_id INTEGER NOT NULL,
      guardian_user_id INTEGER NOT NULL,
      consent INTEGER NOT NULL,
      recorded_by INTEGER,
      UNIQUE(child_user_id, guardian_user_id)
    );
    INSERT INTO users (id, role, kind, is_active) VALUES
      (1, 'MUSICIAN', 'member', 1),
      (2, 'MUSICIAN', 'member', 1),
      (3, 'MUSICIAN', 'member', 1),
      (4, 'MUSICIAN', 'member', 1),
      (5, 'MUSICIAN', 'member', 0),
      (6, 'MUSICIAN', 'guardian', 1);
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
  insertProfile.run(
    6,
    "Responsable",
    "Exclu",
    `1995-${birthMonthDay}`,
    "/images/r2/responsable.webp",
    1,
    null
  );
  database
    .prepare("INSERT INTO guardian_links (guardian_user_id, child_user_id, relation) VALUES (6, 2, 'mère')")
    .run();
  database
    .prepare(
      "INSERT INTO guardian_image_consents (child_user_id, guardian_user_id, consent) VALUES (2, 6, 0)"
    )
    .run();
  database
    .prepare("INSERT INTO harmonie_instruments (user_id, instrument_name) VALUES (2, 'Flûte')")
    .run();
  database
    .prepare("INSERT INTO harmonie_instruments (user_id, instrument_name) VALUES (6, 'Cor')")
    .run();
  return database;
}

const caller = {
  id: 1,
  email: "musicien@example.fr",
  role: "MUSICIAN" as const,
  kind: "member" as const,
  is_active: 1,
  created_at: "2026-01-01",
  last_login: null,
  sessionId: "session-id",
  acting_user_id: null,
};
const originalDb = env.DB;
let database: DatabaseSync;

describe("confidentialité des photos et anniversaires musiciens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database = createDatabase();
    Object.assign(env, { DB: createD1Database(database) });
    vi.mocked(resolveMusicianIdentity).mockResolvedValue({
      actor: caller,
      effective: caller,
      delegated: false,
      profiles: [],
    });
  });

  afterEach(() => {
    database.close();
    Object.assign(env, { DB: originalDb });
  });

  it("un non parental masque l'avatar des anniversaires malgré le oui historique", async () => {
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
    expect(byLastName.get("Accordé")?.avatar).toBeNull();
    expect(byLastName.get("Refusé")?.avatar).toBeNull();
    expect(byLastName.get("Inconnu")?.avatar).toBeNull();
    expect(byLastName.has("Exclu")).toBe(false);
  });

  it("un non parental masque du trombinoscope une photo autorisée par la valeur historique", async () => {
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
    expect(byUserId.get(2)?.image_consent).toBe(0);
    expect(byUserId.get(2)?.avatar).toBeNull();
    expect(byUserId.get(3)?.avatar).toBeNull();
    expect(byUserId.get(4)?.avatar).toBeNull();
    expect(byUserId.has(6)).toBe(false);
  });
});
