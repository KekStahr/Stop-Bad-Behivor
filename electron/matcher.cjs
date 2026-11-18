// Trigger matching with tolerance for leetspeak, separators and stretched letters
// (p0rnhub, p.o.r.n.h.u.b, x-videos, caaasino, k0ks kaufen) – without hitting normal words.
//
// Two modes per word:
//  • substring: unique words/brands (pornhub, sportwetten). Found anywhere, also in URLs.
//  • whole word: short or ambiguous words (lsd, fap, "=domina"). Only when typed as a word,
//    i.e. after a space, dot, comma or Enter – so "Jerome" never triggers "erome".
// A leading "=" in the list forces whole-word mode.

const LETTER = "a-zäöüß";
const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s" };

function normalize(text) {
  let value = String(text).toLowerCase();
  // digits/symbols next to letters are leetspeak (two passes for "p00rn")
  for (let pass = 0; pass < 2; pass += 1) {
    value = value.replace(new RegExp(`(?<=[${LETTER}])[013457@$]|[013457@$](?=[${LETTER}])`, "g"), (character) => LEET[character]);
  }
  return value.replace(/([a-zäöüß])\1{2,}/g, "$1"); // caaasino → casino
}
// p.o.r.n.h.u.b / x-videos / bet_365 → joined; spaces stay word gaps
const joined = (value) => value.replace(/[.\-_*,+~'´`|/\\]/g, "");
// every non-letter becomes a single space, for whole-word checks
const spaced = (value) => ` ${value.replace(new RegExp(`[^${LETTER}0-9]+`, "g"), " ")}`;
// casiino → casino (only used for longer words, where it cannot create accidental hits)
const single = (value) => value.replace(/([a-zäöüß])\1+/g, "$1");

// own: the user's own words – they are found anywhere (also "stri" in "stripchat"), since the user
// chose them on purpose; only catalog words that are short need whole-word mode.
function compile(words, own = new Set()) {
  return words.map((raw) => {
    const forced = String(raw).startsWith("=");
    const word = normalize(forced ? String(raw).slice(1) : raw).trim();
    const plain = word.replace(new RegExp(`[^${LETTER}0-9 ]`, "g"), "");
    const whole = forced || (!own.has(String(raw)) && plain.replace(/ /g, "").length <= 4);
    return {
      raw: forced ? String(raw).slice(1) : String(raw),
      whole,
      joined: joined(word),
      single: single(joined(word)),
      spaced: `${spaced(word).trimEnd()} `,
    };
  }).filter((item) => item.joined.trim().length >= 2);
}

function findMatch(compiled, text) {
  const value = normalize(text);
  const joinedText = joined(value);
  const singleText = single(joinedText);
  const spacedText = spaced(value);
  for (const item of compiled) {
    if (item.whole) {
      if (spacedText.includes(item.spaced)) return item.raw;
    } else if (joinedText.includes(item.joined) || (item.single.length >= 6 && singleText.includes(item.single))) {
      return item.raw;
    }
  }
  return null;
}

module.exports = { compile, findMatch, normalize };
