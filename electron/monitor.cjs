// Global keyboard monitor: trigger words and very fast typing.
// Uses the native `uiohook-napi` module when installed; without it the app runs, just without detection.
// Only the last 60 typed characters are kept in memory and never stored or sent anywhere.

const { compile, findMatch } = require("./matcher.cjs");

let hook = null;
try {
  hook = require("uiohook-napi");
} catch {
  hook = null;
}

// Physical key → character. uiohook reports physical (US-named) keys; on German QWERTZ
// boards Y/Z are swapped and the umlaut keys sit where US punctuation is.
function buildKeyMap(layout) {
  const keys = hook?.UiohookKey || {};
  const map = new Map();
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") if (keys[letter] !== undefined) map.set(keys[letter], letter.toLowerCase());
  for (const digit of "0123456789") if (keys[digit] !== undefined) map.set(keys[digit], digit);
  if (keys.Space !== undefined) map.set(keys.Space, " ");
  if (keys.Period !== undefined) map.set(keys.Period, ".");
  if (keys.Comma !== undefined) map.set(keys.Comma, ",");
  if (layout === "de") {
    if (keys.Y !== undefined) map.set(keys.Y, "z");
    if (keys.Z !== undefined) map.set(keys.Z, "y");
    if (keys.Semicolon !== undefined) map.set(keys.Semicolon, "ö");
    if (keys.Quote !== undefined) map.set(keys.Quote, "ä");
    if (keys.BracketLeft !== undefined) map.set(keys.BracketLeft, "ü");
    if (keys.Minus !== undefined) map.set(keys.Minus, "ß");
    if (keys.Slash !== undefined) map.set(keys.Slash, "-");
  } else {
    if (keys.Minus !== undefined) map.set(keys.Minus, "-");
  }
  return map;
}

function createMonitor({ onTrigger, onStress }) {
  let words = [];
  let stress = false;
  let buffer = "";
  let keyMap = buildKeyMap("de");
  const stamps = [];
  let lastStress = -Infinity;

  function handleChar(character, at = Date.now()) {
    buffer = (buffer + character).slice(-60);
    const match = findMatch(words, buffer);
    if (match) {
      buffer = "";
      onTrigger(match);
    }
    if (!stress) return;
    stamps.push(at);
    if (stamps.length > 15) stamps.shift();
    if (stamps.length < 15) return;
    const average = (stamps.at(-1) - stamps[0]) / (stamps.length - 1);
    if (average < 60 && at - lastStress > 60000) { // < 60 ms per key, at most once a minute
      lastStress = at;
      stamps.length = 0;
      onStress();
    }
  }

  function start() {
    if (!hook) return false;
    hook.uIOhook.on("keydown", (event) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const character = keyMap.get(event.keycode);
      if (character) handleChar(character);
      else if (hook.UiohookKey && event.keycode === hook.UiohookKey.Backspace) buffer = buffer.slice(0, -1);
      else if (hook.UiohookKey && event.keycode === hook.UiohookKey.Enter) {
        handleChar(" "); // Enter ends a word – whole-word triggers are checked first
        buffer = "";
      }
    });
    hook.uIOhook.start();
    return true;
  }

  function stop() {
    try {
      hook?.uIOhook.stop();
    } catch {
      // already stopped
    }
  }

  function configure({ triggerWords = [], stressDetection = false, layout = "de" }) {
    words = compile(triggerWords.map((word) => String(word).toLowerCase()).filter(Boolean));
    stress = Boolean(stressDetection);
    keyMap = buildKeyMap(layout);
  }

  return { start, stop, configure, handleChar, available: () => Boolean(hook) };
}

module.exports = { createMonitor };
