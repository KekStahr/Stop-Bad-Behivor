// Run with: node tests/test_triggers.mjs
// The keyboard monitor must catch disguised trigger words – and stay silent on normal text.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { TRIGGER_CATALOG } from "../gui/recovery.js";

const require = createRequire(import.meta.url);
const { createMonitor } = require("../electron/monitor.cjs");
const all = TRIGGER_CATALOG.flatMap((category) => category.words);

function typed(text) {
  const found = [];
  const monitor = createMonitor({ onTrigger: (word) => found.push(word), onStress: () => {} });
  monitor.configure({ triggerWords: all });
  for (const character of text.toLowerCase()) monitor.handleChar(character);
  monitor.handleChar(" "); // Enter at the end
  return found;
}

// everyday German and English – none of this may trigger
const NORMAL = `
Guten Morgen, ich habe heute einen Termin beim Zahnarzt und danach muss ich noch Ersatzteile kaufen.
Der Ansporn war groß, wir wollen anspornen statt abwinken. Jerome und Romeo kommen später, Emma auch.
Das Programm läuft, die Programmierung ist fertig. Kokosnuss, Kokosmilch und Bananen im Einkauf.
Ich habe einen Sportwagen gesehen, die Sporthalle und der Sportplatz waren voll.
Global denken, lokal handeln. That was a mistake, I take the stakeholders seriously.
Die Betonlinie am Rand, die Betreuung im Kindergarten, der Wettbewerb und die Wettervorhersage.
Wir fahren an die Nordsee, nach Malibu und nach Subway Station. Der Feigling hat Angst.
Ich trinke Wasser, Tee und Kaffee. Ich koche Nudeln mit Soße und esse Pfannkuchen und Waffeln.
Das Kabel hat einen Knick, der Schlauch einen Kink. Die Dominanz der Mannschaft war klar, dominant.
Die Sklaverei ist abgeschafft. Das Domino-Spiel macht Spaß. Spice Girls im Radio, Gewürze kaufen.
Ich brauche einen Grinder für Kaffee? Nein, eine Kaffeemühle. Wir mähen die Grasfläche.
Speedrun im Fernsehen, Speedboat am See. Die Pepperoni sind scharf. Schneeketten kaufen, Schneemann bauen.
Der Ice Age Film, ein Eisbecher im Sommer. Das Teilen von Fotos ist schön. Hans im Glück.
Ich habe Kopfschmerzen und nehme Ibuprofen. Mein Arzt hat Medikamente verschrieben.
Ich suche Hilfe: Entzug, Anonyme Alkoholiker, Suchtberatung, Rauchstopp, Nicorette, Naloxon, Liebeskummer, Einsamkeit.
Ich möchte aufhören zu rauchen und brauche einen Rückfallplan. Wie überstehe ich den Entzug?
Die Dominosteine zu Weihnachten, eine Benzolverbindung im Chemieunterricht, Benzoesäure.
Ich habe 3 Kinder und 2 Hunde. Wir treffen uns um 7 Uhr. Die Linie 4 fährt alle 10 Minuten.
Shorts im Sommer, Cookies im Browser löschen, Red Bull Racing in der Formel 1, der Rockstar auf der Bühne.
Ein Alternativer Weg, about you, wishlist, the kick-off. Der Turkey Run, die Türkei.
Wir gehen in die Kirche und in die Moschee, wir beten und lesen die Bibel und den Koran.
`;
assert.deepEqual(typed(NORMAL), [], "normal text triggered");

// disguised and normal triggers – each must be caught
const BAIT = [
  "pornhub", "p0rnhub", "p.o.r.n.h.u.b", "pornhub.com", "www.xvideos.com", "x-videos", "xhamster", "pooorno",
  "c4sino", "casiino", "caaasino", "online casino", "sportwetten", "bet365", "tipico schein", "stake.com", "stake casino",
  "k0ks kaufen", "koks kaufen", "koks ", "lsd ", "mdma ", "crystal meth", "bubatz kaufen",
  "wodka", "jägermeister", "elfbar", "fortnite", "tiktok", "temu", "lieferando", "tinder",
  "onlyfans", "0nlyfans", "fap ", "domina ", "erome.com",
];
for (const bait of BAIT) assert.ok(typed(`ich will ${bait}`).length > 0, `not caught: ${bait}`);

// whole-word triggers fire only when the word is complete
assert.deepEqual(typed("dominant"), []);
assert.deepEqual(typed("kokskohle"), []);
console.log(`ok – ${all.length} words, ${BAIT.length} disguised triggers caught, no false alarms`);

// the user's own words are found anywhere, even short ones ("stri" → stripchat), unless "=" asks for whole words
const own = (words, text) => {
  const found = [];
  const monitor = createMonitor({ onTrigger: (word) => found.push(word), onStress: () => {} });
  monitor.configure({ triggerWords: [...all, ...words], ownWords: words });
  for (const character of text) monitor.handleChar(character);
  monitor.handleChar(" ");
  return found;
};
assert.deepEqual(own(["stri"], "stripchat.com"), ["stri"]);
assert.deepEqual(own(["wolt"], "woltshop"), ["wolt"]);
assert.deepEqual(own(["=wolt"], "woltshop"), []);
assert.deepEqual(own(["=wolt"], "wolt bestellen"), ["wolt"]);
console.log("ok – own words match inside other words");
