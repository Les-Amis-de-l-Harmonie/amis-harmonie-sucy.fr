// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import {
  handleMusicianAvatarApi,
  handleMusicianBirthdaysApi,
  handleMusicianInsuranceApi,
  handleMusicianPlanningCheckApi,
  handleMusicianProfileApi,
  handleMusicianTrombinoscopeApi,
} from "../musician";
import { handleMusicianPresenceApi } from "../musician-presence";
import { resolveMusicianIdentity } from "../auth";
import { createD1Database } from "./d1-adapter";

vi.mock("../auth", () => ({
  resolveMusicianIdentity: vi.fn(),
}));

const managed = {
  id: 8,
  email: "sans-email+8@interne.amis-harmonie-sucy.fr",
  role: "MUSICIAN" as const,
  kind: "managed" as const,
  is_active: 1,
  last_login: null,
  created_at: "2026-01-01",
  sessionId: "session-parent",
  acting_user_id: 8,
};
const actor = {
  id: 7,
  email: "parent@example.fr",
  role: "MUSICIAN" as const,
  kind: "member" as const,
  is_active: 1,
  last_login: null,
  created_at: "2026-01-01",
  sessionId: "session-parent",
  acting_user_id: 8,
};
const guardian = {
  id: 20,
  email: "parent@example.fr",
  role: "MUSICIAN" as const,
  kind: "guardian" as const,
  is_active: 1,
  last_login: null,
  created_at: "2026-01-01",
  sessionId: "session-guardian",
  acting_user_id: 20,
};

const originalDb = env.DB;
let database: DatabaseSync;

function setIdentity(
  effective: typeof managed | typeof actor | typeof guardian,
  identityActor: typeof actor | typeof guardian = actor,
  delegated = false
) {
  vi.mocked(resolveMusicianIdentity).mockResolvedValue({
    actor: identityActor,
    effective,
    delegated,
    profiles: [],
  });
}

function createDatabase(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE musician_profiles (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE,
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
      adhesion_2026_2027 INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE guardian_links (
      id INTEGER PRIMARY KEY,
      guardian_user_id INTEGER,
      child_user_id INTEGER,
      relation TEXT
    );
    CREATE TABLE guardian_image_consents (
      id INTEGER PRIMARY KEY,
      child_user_id INTEGER NOT NULL,
      guardian_user_id INTEGER NOT NULL,
      consent INTEGER NOT NULL,
      recorded_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(child_user_id, guardian_user_id)
    );
    CREATE TABLE musician_instruments (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      instrument_name TEXT NOT NULL,
      start_date TEXT,
      level TEXT,
      sort_order INTEGER
    );
    CREATE TABLE harmonie_instruments (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      instrument_name TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE insurance_instruments (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      instrument_name TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      serial_number TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO musician_profiles (user_id, first_name, last_name, phone, image_consent)
      VALUES (7, 'Aurélie', 'Parent', '0622222222', 0),
             (8, 'Enfant', 'Géré', '0600000000', 1),
             (20, 'Parent', 'Test', '0611111111', 0);
    INSERT INTO guardian_links (guardian_user_id, child_user_id, relation)
      VALUES (7, 8, 'mère');
    INSERT INTO musician_instruments (user_id, instrument_name) VALUES (20, 'Trompette');
    INSERT INTO harmonie_instruments (user_id, instrument_name) VALUES (20, 'Trompette');
  `);
  return db;
}

describe("règles de profil des comptes responsables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database = createDatabase();
    Object.assign(env, { DB: createD1Database(database) });
  });

  afterEach(() => {
    database.close();
    Object.assign(env, { DB: originalDb });
  });

  it("masque l'adresse réservée et indique le verrou du droit à l'image", async () => {
    setIdentity(managed, actor, false);

    const response = await handleMusicianProfileApi(
      new Request("https://test.local/api/musician/profile")
    );
    const profile = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(profile.email).toBeNull();
    expect(profile.imageConsentLocked).toBe(true);
  });

  it("conserve le consentement si le musicien lié n'agit pas par délégation", async () => {
    const child = { ...managed, kind: "member" as const, email: "enfant@example.fr" };
    setIdentity(child, child, false);

    const response = await handleMusicianProfileApi(
      new Request("https://test.local/api/musician/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_consent: false }),
      })
    );

    expect(response.status).toBe(200);
    expect(
      database.prepare("SELECT image_consent FROM musician_profiles WHERE user_id = 8").get()
    ).toEqual({
      image_consent: 1,
    });
    expect(
      database.prepare("SELECT count(*) AS count FROM guardian_image_consents WHERE child_user_id = 8").get()
    ).toEqual({ count: 0 });
  });

  it("enregistre la réponse du parent délégué sans modifier le profil legacy", async () => {
    setIdentity(managed, actor, true);

    const response = await handleMusicianProfileApi(
      new Request("https://test.local/api/musician/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_consent: false }),
      })
    );

    expect(response.status).toBe(200);
    expect(
      database.prepare("SELECT image_consent FROM musician_profiles WHERE user_id = 8").get()
    ).toEqual({
      image_consent: 1,
    });
    expect(
      database
        .prepare(
          "SELECT child_user_id, guardian_user_id, consent, recorded_by FROM guardian_image_consents"
        )
        .get()
    ).toEqual({
      child_user_id: 8,
      guardian_user_id: 7,
      consent: 0,
      recorded_by: null,
    });

    const getResponse = await handleMusicianProfileApi(
      new Request("https://test.local/api/musician/profile")
    );
    const profile = (await getResponse.json()) as {
      imageConsentDetail: {
        linked: boolean;
        effective: number | null;
        mine: number | null;
        guardians: Array<{ name: string; relation: string | null; consent: number | null; isYou: boolean }>;
      };
    };
    expect(profile.imageConsentDetail).toEqual({
      linked: true,
      effective: 0,
      mine: 0,
      guardians: [{ name: "Aurélie", relation: "mère", consent: 0, isYou: true }],
    });
  });

  it("ne change pas la réponse du parent quand le PUT reçoit null", async () => {
    database
      .prepare(
        "INSERT INTO guardian_image_consents (child_user_id, guardian_user_id, consent) VALUES (8, 7, 1)"
      )
      .run();
    setIdentity(managed, actor, true);

    const response = await handleMusicianProfileApi(
      new Request("https://test.local/api/musician/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_consent: null }),
      })
    );

    expect(response.status).toBe(200);
    expect(
      database.prepare("SELECT consent FROM guardian_image_consents WHERE child_user_id = 8").get()
    ).toEqual({ consent: 1 });
  });

  it("limite le profil Moi d'un responsable à son nom et son téléphone", async () => {
    setIdentity(guardian, guardian, false);

    const response = await handleMusicianProfileApi(
      new Request("https://test.local/api/musician/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: "Nouveau",
          last_name: "Nom",
          phone: "0622222222",
          date_of_birth: "2000-01-01",
          image_consent: true,
          harmonieInstruments: ["Flûte traversière"],
          instruments: [{ instrument_name: "Clarinette" }],
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(
      database
        .prepare(
          "SELECT first_name, last_name, phone, date_of_birth, image_consent FROM musician_profiles WHERE user_id = 20"
        )
        .get()
    ).toEqual({
      first_name: "Nouveau",
      last_name: "Nom",
      phone: "0622222222",
      date_of_birth: null,
      image_consent: 0,
    });
    expect(
      database.prepare("SELECT instrument_name FROM musician_instruments WHERE user_id = 20").all()
    ).toEqual([{ instrument_name: "Trompette" }]);
    expect(
      database.prepare("SELECT instrument_name FROM harmonie_instruments WHERE user_id = 20").all()
    ).toEqual([{ instrument_name: "Trompette" }]);
  });

  it("refuse présence, assurance, photo et listes publiques dans l'espace Moi", async () => {
    setIdentity(guardian, guardian, false);

    const responses = await Promise.all([
      handleMusicianPresenceApi(new Request("https://test.local/api/musician/presence")),
      handleMusicianInsuranceApi(new Request("https://test.local/api/musician/insurance")),
      handleMusicianAvatarApi(
        new Request("https://test.local/api/musician/avatar", { method: "POST" })
      ),
      handleMusicianBirthdaysApi(new Request("https://test.local/api/musician/birthdays")),
      handleMusicianPlanningCheckApi(new Request("https://test.local/api/musician/planning-check")),
      handleMusicianTrombinoscopeApi(new Request("https://test.local/api/musician/trombinoscope")),
    ]);

    expect(responses.map((response) => response.status)).toEqual([403, 403, 403, 403, 403, 403]);
  });
});
