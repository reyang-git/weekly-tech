import fs from "node:fs";
import path from "node:path";

const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error("OPENAI_API_KEY is not set");

const outDir = path.join(process.cwd(), "briefs");
fs.mkdirSync(outDir, { recursive: true });

const now = new Date();
const yyyy = now.getUTCFullYear();
const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
const dd = String(now.getUTCDate()).padStart(2, "0");
const archiveName = `${yyyy}-${mm}-${dd}.json`;

const digest = {
  generatedAt: now.toISOString(),
  weekOf: `${yyyy}-${mm}-${dd}`,
  lead: "Placeholder brief. Next step: wire RSS + OpenAI summarisation.",
  themes: ["Theme 1", "Theme 2", "Theme 3"],
  stories: []
};

fs.writeFileSync(path.join(outDir, "latest.json"), JSON.stringify(digest, null, 2));
fs.writeFileSync(path.join(outDir, archiveName), JSON.stringify(digest, null, 2));

console.log("Wrote briefs/latest.json and", archiveName);