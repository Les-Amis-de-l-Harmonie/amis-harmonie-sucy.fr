import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleIdeasApi } from "../ideas";
import { checkAdminAuth } from "../../admin-crud";
import { applyMockEnv, createMockDb } from "./test-helpers";

vi.mock("../../admin-crud", () => ({
  checkAdminAuth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("handleIdeasApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("masque l'adresse interne de l'auteur d'une idée gérée", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueAll({ results: [{ id: 25, user_id: 8, user_email: null, title: "Idée" }] });

    const response = await handleIdeasApi(new Request("https://test.local/api/admin/ideas"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { id: 25, user_id: 8, user_email: null, title: "Idée" },
    ]);
    expect(mockDb.calls[0]?.sql).toContain(
      "CASE WHEN u.kind = 'managed' THEN NULL ELSE u.email END AS user_email"
    );
  });
});
