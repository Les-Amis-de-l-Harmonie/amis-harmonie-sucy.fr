// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { sendEmail } from "@/lib/email";
import { createNotificationStore } from "../store";
import { previewPresenceReminders, runScheduledPresenceReminders } from "../runner";

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const TODAY = "2099-06-05";
const NOW = "2099-06-05T08:00:00.000Z";
const originalDb = env.DB;
const originalApiKey = env.RESEND_API_KEY;
let database: DatabaseSync;
let fetchMock: ReturnType<typeof vi.fn>;
let parentId: number;
let childOneId: number;
let childTwoId: number;

function createD1Database(db: DatabaseSync) {
  return {
    batch(
      statements: Array<{ run(): Promise<{ meta: { changes: number; last_row_id: number } }> }>
    ) {
      return Promise.all(statements.map((statement) => statement.run()));
    },
    prepare(sql: string) {
      let values: Array<string | number | null> = [];
      const statement = {
        bind(...boundValues: Array<string | number | null>) {
          values = boundValues;
          return statement;
        },
        async first<T>() {
          return (db.prepare(sql).get(...values) as T | undefined) ?? null;
        },
        async all<T>() {
          return { results: db.prepare(sql).all(...values) as T[] };
        },
        async run() {
          const result = db.prepare(sql).run(...values);
          return {
            meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) },
          };
        },
      };
      return statement;
    },
  };
}

function addUser(email: string, kind: string, firstName: string, active = 1): number {
  const result = database
    .prepare("INSERT INTO users (email, role, kind, is_active) VALUES (?, 'MUSICIAN', ?, ?)")
    .run(email, kind, active);
  const userId = Number(result.lastInsertRowid);
  database
    .prepare("INSERT INTO musician_profiles (user_id, first_name, last_name) VALUES (?, ?, ?)")
    .run(userId, firstName, "Musicien");
  return userId;
}

function setMode(mode: string, testRecipient: string | null = null) {
  database
    .prepare(
      "UPDATE notification_settings SET presence_reminders_mode = ?, test_recipient = ? WHERE id = 1"
    )
    .run(mode, testRecipient);
}

function countRows(table: string): number {
  return Number(
    (database.prepare(`SELECT count(*) AS count FROM ${table}`).get() as { count: number }).count
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  const migrations = readdirSync("migrations")
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  for (const migration of migrations) {
    database.exec(readFileSync(`migrations/${migration}`, "utf8"));
  }
  const directId = addUser("musicien@example.test", "member", "Sam");
  parentId = addUser("parent@example.test", "guardian", "Aurélie");
  childOneId = addUser("sans-email+un@interne.amis-harmonie-sucy.fr", "managed", "Jules");
  childTwoId = addUser("sans-email+deux@interne.amis-harmonie-sucy.fr", "managed", "Emilie");
  const inactiveGuardianId = addUser("inactif@example.test", "guardian", "Inactif", 0);
  const reservedGuardianId = addUser(
    "sans-email+parent@interne.amis-harmonie-sucy.fr",
    "guardian",
    "Interne"
  );
  database
    .prepare(
      "INSERT INTO guardian_links (guardian_user_id, child_user_id, relation) VALUES (?, ?, ?)"
    )
    .run(parentId, childOneId, "mère");
  database
    .prepare(
      "INSERT INTO guardian_links (guardian_user_id, child_user_id, relation) VALUES (?, ?, ?)"
    )
    .run(parentId, childTwoId, "mère");
  database
    .prepare(
      "INSERT INTO guardian_links (guardian_user_id, child_user_id, relation) VALUES (?, ?, ?)"
    )
    .run(inactiveGuardianId, childOneId, "père");
  database
    .prepare(
      "INSERT INTO guardian_links (guardian_user_id, child_user_id, relation) VALUES (?, ?, ?)"
    )
    .run(reservedGuardianId, childTwoId, "tuteur");
  database.exec(`
    INSERT INTO events (title, date, time, location, response_deadline, presence_required)
      VALUES ('Concert du 10 juin', '2099-06-10', '20:00', 'Salle des fêtes', '2099-06-10', 1);
    INSERT INTO events (title, date, time, location, response_deadline, presence_required)
      VALUES ('Sortie du 6 juin', '2099-06-06', '09:30', 'Parc municipal', '2099-06-06', 1);
    INSERT INTO events (title, date, time, location, response_deadline, presence_required)
      VALUES ('Répétition du 20 juin', '2099-06-20', '14:00:00', 'Salle de répétition', '2099-06-18', 1);
    INSERT INTO events (title, date, time, location, response_deadline, presence_required)
      VALUES ('Date déjà répondue', '2099-06-22', '18:00', 'École de musique', '2099-06-22', 1);
    INSERT INTO events (title, date, presence_required)
      VALUES ('Date passée', '2099-06-04', 1);
    INSERT INTO events (title, date, presence_required)
      VALUES ('Sans réponse obligatoire', '2099-06-24', 0);
  `);
  const answeredEvent = database
    .prepare("SELECT id FROM events WHERE title = 'Date déjà répondue'")
    .get() as { id: number };
  database
    .prepare("INSERT INTO event_presences (event_id, user_id, status) VALUES (?, ?, 'present')")
    .run(answeredEvent.id, childOneId);
  void directId;
  Object.assign(env, { DB: createD1Database(database), RESEND_API_KEY: "test-resend-key" });
  fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ id: "resend-id" }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  database.close();
  Object.assign(env, { DB: originalDb, RESEND_API_KEY: originalApiKey });
  vi.unstubAllGlobals();
});

const sender = sendEmail;

describe("exécution sûre des rappels de présence", () => {
  it("ligne absente : mode off, seuls last_run_* sont initialisés et Resend n'est jamais appelé", async () => {
    database.prepare("DELETE FROM notification_settings WHERE id = 1").run();
    const store = createNotificationStore(env.DB);

    const result = await runScheduledPresenceReminders({
      db: store,
      today: TODAY,
      now: NOW,
      send: sender,
    });

    expect(result.mode).toBe("off");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(countRows("notification_log")).toBe(0);
    expect(
      database
        .prepare(
          `SELECT presence_reminders_mode, test_recipient, last_run_at, last_run_summary, updated_by
           FROM notification_settings WHERE id = 1`
        )
        .get()
    ).toMatchObject({
      presence_reminders_mode: "off",
      test_recipient: null,
      last_run_at: NOW,
      last_run_summary: "Désactivé : aucun e-mail envoyé.",
      updated_by: null,
    });
  });

  it("mode inconnu et mode test sans destinataire sûr retombent à off", async () => {
    const store = createNotificationStore(env.DB);
    for (const [mode, recipient] of [
      ["unexpected", "test@example.test"],
      ["test", null],
      ["test", "bad-address"],
      ["test", "sans-email+test@interne.amis-harmonie-sucy.fr"],
    ] as const) {
      setMode(mode, recipient);
      const result = await runScheduledPresenceReminders({
        db: store,
        today: TODAY,
        now: NOW,
        send: sender,
      });
      expect(result.mode).toBe("off");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(countRows("notification_log")).toBe(0);
    }
  });

  it("mode test envoie un unique récapitulatif au destinataire d'essai sans journal", async () => {
    setMode("test", "president@example.test");
    const result = await runScheduledPresenceReminders({
      db: createNotificationStore(env.DB),
      today: TODAY,
      now: NOW,
      send: sender,
    });

    expect(result.mode).toBe("test");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      to: string;
      subject: string;
      text: string;
    };
    expect(payload.to).toBe("president@example.test");
    expect(payload.subject).toContain("Essai des rappels");
    expect(payload.text).toContain("musicien@example.test");
    expect(payload.text).toContain("parent@example.test");
    expect(payload.text).toContain("Jules et Emilie");
    expect(countRows("notification_log")).toBe(0);
  });

  it("mode on réserve avant l'envoi et deux exécutions concurrentes ne doublent aucun courriel", async () => {
    setMode("on");
    const pendingObservedAtSend: number[] = [];
    fetchMock.mockImplementation(async () => {
      const row = database
        .prepare("SELECT count(*) AS count FROM notification_log WHERE status = 'pending'")
        .get() as { count: number };
      pendingObservedAtSend.push(row.count);
      return new Response(JSON.stringify({ id: `mail-${pendingObservedAtSend.length}` }), {
        status: 200,
      });
    });
    const store = createNotificationStore(env.DB);

    const results = await Promise.all([
      runScheduledPresenceReminders({ db: store, today: TODAY, now: NOW, send: sender }),
      runScheduledPresenceReminders({ db: store, today: TODAY, now: NOW, send: sender }),
    ]);

    expect(results.every((result) => result.mode === "on")).toBe(true);
    // Un groupe pour le musicien, un pour le parent ; l'autre exécution perd chaque claim.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const sentTo = fetchMock.mock.calls.map(
      (call) => (JSON.parse(String(call[1]?.body)) as { to: string }).to
    );
    expect(sentTo).not.toContain("sans-email+parent@interne.amis-harmonie-sucy.fr");
    expect(pendingObservedAtSend.every((count) => count > 0)).toBe(true);
    expect(countRows("notification_log")).toBe(4);
    expect(
      database.prepare("SELECT count(*) AS count FROM notification_log WHERE status = 'sent'").get()
    ).toEqual({ count: 4 });
    const timestamps = database
      .prepare("SELECT created_at, sent_at FROM notification_log WHERE status = 'sent'")
      .all() as Array<{ created_at: string; sent_at: string }>;
    expect(timestamps).toHaveLength(4);
    for (const timestamp of timestamps) {
      expect(timestamp.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      expect(timestamp.sent_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    }
  });

  it("ne crée aucun claim pour les dates seulement informatives", async () => {
    setMode("on");
    const result = await runScheduledPresenceReminders({
      db: createNotificationStore(env.DB),
      today: TODAY,
      now: NOW,
      send: vi.fn(async () => ({ ok: true as const, id: "sent" })),
    });
    const informationalEvents = database
      .prepare(
        "SELECT id FROM events WHERE title IN ('Répétition du 20 juin', 'Date déjà répondue')"
      )
      .all() as Array<{ id: number }>;

    expect(result.sent).toBe(2);
    expect(countRows("notification_log")).toBe(4);
    for (const event of informationalEvents) {
      expect(
        database
          .prepare("SELECT count(*) AS count FROM notification_log WHERE event_id = ?")
          .get(event.id)
      ).toEqual({ count: 0 });
    }
  });

  it("un parent de deux enfants reçoit un message avec les deux paliers et deux clés", async () => {
    const preview = await previewPresenceReminders(createNotificationStore(env.DB), TODAY);
    const parentItem = preview.items.find((item) => item.recipientEmail === "parent@example.test");

    expect(parentItem).toBeDefined();
    expect(
      preview.items.filter((item) => item.recipientEmail === "parent@example.test")
    ).toHaveLength(1);
    expect(parentItem?.subjectNames).toEqual(["Jules", "Emilie"]);
    expect(parentItem?.stages).toEqual([7, 2]);
    expect(parentItem?.text).toContain("Pour Jules");
    expect(parentItem?.text).toContain("Pour Emilie");
    expect(parentItem?.eventTitle).toContain("Concert du 10 juin");
    expect(parentItem?.eventTitle).toContain("Sortie du 6 juin");
    expect(parentItem?.text).toContain("Autres dates sans réponse");
    expect(parentItem?.text).toContain("Répétition du 20 juin");
    expect(parentItem?.text).toContain("Salle de répétition");
    expect(parentItem?.text).toContain("Date déjà répondue");
    expect(parentItem?.text).not.toContain("Date passée");
    expect(parentItem?.text).not.toContain("Sans réponse obligatoire");
    expect(parentItem?.text.match(/« Répétition du 20 juin »/g)).toHaveLength(2);
    expect(parentItem?.otherEventsCount).toBe(3);
    expect(parentItem?.html).toContain("Autres dates sans réponse");
    expect(parentItem?.text.match(/« Concert du 10 juin »/g)).toHaveLength(2);
    expect(preview.items.some((item) => item.recipientEmail === "inactif@example.test")).toBe(
      false
    );
    expect(
      preview.items.some((item) => item.recipientEmail.includes("@interne.amis-harmonie-sucy.fr"))
    ).toBe(false);
    expect(
      preview.items.some(
        (item) => item.recipientEmail === "sans-email+un@interne.amis-harmonie-sucy.fr"
      )
    ).toBe(false);
    expect(countRows("notification_log")).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("construit le palier 7 à J-5 même quand le journal est vide", async () => {
    const preview = await previewPresenceReminders(createNotificationStore(env.DB), TODAY);
    const direct = preview.items.find((item) => item.recipientEmail === "musicien@example.test");

    expect(direct?.stage).toBe(7);
    expect(direct?.stages).toEqual([7, 2]);
    expect(countRows("notification_log")).toBe(0);
  });

  it("place le destinataire musicien dans sa propre section et liste les dates sans réponse", async () => {
    const preview = await previewPresenceReminders(createNotificationStore(env.DB), TODAY);
    const direct = preview.items.find((item) => item.recipientEmail === "musicien@example.test");

    expect(direct?.text).toContain("Pour vous");
    expect(direct?.text).toContain("Répétition du 20 juin");
    expect(direct?.otherEventsCount).toBe(2);
    expect(direct?.html).toContain("Répétition du 20 juin");
    expect(countRows("notification_log")).toBe(0);
  });

  it("exclut les dates d'un musicien inactif dans la requête groupée", async () => {
    const inactiveUserId = addUser("inactif-musicien@example.test", "member", "Inactif", 0);
    const store = createNotificationStore(env.DB);

    const events = await store.getUnansweredUpcomingEvents([inactiveUserId, childOneId], TODAY);

    expect(events.some((event) => event.subjectUserId === inactiveUserId)).toBe(false);
    expect(events.some((event) => event.subjectUserId === childOneId)).toBe(true);
  });

  it("ne crée jamais de notification directe pour un enfant géré", async () => {
    const preview = await previewPresenceReminders(createNotificationStore(env.DB), TODAY);
    const recipientEmails = preview.items.map((item) => item.recipientEmail);
    expect(recipientEmails).not.toContain("sans-email+un@interne.amis-harmonie-sucy.fr");
    expect(recipientEmails).not.toContain("sans-email+deux@interne.amis-harmonie-sucy.fr");
    expect(recipientEmails).toContain("parent@example.test");
  });

  it("supprime les claims d'un envoi en échec pour autoriser un nouvel essai", async () => {
    setMode("on");
    const send = vi.fn(async () => ({ ok: false as const, error: "network" }));

    const result = await runScheduledPresenceReminders({
      db: createNotificationStore(env.DB),
      today: TODAY,
      now: NOW,
      send,
    });

    expect(result.sent).toBe(0);
    expect(send).toHaveBeenCalled();
    expect(countRows("notification_log")).toBe(0);
  });

  it("une clé Resend absente arrête le run, supprime le claim et conserve l'erreur au résumé", async () => {
    setMode("on");
    Object.assign(env, { RESEND_API_KEY: undefined });

    const result = await runScheduledPresenceReminders({
      db: createNotificationStore(env.DB),
      today: TODAY,
      now: NOW,
      send: sender,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.summary).toContain("missing_key");
    expect(countRows("notification_log")).toBe(0);
  });

  it.each(["http_401", "http_403", "http_500"])(
    "arrête le run sur %s et inclut la dernière erreur au résumé",
    async (error) => {
      setMode("on");
      const send = vi.fn(async () => ({ ok: false as const, error }));

      const result = await runScheduledPresenceReminders({
        db: createNotificationStore(env.DB),
        today: TODAY,
        now: NOW,
        send,
      });

      expect(send).toHaveBeenCalledTimes(1);
      expect(result.summary).toContain(error);
      expect(countRows("notification_log")).toBe(0);
    }
  );

  it("continue après HTTP 422, libère ce claim et conserve la dernière erreur", async () => {
    setMode("on");
    let sends = 0;
    const send = vi.fn(async () => {
      sends += 1;
      return sends === 1
        ? ({ ok: false as const, error: "http_422" } as const)
        : ({ ok: true as const, id: "sent" } as const);
    });

    const result = await runScheduledPresenceReminders({
      db: createNotificationStore(env.DB),
      today: TODAY,
      now: NOW,
      send,
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(result.sent).toBe(1);
    expect(result.summary).toContain("dernière erreur : http_422");
    expect(countRows("notification_log")).toBe(2);
    expect(
      database.prepare("SELECT count(*) AS count FROM notification_log WHERE status = 'sent'").get()
    ).toEqual({ count: 2 });
  });

  it("arrête la séquence au premier 429 et libère le claim échoué", async () => {
    setMode("on");
    const send = vi.fn(async () => ({ ok: false as const, error: "http_429" }));

    const result = await runScheduledPresenceReminders({
      db: createNotificationStore(env.DB),
      today: TODAY,
      now: NOW,
      send,
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(result.summary).toContain("http_429");
    expect(countRows("notification_log")).toBe(0);
  });

  it("plafonne à 30 messages par exécution", async () => {
    for (let index = 0; index < 31; index += 1) {
      addUser(`extra-${index}@example.test`, "member", `Musicien${index}`);
    }
    setMode("on");
    const send = vi.fn(async () => ({ ok: true as const, id: "sent" }));

    const result = await runScheduledPresenceReminders({
      db: createNotificationStore(env.DB),
      today: TODAY,
      now: NOW,
      send,
    });

    expect(result.capped).toBe(true);
    expect(result.sent).toBe(30);
    expect(send).toHaveBeenCalledTimes(30);
  });
});
