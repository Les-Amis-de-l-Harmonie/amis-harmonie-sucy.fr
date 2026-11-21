import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleEventsApi } from "../events";
import { applyMockEnv, createMockDb } from "./test-helpers";
import { checkAdminAuth } from "../../admin-crud";
import { invalidateCache } from "@/lib/cache";

vi.mock("../../admin-crud", () => ({
  checkAdminAuth: vi.fn(),
}));

vi.mock("@/lib/cache", () => ({
  invalidateCache: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("handleEventsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth error when unauthorized", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );

    const response = await handleEventsApi(new Request("https://test.local/api/admin/events"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("passes through auth responses such as 404", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    );

    const response = await handleEventsApi(new Request("https://test.local/api/admin/events"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  it("returns all events on GET", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueAll({ results: [{ id: 1, title: "Concert" }] });

    const response = await handleEventsApi(new Request("https://test.local/api/admin/events"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 1, title: "Concert" }]);
  });

  it("retourne les informations pratiques sur GET par id", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueFirst({
      id: 2,
      title: "Festival",
      dress_code: "Tenue noire",
      call_time: "10H30",
      musician_notes: "Apporter les partitions",
    });

    const response = await handleEventsApi(new Request("https://test.local/api/admin/events?id=2"));

    expect(await response.json()).toMatchObject({
      dress_code: "Tenue noire",
      call_time: "10H30",
      musician_notes: "Apporter les partitions",
    });
  });

  it("returns one event by id on GET", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueFirst({ id: 2, title: "Festival" });

    const response = await handleEventsApi(new Request("https://test.local/api/admin/events?id=2"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 2, title: "Festival" });
  });

  it("creates event on POST", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueRun({ meta: { last_row_id: 44 } });

    const response = await handleEventsApi(
      new Request("https://test.local/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Nouveau", date: "2026-12-01" }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, id: 44 });
    expect(invalidateCache).toHaveBeenCalledTimes(1);
  });

  it("crée les informations pratiques en nettoyant les trois champs", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueRun({ meta: { last_row_id: 44 } });

    const response = await handleEventsApi(
      new Request("https://test.local/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Concert",
          date: "2026-12-01",
          dress_code: "  Tenue noire  ",
          call_time: " 10H30 ",
          musician_notes: "   ",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockDb.calls[0]?.sql).toContain("dress_code, call_time,");
    expect(mockDb.calls[0]?.sql).toContain("musician_notes");
    expect(mockDb.calls[0]?.binds.slice(15, 18)).toEqual(["Tenue noire", "10H30", null]);
  });

  it("preserves is_public when a partial PUT omits it", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueRun({ meta: { last_row_id: 1 } });

    const response = await handleEventsApi(
      new Request("https://test.local/api/admin/events?id=9", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Mis a jour", date: "2026-12-31" }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mockDb.calls[0]?.binds[9]).toBeNull();
    expect(mockDb.calls[0]?.sql).toContain("is_public = COALESCE(?, is_public)");
    expect(mockDb.calls[0]?.binds.slice(15, 18)).toEqual([null, null, null]);
    expect(mockDb.calls[0]?.sql).toContain(
      "dress_code = NULLIF(COALESCE(?, dress_code), '')"
    );
    expect(mockDb.calls[0]?.sql).toContain("call_time = NULLIF(COALESCE(?, call_time), '')");
    expect(mockDb.calls[0]?.sql).toContain(
      "musician_notes = NULLIF(COALESCE(?, musician_notes), '')"
    );
    expect(invalidateCache).toHaveBeenCalledTimes(1);
  });

  it("met à jour les trois informations pratiques après nettoyage", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueRun({ meta: { last_row_id: 1 } });

    const response = await handleEventsApi(
      new Request("https://test.local/api/admin/events?id=9", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Mis à jour",
          date: "2026-12-31",
          dress_code: "  Tenue blanche ",
          call_time: " 10H30 ",
          musician_notes: "Apporter les partitions  ",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockDb.calls[0]?.binds.slice(15, 18)).toEqual([
      "Tenue blanche",
      "10H30",
      "Apporter les partitions",
    ]);
  });

  it("efface les informations pratiques quand un PUT reçoit une chaîne vide", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueRun({ meta: { last_row_id: 1 } });

    const response = await handleEventsApi(
      new Request("https://test.local/api/admin/events?id=9", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Mis à jour",
          date: "2026-12-31",
          dress_code: "  ",
          call_time: "",
          musician_notes: "  ",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockDb.calls[0]?.binds.slice(15, 18)).toEqual(["", "", ""]);
    expect(mockDb.calls[0]?.sql.match(/NULLIF\(COALESCE\(\?,/g)).toHaveLength(6);
  });

  it("efface la date limite quand un PUT reçoit une chaîne vide", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueRun({ meta: { last_row_id: 1 } });

    const response = await handleEventsApi(
      new Request("https://test.local/api/admin/events?id=9", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Mis a jour",
          date: "2026-12-31",
          response_deadline: "",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockDb.calls[0]?.binds[12]).toBe("");
    expect(mockDb.calls[0]?.sql).toContain(
      "response_deadline = NULLIF(COALESCE(?, response_deadline), '')"
    );
  });

  it("refuse une date limite qui n'est pas au format AAAA-MM-JJ", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);

    const response = await handleEventsApi(
      new Request("https://test.local/api/admin/events?id=9", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Mis a jour",
          date: "2026-12-31",
          response_deadline: "01/09/2026",
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "La date limite de réponse doit être au format AAAA-MM-JJ.",
    });
  });

  it("returns 400 when PUT has no id", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);

    const response = await handleEventsApi(
      new Request("https://test.local/api/admin/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Mis a jour", date: "2026-12-31" }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "ID required" });
  });

  it("deletes event on DELETE", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueRun({ meta: { last_row_id: 1 } });

    const response = await handleEventsApi(
      new Request("https://test.local/api/admin/events?id=7", { method: "DELETE" })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(invalidateCache).toHaveBeenCalledTimes(1);
  });

  it("returns 405 for unsupported method", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);

    const response = await handleEventsApi(
      new Request("https://test.local/api/admin/events", { method: "PATCH" })
    );

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "Method not allowed" });
  });

  it("returns 500 when database throws", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueAll(new Error("boom"));

    const response = await handleEventsApi(new Request("https://test.local/api/admin/events"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
  });
});
