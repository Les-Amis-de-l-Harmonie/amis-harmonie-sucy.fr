import { vi } from "vitest";
import { env } from "cloudflare:workers";

type QueueItem<T> = T | Error;

export interface MockDb {
  prepare: ReturnType<typeof vi.fn>;
  batch: ReturnType<typeof vi.fn>;
  queueFirst: (...values: QueueItem<unknown>[]) => void;
  queueAll: (...values: QueueItem<{ results: unknown[] }>[]) => void;
  queueRun: (...values: QueueItem<{ meta: { last_row_id: number } }>[]) => void;
  calls: Array<{ sql: string; binds: unknown[] }>;
}

function takeQueued<T>(queue: Array<QueueItem<T>>, fallback: T): T {
  const next = queue.length > 0 ? queue.shift() : fallback;
  if (next instanceof Error) {
    throw next;
  }

  return next as T;
}

export function createMockDb(): MockDb {
  const firstQueue: Array<QueueItem<unknown>> = [];
  const allQueue: Array<QueueItem<{ results: unknown[] }>> = [];
  const runQueue: Array<QueueItem<{ meta: { last_row_id: number } }>> = [];
  const calls: Array<{ sql: string; binds: unknown[] }> = [];

  const prepare = vi.fn((sql: string) => {
    const call = { sql, binds: [] as unknown[] };
    calls.push(call);

    const statement = {
      bind: vi.fn((...binds: unknown[]) => {
        call.binds = binds;
        return statement;
      }),
      first: vi.fn(async () => takeQueued(firstQueue, null)),
      all: vi.fn(async () => takeQueued(allQueue, { results: [] })),
      run: vi.fn(async () => takeQueued(runQueue, { meta: { last_row_id: 1 } })),
    };

    return statement;
  });

  const batch = vi.fn(async () => [{ meta: { last_row_id: 1 } }]);

  return {
    prepare,
    batch,
    queueFirst: (...values: QueueItem<unknown>[]) => {
      firstQueue.push(...values);
    },
    queueAll: (...values: QueueItem<{ results: unknown[] }>[]) => {
      allQueue.push(...values);
    },
    queueRun: (...values: QueueItem<{ meta: { last_row_id: number } }>[]) => {
      runQueue.push(...values);
    },
    calls,
  };
}

export function applyMockEnv(mockDb: MockDb): void {
  const mutableEnv = env as unknown as Record<string, unknown>;
  mutableEnv.DB = mockDb;
  mutableEnv.CACHE = {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  mutableEnv.R2 = {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  };
}

export async function readJson(response: Response): Promise<unknown> {
  return response.json();
}
