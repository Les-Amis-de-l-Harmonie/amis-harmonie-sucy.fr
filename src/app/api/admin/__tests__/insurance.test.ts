import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleInsuranceApi } from "../insurance";
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

describe("handleInsuranceApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("masque l'adresse interne d'un compte géré", async () => {
    const mockDb = createMockDb();
    applyMockEnv(mockDb);
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    mockDb.queueAll({
      results: [{ id: 12, user_id: 8, email: null, instrument_name: "Clarinette" }],
    });

    const response = await handleInsuranceApi(
      new Request("https://test.local/api/admin/insurance")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { id: 12, user_id: 8, email: null, instrument_name: "Clarinette" },
    ]);
    expect(mockDb.calls[0]?.sql).toContain(
      "CASE WHEN u.kind = 'managed' THEN NULL ELSE u.email END AS email"
    );
  });
});
