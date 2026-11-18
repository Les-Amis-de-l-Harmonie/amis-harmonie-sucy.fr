// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { handleEventsApi } from "../events";
import { checkAdminAuth } from "../../admin-crud";
import { createD1Database } from "@/app/api/__tests__/d1-adapter";

vi.mock("../../admin-crud", () => ({ checkAdminAuth: vi.fn() }));
vi.mock("@/lib/cache", () => ({ invalidateCache: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const originalDb = env.DB;
let database: DatabaseSync;

beforeEach(() => {
  vi.clearAllMocks();
  database = new DatabaseSync(":memory:");
  const migrations = readdirSync("migrations")
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  for (const migration of migrations) database.exec(readFileSync(`migrations/${migration}`, "utf8"));
  Object.assign(env, { DB: createD1Database(database) });
  vi.mocked(checkAdminAuth).mockResolvedValue(null);
});

afterEach(() => {
  database.close();
  Object.assign(env, { DB: originalDb });
});

async function createEvent() {
  const response = await handleEventsApi(
    new Request("https://test.local/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Sortie",
        date: "2099-06-01",
        parental_authorization_required: 1,
        authorization_details: "Départ à 8 h",
      }),
    })
  );
  const body = (await response.json()) as { id: number };
  return body.id;
}

describe("autorisations parentales des événements administrés", () => {
  it("enregistre le réglage et les détails à la création", async () => {
    const id = await createEvent();
    expect(
      database
        .prepare(
          "SELECT parental_authorization_required, authorization_details FROM events WHERE id = ?"
        )
        .get(id)
    ).toEqual({ parental_authorization_required: 1, authorization_details: "Départ à 8 h" });
  });

  it("préserve le drapeau et le texte quand un PUT partiel les omet", async () => {
    const id = await createEvent();
    const response = await handleEventsApi(
      new Request(`https://test.local/api/admin/events?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Sortie modifiée", date: "2099-06-02" }),
      })
    );

    expect(response.status).toBe(200);
    expect(
      database
        .prepare(
          "SELECT parental_authorization_required, authorization_details FROM events WHERE id = ?"
        )
        .get(id)
    ).toEqual({ parental_authorization_required: 1, authorization_details: "Départ à 8 h" });
  });

  it("efface les détails vides et permet de désactiver la demande explicitement", async () => {
    const id = await createEvent();
    const response = await handleEventsApi(
      new Request(`https://test.local/api/admin/events?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Sortie modifiée",
          date: "2099-06-02",
          parental_authorization_required: 0,
          authorization_details: "  ",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(
      database
        .prepare(
          "SELECT parental_authorization_required, authorization_details FROM events WHERE id = ?"
        )
        .get(id)
    ).toEqual({ parental_authorization_required: 0, authorization_details: null });
  });
});
