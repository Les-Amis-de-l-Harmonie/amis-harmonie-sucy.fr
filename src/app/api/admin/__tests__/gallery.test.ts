import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { handleGalleryApi } from "../gallery";
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

describe("handleGalleryApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth error when unauthorized", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );

    const response = await handleGalleryApi(new Request("https://test.local/api/admin/gallery"));

    expect(response.status).toBe(401);
  });

  it("returns filtered category list on GET", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueAll({ results: [{ id: 1, category: "team" }] });

    const response = await handleGalleryApi(
      new Request("https://test.local/api/admin/gallery?category=team")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 1, category: "team" }]);
  });

  it("returns image by id on GET", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueFirst({ id: 3, image_url: "/images/test.jpg" });

    const response = await handleGalleryApi(
      new Request("https://test.local/api/admin/gallery?id=3")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 3, image_url: "/images/test.jpg" });
  });

  it("creates image on POST", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueFirst({ max_order: 4 });
    mockDb.queueRun({ meta: { last_row_id: 25 } });

    const response = await handleGalleryApi(
      new Request("https://test.local/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "team", image_url: "/images/a.jpg" }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, id: 25 });
    expect(invalidateCache).toHaveBeenCalledTimes(1);
  });

  it("reorders images on POST action=reorder", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueRun({ meta: { last_row_id: 1 } }, { meta: { last_row_id: 1 } });

    const response = await handleGalleryApi(
      new Request("https://test.local/api/admin/gallery?action=reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [5, 4] }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });

  it("returns 400 when reorder payload has no ids", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);

    const response = await handleGalleryApi(
      new Request("https://test.local/api/admin/gallery?action=reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nope: true }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "ids array required" });
  });

  it("updates image on PUT", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueRun({ meta: { last_row_id: 1 } });

    const response = await handleGalleryApi(
      new Request("https://test.local/api/admin/gallery?id=2", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "team",
          image_url: "/images/new.jpg",
          sort_order: 1,
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });

  it("deletes image and removes R2 object when needed", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    const r2Delete = vi.mocked(
      (env as unknown as { R2: { delete: ReturnType<typeof vi.fn> } }).R2.delete
    );
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueFirst({ image_url: "/images/r2/gallery/image.jpg" });
    mockDb.queueRun({ meta: { last_row_id: 1 } });

    const response = await handleGalleryApi(
      new Request("https://test.local/api/admin/gallery?id=11", { method: "DELETE" })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(r2Delete).toHaveBeenCalledWith("gallery/image.jpg");
  });

  it("returns 405 for unsupported method", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);

    const response = await handleGalleryApi(
      new Request("https://test.local/api/admin/gallery", { method: "PATCH" })
    );

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "Method not allowed" });
  });

  it("returns 500 when database throws", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueAll(new Error("broken"));

    const response = await handleGalleryApi(new Request("https://test.local/api/admin/gallery"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
  });
});
