// Compile les modèles d'e-mail MJML en modules TypeScript importables par le Worker.
// Le Worker ne peut pas exécuter mjml : on compile ici, et le résultat est commité.
// Usage : npm run emails:build

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import mjml2html from "mjml";

const emailsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/lib/free-events/emails"
);

const HEADER =
  "// Fichier généré, ne pas modifier : npm run emails:build\n" + "// Source : ./%SOURCE%\n";

/** Options identiques dans src/lib/__tests__/confirmation-email.test.ts (garde de synchronisation). */
async function compileMjml(source) {
  const { html, errors } = await mjml2html(source, { validationLevel: "strict" });
  if (errors && errors.length > 0) {
    throw new Error(errors.map((e) => e.formattedMessage ?? e.message).join("\n"));
  }
  return html;
}

function constantName(file) {
  return `${path
    .basename(file, ".mjml")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toUpperCase()}_HTML`;
}

const files = (await readdir(emailsDir)).filter((file) => file.endsWith(".mjml")).sort();

for (const file of files) {
  const source = await readFile(path.join(emailsDir, file), "utf8");
  const html = await compileMjml(source);
  const output =
    HEADER.replace("%SOURCE%", file) +
    `export const ${constantName(file)} = ${JSON.stringify(html)};\n`;
  const target = path.join(emailsDir, `${path.basename(file, ".mjml")}.html.ts`);
  await writeFile(target, output, "utf8");
  process.stdout.write(`${file} → ${path.basename(target)} (${html.length} octets)\n`);
}
