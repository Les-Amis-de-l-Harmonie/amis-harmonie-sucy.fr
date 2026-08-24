import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "../headers";

describe("buildContentSecurityPolicy", () => {
  it("allows any iframe origin on HelloAsso payment pages", () => {
    for (const path of ["/adhesion", "/adhesion/", "/partenaires", "/partenaires/"]) {
      const csp = buildContentSecurityPolicy("test-nonce", path);
      expect(csp).toContain("frame-src *");
      expect(csp).not.toMatch(/frame-src 'self'/);
    }
  });

  it("keeps a strict iframe allowlist on other pages", () => {
    const csp = buildContentSecurityPolicy("test-nonce", "/");
    expect(csp).toContain(
      "frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com https://www.helloasso.com"
    );
    expect(csp).not.toContain("frame-src *");
  });

  it("includes the request nonce in script-src", () => {
    const csp = buildContentSecurityPolicy("abc123", "/videos");
    expect(csp).toContain("'nonce-abc123'");
  });
});
