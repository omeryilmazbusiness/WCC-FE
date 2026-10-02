import assert from "node:assert/strict";
import {
  DEFAULT_TIMING,
  TYPEWRITER_START,
  graphemes,
  stepTypewriter,
  visibleText,
  type TypewriterState,
} from "../src/shared/lib/typewriter.ts";

const WELCOME = "Welcome";
const AHLAN = "أهلاً وسهلاً";
const words = [graphemes(WELCOME), graphemes(AHLAN)];

// graphemes keep Arabic marks with their letter (لاً is not split from its tanween)
assert.equal(graphemes(AHLAN).join(""), AHLAN);
assert.ok(graphemes(AHLAN).length < AHLAN.length, "combining marks grouped");
assert.deepEqual(graphemes("👍🏽a"), ["👍🏽", "a"]);

// run one full cycle and record what is on screen
let s: TypewriterState = TYPEWRITER_START;
const shown: string[] = [];
const phases: string[] = [];
for (let i = 0; i < 200; i++) {
  const next = stepTypewriter(words, s, DEFAULT_TIMING);
  s = next.state;
  shown.push(visibleText(words, s));
  phases.push(s.phase);
  assert.ok(next.delay >= 0);
  if (s.word === 0 && s.phase === "typing" && i > 5) break;
}

// English is typed letter by letter, fully held, deleted to empty, then Arabic follows
assert.equal(shown[0], "W");
assert.ok(shown.includes(WELCOME));
const firstEmpty = shown.indexOf("", shown.indexOf(WELCOME));
assert.ok(firstEmpty > shown.indexOf(WELCOME), "English deleted before Arabic starts");
const arabicFull = shown.indexOf(AHLAN);
assert.ok(arabicFull > firstEmpty, "Arabic typed after English is gone");
assert.ok(shown.slice(firstEmpty, arabicFull).every((t) => AHLAN.startsWith(t)), "Arabic grows as a prefix");
assert.ok(!shown.some((t) => t.includes("W") && /[\u0600-\u06FF]/.test(t)), "never both words at once");
assert.equal(s.word, 0, "cycles back to English");

// the hold is the long beat
assert.equal(stepTypewriter(words, { word: 0, length: 7, phase: "holding" }, DEFAULT_TIMING).delay, DEFAULT_TIMING.holdMs);

// reduced motion: whole words swap without per-letter steps
let r: TypewriterState = TYPEWRITER_START;
r = stepTypewriter(words, r, DEFAULT_TIMING, true).state;
assert.equal(visibleText(words, r), WELCOME);
r = stepTypewriter(words, r, DEFAULT_TIMING, true).state; // holding -> deleting
r = stepTypewriter(words, r, DEFAULT_TIMING, true).state; // deleting -> pausing (empty)
r = stepTypewriter(words, r, DEFAULT_TIMING, true).state; // next word
r = stepTypewriter(words, r, DEFAULT_TIMING, true).state;
assert.equal(visibleText(words, r), AHLAN);

// empty input is safe
assert.equal(visibleText([], TYPEWRITER_START), "");
assert.equal(stepTypewriter([], TYPEWRITER_START, DEFAULT_TIMING).state.length, 0);

console.log("typewriter self-test OK");
