import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleUsersApi } from "../users";
import { applyMockEnv, createMockDb } from "./test-helpers";
import { checkAdminAuth } from "../../admin-crud";
import { verifySession } from "../../auth";

vi.mock("../../admin-crud", () => ({
  checkAdminAuth: vi.fn(),
}));

vi.mock("../../auth", () => ({
  verifySession: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));


describe("handleUsersApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth error for GET when checkAdminAuth fails", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );

    const response = await handleUsersApi(new Request("https://test.local/api/admin/users"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns user list on GET", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueAll(
      { results: [{ id: 1, email: "a@test.fr", role: "MUSICIAN" }] },
      { results: [{ user_id: 1, instrument_name: "Clarinette", start_date: null, level: null }] },
      { results: [{ user_id: 1, instrument_name: "Flute" }] }
    );

    const response = await handleUsersApi(new Request("https://test.local/api/admin/users"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: 1,
        email: "a@test.fr",
        role: "MUSICIAN",
        instruments: [{ instrument_name: "Clarinette", start_date: null, level: null }],
        harmonieInstruments: ["Flute"],
        primaryHarmonieInstrument: "Flute",
      },
    ]);
  });

  it("returns one user with profile and instruments on GET by id", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueFirst({ id: 2, email: "u@test.fr" });
    mockDb.queueAll(
      { results: [{ instrument_name: "Trompette", start_date: "2024-01-01", level: "2" }] },
      { results: [{ instrument_name: "Cor" }] }
    );

    const response = await handleUsersApi(new Request("https://test.local/api/admin/users?id=2"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: 2,
      email: "u@test.fr",
      instruments: [{ instrument_name: "Trompette", start_date: "2024-01-01", level: "2" }],
      harmonieInstruments: ["Cor"],
      primaryHarmonieInstrument: "Cor",
    });
  });

  it("returns 401 for non-GET when session is missing", async () => {
    vi.mocked(verifySession).mockResolvedValueOnce(null);

    const response = await handleUsersApi(
      new Request("https://test.local/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "new@test.fr" }),
      })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 for POST when not super admin", async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      id: 1,
      email: "admin@test.fr",
      role: "ADMIN",
      is_active: 1,
      created_at: "2026-01-01",
      last_login: null,
      sessionId: "s1",
    });

    const response = await handleUsersApi(
      new Request("https://test.local/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "new@test.fr" }),
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Super admin required" });
  });

  it("creates user on POST for super admin", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(verifySession).mockResolvedValueOnce({
      id: 99,
      email: "super@test.fr",
      role: "SUPER_ADMIN",
      is_active: 1,
      created_at: "2026-01-01",
      last_login: null,
      sessionId: "s2",
    });
    mockDb.queueFirst(null);
    mockDb.batch.mockResolvedValueOnce([{ meta: { last_row_id: 12 } }]);

    const response = await handleUsersApi(
      new Request("https://test.local/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "new@test.fr",
          role: "MUSICIAN",
          is_active: 1,
          instruments: [{ instrument_name: "Clarinette" }],
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, id: 12 });
    expect(mockDb.batch).toHaveBeenCalledTimes(1);
  });

  it("résout l'utilisateur par email pour les instruments d'harmonie créés en batch", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(verifySession).mockResolvedValueOnce({
      id: 99,
      email: "super@test.fr",
      role: "SUPER_ADMIN",
      is_active: 1,
      created_at: "2026-01-01",
      last_login: null,
      sessionId: "s-batch-primary",
    });
    mockDb.queueFirst(null);
    mockDb.batch.mockResolvedValueOnce([{ meta: { last_row_id: 12 } }]);

    const response = await handleUsersApi(
      new Request("https://test.local/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "  NEW@TEST.FR ",
          role: "MUSICIAN",
          harmonieInstruments: ["Cor", "Trompette"],
          primaryHarmonieInstrument: "Trompette",
        }),
      })
    );

    expect(response.status).toBe(200);
    const harmonieInsert = mockDb.calls.find((call) =>
      call.sql.includes("INSERT INTO harmonie_instruments")
    );
    expect(harmonieInsert?.sql).toBe(
      "INSERT INTO harmonie_instruments (user_id, instrument_name, is_primary) VALUES ((SELECT id FROM users WHERE email = ?), ?, ?)"
    );
    expect(harmonieInsert?.sql).not.toContain("last_insert_rowid()");
    expect(harmonieInsert?.binds).toEqual(["new@test.fr", "Cor", 0]);
  });

  it("returns 403 for PUT on another user when not super admin", async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      id: 1,
      email: "admin@test.fr",
      role: "ADMIN",
      is_active: 1,
      created_at: "2026-01-01",
      last_login: null,
      sessionId: "s3",
    });

    const response = await handleUsersApi(
      new Request("https://test.local/api/admin/users?id=2", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "x@test.fr" }),
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Vous ne pouvez modifier que votre propre profil",
    });
  });

  it("updates user on PUT for own profile", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(verifySession).mockResolvedValueOnce({
      id: 2,
      email: "admin@test.fr",
      role: "ADMIN",
      is_active: 1,
      created_at: "2026-01-01",
      last_login: null,
      sessionId: "s4",
    });
    mockDb.queueFirst(null, { id: 1 });
    mockDb.queueRun(
      { meta: { last_row_id: 1 } },
      { meta: { last_row_id: 1 } },
      { meta: { last_row_id: 1 } },
      { meta: { last_row_id: 1 } }
    );

    const response = await handleUsersApi(
      new Request("https://test.local/api/admin/users?id=2", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "update@test.fr",
          role: "ADMIN",
          is_active: 1,
          instruments: [{ instrument_name: "Cor" }],
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mockDb.calls.some((call) => call.sql.includes("DELETE FROM harmonie_instruments"))).toBe(
      false
    );
  });

  it("exige un instrument principal pour plusieurs instruments d'harmonie", async () => {
    applyMockEnv(createMockDb());
    vi.mocked(verifySession).mockResolvedValueOnce({
      id: 2,
      email: "admin@test.fr",
      role: "ADMIN",
      is_active: 1,
      created_at: "2026-01-01",
      last_login: null,
      sessionId: "s-validation",
    });

    const response = await handleUsersApi(
      new Request("https://test.local/api/admin/users?id=2", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "update@test.fr",
          role: "ADMIN",
          is_active: 1,
          harmonieInstruments: ["Cor", "Trompette"],
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("instrument principal"),
    });
  });

  it("returns 405 on unsupported method", async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      id: 99,
      email: "super@test.fr",
      role: "SUPER_ADMIN",
      is_active: 1,
      created_at: "2026-01-01",
      last_login: null,
      sessionId: "s5",
    });

    const response = await handleUsersApi(
      new Request("https://test.local/api/admin/users", { method: "PATCH" })
    );

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "Method not allowed" });
  });

  it("returns 500 when database throws", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueAll(new Error("db error"));

    const response = await handleUsersApi(new Request("https://test.local/api/admin/users"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
  });
});
