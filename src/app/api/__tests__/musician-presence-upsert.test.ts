// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { PRESENCE_UPSERT_SQL } from "../musician-presence";

interface PresenceRecord {
  status: "present" | "absent";
  comment: string | null;
  status_changed_at: string;
  created_at: string;
  updated_at: string;
}

describe("PRESENCE_UPSERT_SQL", () => {
  it("préserve les dates appropriées selon que le statut change ou non", () => {
    const database = new DatabaseSync(":memory:");
    database.exec(`
      CREATE TABLE events (id INTEGER PRIMARY KEY);
      CREATE TABLE users (id INTEGER PRIMARY KEY);
      CREATE TABLE event_presences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK(status IN ('present', 'absent')),
        comment TEXT,
        status_changed_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(event_id, user_id)
      );
      INSERT INTO events (id) VALUES (12);
      INSERT INTO users (id) VALUES (7);
    `);

    const upsert = database.prepare(PRESENCE_UPSERT_SQL);
    const readPresence = () =>
      database
        .prepare(
          "SELECT status, comment, status_changed_at, created_at, updated_at FROM event_presences"
        )
        .get() as unknown as PresenceRecord;

    upsert.run(12, 7, "present", "Premier commentaire");
    const inserted = readPresence();
    const insertedStatusChangedAt = inserted.status_changed_at;
    const insertedCreatedAt = inserted.created_at;
    expect(insertedStatusChangedAt).toBeTruthy();

    database
      .prepare("UPDATE event_presences SET updated_at = ? WHERE event_id = ? AND user_id = ?")
      .run("2000-01-01 00:00:00", 12, 7);
    upsert.run(12, 7, "present", "Commentaire modifié");
    const sameStatus = readPresence();

    expect(sameStatus.status_changed_at).toBe(insertedStatusChangedAt);
    expect(sameStatus.updated_at).not.toBe("2000-01-01 00:00:00");
    expect(sameStatus.created_at).toBe(insertedCreatedAt);
    expect(sameStatus.comment).toBe("Commentaire modifié");

    database
      .prepare(
        "UPDATE event_presences SET status_changed_at = ? WHERE event_id = ? AND user_id = ?"
      )
      .run("2000-01-02 00:00:00", 12, 7);
    const statusChangedBeforeFlip = readPresence().status_changed_at;
    upsert.run(12, 7, "absent", "Statut modifié");
    const flippedStatus = readPresence();

    expect(flippedStatus.status_changed_at).not.toBe(statusChangedBeforeFlip);
    expect(flippedStatus.created_at).toBe(insertedCreatedAt);

    database.close();
  });
});
