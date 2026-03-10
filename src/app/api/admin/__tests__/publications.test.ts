import { beforeEach, describe, expect, it, vi } from "vitest";
import { handlePublicationsApi } from "../publications";
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

describe("handlePublicationsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth error when unauthorized", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );

    const response = await handlePublicationsApi(
      new Request("https://test.local/api/admin/publications")
    );

    expect(response.status).toBe(401);
  });

  it("returns list on GET", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueAll({ results: [{ id: 1, instagram_post_id: "abc" }] });

    const response = await handlePublicationsApi(
      new Request("https://test.local/api/admin/publications")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 1, instagram_post_id: "abc" }]);
  });

  it("returns one publication by id", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueFirst({ id: 3, instagram_post_id: "post" });

    const response = await handlePublicationsApi(
      new Request("https://test.local/api/admin/publications?id=3")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 3, instagram_post_id: "post" });
  });

  it("creates publication on POST and trims trailing slash", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueRun({ meta: { last_row_id: 88 } });

    const response = await handlePublicationsApi(
      new Request("https://test.local/api/admin/publications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagram_post_id: "post-slug///" }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, id: 88 });
    expect(mockDb.calls[0]?.binds[0]).toBe("post-slug");
    expect(invalidateCache).toHaveBeenCalledTimes(1);
  });

  it("updates publication on PUT", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueRun({ meta: { last_row_id: 1 } });

    const response = await handlePublicationsApi(
      new Request("https://test.local/api/admin/publications?id=4", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagram_post_id: "next" }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });

  it("returns 400 when PUT has no id", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);

    const response = await handlePublicationsApi(
      new Request("https://test.local/api/admin/publications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagram_post_id: "next" }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "ID required" });
  });

  it("deletes publication on DELETE", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueRun({ meta: { last_row_id: 1 } });

    const response = await handlePublicationsApi(
      new Request("https://test.local/api/admin/publications?id=4", { method: "DELETE" })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });

  it("returns 405 for unsupported method", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);

    const response = await handlePublicationsApi(
      new Request("https://test.local/api/admin/publications", { method: "PATCH" })
    );

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "Method not allowed" });
  });

  it("returns 500 when database throws", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueAll(new Error("db"));

    const response = await handlePublicationsApi(
      new Request("https://test.local/api/admin/publications")
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
  });
});
