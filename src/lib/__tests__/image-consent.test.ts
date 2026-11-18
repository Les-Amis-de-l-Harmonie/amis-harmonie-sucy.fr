// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EFFECTIVE_IMAGE_CONSENT_SQL } from "../image-consent";

let database: DatabaseSync;

function createDatabase(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const migrations = readdirSync("migrations")
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  for (const migration of migrations) db.exec(readFileSync(`migrations/${migration}`, "utf8"));

  const child = db
    .prepare("INSERT INTO users (email, role, kind, is_active) VALUES (?, 'MUSICIAN', 'member', 1)")
    .run("child@example.test");
  const childId = Number(child.lastInsertRowid);
  db.prepare("INSERT INTO musician_profiles (user_id, image_consent) VALUES (?, 1)").run(childId);
  for (const email of ["parent-one@example.test", "parent-two@example.test", "stranger@example.test"]) {
    const result = db
      .prepare("INSERT INTO users (email, role, kind, is_active) VALUES (?, 'MUSICIAN', 'guardian', 1)")
      .run(email);
    db.prepare("INSERT INTO musician_profiles (user_id, first_name) VALUES (?, ?)").run(
      Number(result.lastInsertRowid),
      email.split("@")[0] ?? "Parent"
    );
  }
  db.prepare(
    "INSERT INTO guardian_links (guardian_user_id, child_user_id, relation) VALUES (2, ?, 'mère'), (3, ?, 'père')"
  ).run(childId, childId);
  return db;
}

function effectiveConsent(childId: number): number | null {
  const row = database
    .prepare(`SELECT ${EFFECTIVE_IMAGE_CONSENT_SQL} AS effective FROM musician_profiles p WHERE p.user_id = ?`)
    .get(childId) as { effective: number | null };
  return row.effective;
}

beforeEach(() => {
  database = createDatabase();
});

afterEach(() => {
  database.close();
});

describe("droit à l'image effectif", () => {
  it("un non l'emporte sur les oui des responsables encore reliés", () => {
    database
      .prepare(
        "INSERT INTO guardian_image_consents (child_user_id, guardian_user_id, consent) VALUES (1, 2, 1), (1, 3, 0)"
      )
      .run();
    expect(effectiveConsent(1)).toBe(0);
  });

  it("un oui suffit quand aucune réponse reliée ne refuse", () => {
    database
      .prepare(
        "INSERT INTO guardian_image_consents (child_user_id, guardian_user_id, consent) VALUES (1, 2, 1)"
      )
      .run();
    expect(effectiveConsent(1)).toBe(1);
  });

  it("garde la valeur historique quand aucun responsable n'a répondu", () => {
    expect(effectiveConsent(1)).toBe(1);
    database.prepare("UPDATE musician_profiles SET image_consent = 0 WHERE user_id = 1").run();
    expect(effectiveConsent(1)).toBe(0);
    database.prepare("UPDATE musician_profiles SET image_consent = NULL WHERE user_id = 1").run();
    expect(effectiveConsent(1)).toBeNull();
  });

  it("ignore la réponse d'un compte qui n'est plus relié", () => {
    database
      .prepare(
        "INSERT INTO guardian_image_consents (child_user_id, guardian_user_id, consent) VALUES (1, 4, 0)"
      )
      .run();
    expect(effectiveConsent(1)).toBe(1);
  });
});
