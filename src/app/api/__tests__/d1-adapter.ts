import type { DatabaseSync } from "node:sqlite";

export interface SqliteStatement {
  bind(...values: Array<string | number | null>): SqliteStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number; last_row_id: number } }>;
}

export function createD1Database(database: DatabaseSync): {
  prepare: (sql: string) => SqliteStatement;
  batch: (statements: SqliteStatement[]) => Promise<unknown>;
} {
  return {
    async batch(statements) {
      for (const statement of statements) await statement.run();
      return [];
    },
    prepare(sql: string): SqliteStatement {
      let values: Array<string | number | null> = [];
      const statement: SqliteStatement = {
        bind(...boundValues) {
          values = boundValues;
          return statement;
        },
        async first<T>() {
          return (database.prepare(sql).get(...values) as T | undefined) ?? null;
        },
        async all<T>() {
          return { results: database.prepare(sql).all(...values) as T[] };
        },
        async run() {
          const result = database.prepare(sql).run(...values);
          return {
            meta: {
              changes: Number(result.changes),
              last_row_id: Number(result.lastInsertRowid),
            },
          };
        },
      };
      return statement;
    },
  };
}
