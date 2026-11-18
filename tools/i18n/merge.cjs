// Joins the translated parts (gui/i18n/<lang>.partN.json) into gui/i18n/<lang>.json.
// Entries whose number placeholders ("#") don't match the German original are dropped –
// the app then shows the German text instead of a wrong number.
// Run: node tools/i18n/merge.cjs
const fs = require("node:fs");
const path = require("node:path");

const dir = path.join(__dirname, "..", "..", "gui", "i18n");
const parts = fs.readdirSync(dir).filter((file) => /^[a-z]{2}\.part\d+\.json$/.test(file));
const langs = [...new Set(parts.map((file) => file.slice(0, 2)))];
const count = (text) => (String(text).match(/#/g) || []).length;
for (const lang of langs) {
  const merged = {};
  let dropped = 0;
  for (const file of parts.filter((name) => name.startsWith(`${lang}.`)).sort()) {
    for (const [key, value] of Object.entries(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")))) {
      if (typeof value !== "string" || !value.trim() || count(value) !== count(key)) { dropped += 1; continue; }
      merged[key] = value;
    }
  }
  fs.writeFileSync(path.join(dir, `${lang}.json`), JSON.stringify(merged));
  console.log(lang, Object.keys(merged).length, "entries", dropped ? `(${dropped} dropped)` : "");
}
