import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleVideosApi } from "../videos";
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

describe("handleVideosApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth error when unauthorized", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );

    const response = await handleVideosApi(new Request("https://test.local/api/admin/videos"));

    expect(response.status).toBe(401);
  });

  it("returns list on GET", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueAll({ results: [{ id: 1, youtube_id: "abc" }] });

    const response = await handleVideosApi(new Request("https://test.local/api/admin/videos"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 1, youtube_id: "abc" }]);
  });

  it("returns one video by id", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueFirst({ id: 2, youtube_id: "xyz" });

    const response = await handleVideosApi(new Request("https://test.local/api/admin/videos?id=2"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 2, youtube_id: "xyz" });
  });

  it("reorders videos on POST action=reorder", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueRun(
      { meta: { last_row_id: 1 } },
      { meta: { last_row_id: 1 } },
      { meta: { last_row_id: 1 } }
    );

    const response = await handleVideosApi(
      new Request("https://test.local/api/admin/videos?action=reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [10, 9, 8] }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(invalidateCache).toHaveBeenCalledTimes(1);
  });

  it("creates video on POST and parses YouTube URL", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueRun({ meta: { last_row_id: 1 } }, { meta: { last_row_id: 77 } });

    const response = await handleVideosApi(
      new Request("https://test.local/api/admin/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Video",
          youtube_id: "https://www.youtube.com/watch?v=abcdefghijk",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, id: 77 });
    expect(mockDb.calls[1]?.binds[1]).toBe("abcdefghijk");
    expect(invalidateCache).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for invalid YouTube URL", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);

    const response = await handleVideosApi(
      new Request("https://test.local/api/admin/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Bad", youtube_id: "bad-id" }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid YouTube URL or ID" });
  });

  it("updates video on PUT", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueRun({ meta: { last_row_id: 1 } });

    const response = await handleVideosApi(
      new Request("https://test.local/api/admin/videos?id=5", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Updated",
          youtube_id: "https://youtu.be/abcdefghijk",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });

  it("returns 400 for PUT without id", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);

    const response = await handleVideosApi(
      new Request("https://test.local/api/admin/videos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated", youtube_id: "abcdefghijk" }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "ID required" });
  });

  it("deletes video on DELETE", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueRun({ meta: { last_row_id: 1 } });

    const response = await handleVideosApi(
      new Request("https://test.local/api/admin/videos?id=6", { method: "DELETE" })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(invalidateCache).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when database throws", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueAll(new Error("db boom"));

    const response = await handleVideosApi(new Request("https://test.local/api/admin/videos"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
  });
});
