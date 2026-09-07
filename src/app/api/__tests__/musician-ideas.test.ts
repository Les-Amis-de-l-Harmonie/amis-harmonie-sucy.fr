// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { handleMusicianIdeasApi } from "../musician";
import { verifySession } from "../auth";

vi.mock("../auth", () => ({
  verifySession: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

const originalDb = env.DB;

interface SqliteStatement {
  bind(...values: Array<string | number | null>): SqliteStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

// Cet adaptateur ne reproduit qu'une petite partie de D1 pour exécuter ce handler
// avec SQLite natif. Ses écarts connus sont les suivants : `.run()` renvoie
// `{ changes, lastInsertRowid }` (et non `{ meta: { last_row_id } }`), `.all()` ne
// renvoie ni `success` ni `meta`, `batch()` est absent, et le schéma ci-dessous est
// réécrit à la main et partiel : il n'exerce pas les contraintes complètes du schéma
// D1 (notamment CHECK et clés étrangères, et seulement les NOT NULL déclarés ici).
function createD1Database(database: DatabaseSync): { prepare: (sql: string) => SqliteStatement } {
  return {
    prepare(sql: string): SqliteStatement {
      let values: Array<string | number | null> = [];
      const statement: SqliteStatement = {
        bind(...boundValues) {
          values = boundValues;
          return statement;
        },
        async first<T>() {
          const result = database.prepare(sql).get(...values);
          return (result as T | undefined) ?? null;
        },
        async all<T>() {
          return { results: database.prepare(sql).all(...values) as T[] };
        },
        async run() {
          return database.prepare(sql).run(...values);
        },
      };
      return statement;
    },
  };
}

function createDatabase(): DatabaseSync {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE ideas (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      is_public INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE musician_profiles (
      user_id INTEGER PRIMARY KEY,
      first_name TEXT
    );
    CREATE TABLE idea_likes (
      id INTEGER PRIMARY KEY,
      idea_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL
    );
    CREATE TABLE idea_reads (
      idea_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (idea_id, user_id)
    );
    INSERT INTO ideas (id, user_id, title, description, category, is_public, created_at) VALUES
      (1, 2, 'Idée publique récente', 'Description publique', 'association', 1, '2026-09-03 10:00:00'),
      (2, 2, 'Idée privée très récente', 'Description privée', 'website', 0, '2026-09-04 10:00:00'),
      (3, 1, 'Ma propre idée publique', 'Ma description', 'harmonie', 1, '2026-09-02 10:00:00'),
      (4, 3, 'Idée publique ancienne', 'Ancienne description', 'website', 1, '2026-09-01 10:00:00');
    INSERT INTO musician_profiles (user_id, first_name) VALUES
      (1, 'Musicien'),
      (2, 'Alice'),
      (3, 'Bob');
    INSERT INTO idea_likes (id, idea_id, user_id) VALUES
      (1, 1, 1),
      (2, 1, 3),
      (3, 3, 2);
    INSERT INTO idea_reads (idea_id, user_id) VALUES (4, 1);
  `);
  return database;
}

describe("handleMusicianIdeasApi avec count=unread", () => {
  let database: DatabaseSync;

  beforeEach(() => {
    vi.clearAllMocks();
    database = createDatabase();
    Object.assign(env, { DB: createD1Database(database) });
    vi.mocked(verifySession).mockResolvedValue({
      id: 1,
      email: "musicien@example.fr",
      role: "MUSICIAN",
      is_active: 1,
      last_login: null,
      created_at: "2026-01-01",
      sessionId: "session-id",
    });
  });

  afterEach(() => {
    database.close();
    Object.assign(env, { DB: originalDb });
  });

  it("retourne uniquement les idées publiques récentes sans marquer d'idée comme lue", async () => {
    const before = database
      .prepare("SELECT idea_id, user_id FROM idea_reads ORDER BY idea_id")
      .all();

    const response = await handleMusicianIdeasApi(
      new Request("https://test.local/api/musician/ideas?count=unread")
    );
    const body = (await response.json()) as {
      count: number;
      recent: Array<{
        id: number;
        title: string;
        description: string;
        category: string;
        created_at: string;
        author_first_name: string | null;
        likes_count: number;
      }>;
    };

    expect(body.count).toBe(1);
    expect(body.recent.map((idea) => idea.id)).toEqual([1, 3, 4]);
    expect(body.recent.every((idea) => idea.id !== 2)).toBe(true);
    expect(body.recent[0]).toMatchObject({
      title: "Idée publique récente",
      description: "Description publique",
      category: "association",
      author_first_name: "Alice",
      likes_count: 2,
    });

    const after = database
      .prepare("SELECT idea_id, user_id FROM idea_reads ORDER BY idea_id")
      .all();
    expect(after).toEqual(before);
  });
});
