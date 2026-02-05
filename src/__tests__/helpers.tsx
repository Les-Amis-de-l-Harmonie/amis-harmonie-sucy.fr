import { render, RenderOptions } from "@testing-library/react";
import { ReactElement } from "react";
import { vi } from "vitest";

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { ...options });
}

export function mockDb() {
  return {
    // eslint-disable-next-line no-unused-vars
    prepare: (_query: string) => ({
      // eslint-disable-next-line no-unused-vars
      bind: (..._args: unknown[]) => ({
        first: async <T = unknown,>() => null as T | null,
        all: async <T = unknown,>() => ({ results: [] as T[] }),
        run: async () => ({ success: true }),
      }),
    }),
  };
}

export function mockFetch(response: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
}

export function mockEnv() {
  return {
    DB: mockDb(),
    STORAGE: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    },
    CACHE: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
    RESEND_API_KEY: "test-api-key",
  };
}
