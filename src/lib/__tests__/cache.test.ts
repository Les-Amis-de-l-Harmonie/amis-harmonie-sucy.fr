import { describe, it, expect } from "vitest";
import { shouldCachePath } from "../cache";

describe("cache utilities", () => {
  describe("shouldCachePath", () => {
    it("should not cache admin paths", () => {
      expect(shouldCachePath("/admin")).toBe(false);
      expect(shouldCachePath("/admin/events")).toBe(false);
      expect(shouldCachePath("/admin/users")).toBe(false);
    });

    it("should not cache API paths", () => {
      expect(shouldCachePath("/api/auth")).toBe(false);
      expect(shouldCachePath("/api/contact")).toBe(false);
      expect(shouldCachePath("/api/events")).toBe(false);
    });

    it("should not cache R2 image paths", () => {
      expect(shouldCachePath("/images/r2/test.jpg")).toBe(false);
      expect(shouldCachePath("/images/r2/avatar.png")).toBe(false);
    });

    it("should cache public paths", () => {
      expect(shouldCachePath("/")).toBe(true);
      expect(shouldCachePath("/about")).toBe(true);
      expect(shouldCachePath("/events")).toBe(true);
      expect(shouldCachePath("/contact")).toBe(true);
      expect(shouldCachePath("/livre-or")).toBe(true);
    });

    it("should cache nested public paths", () => {
      expect(shouldCachePath("/events/2024")).toBe(true);
      expect(shouldCachePath("/publications/newsletter")).toBe(true);
    });
  });
});
