import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const HOMEPAGE_PATH = path.join(
  process.cwd(),
  "src/app/home/basic/HomePage.tsx",
);
const GLOBALS_CSS_PATH = path.join(process.cwd(), "src/app/globals.css");

const homepage = readFileSync(HOMEPAGE_PATH, "utf8");
const globalsCss = readFileSync(GLOBALS_CSS_PATH, "utf8");

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

test("SectionPane drops the JS enter-animation state", () => {
  for (const token of ["isEntering", "wasActiveRef", "requestAnimationFrame"]) {
    assert.equal(
      countOccurrences(homepage, token),
      0,
      `expected no ${token} in HomePage.tsx`,
    );
  }
});

test("SectionPane uses the CSS enter class exactly once", () => {
  assert.equal(
    countOccurrences(homepage, "section-pane-enter h-full"),
    1,
    "expected exactly one section-pane-enter h-full usage",
  );
});

test("SectionPane keeps the scroll restore refs", () => {
  assert.equal(
    countOccurrences(homepage, "savedScrollTopRef"),
    3,
    "expected savedScrollTopRef to appear 3 times",
  );
});

test("globals.css defines the section-pane-enter keyframes once", () => {
  assert.equal(
    countOccurrences(globalsCss, "@keyframes section-pane-enter"),
    1,
    "expected exactly one @keyframes section-pane-enter",
  );
});

test("globals.css defines the .section-pane-enter class once", () => {
  assert.equal(
    countOccurrences(globalsCss, ".section-pane-enter"),
    1,
    "expected exactly one .section-pane-enter rule",
  );
});

test("globals.css does not pin the animation with fill-mode/forwards", () => {
  assert.equal(
    countOccurrences(globalsCss, "animation-fill-mode"),
    0,
    "expected no animation-fill-mode",
  );
  assert.equal(
    countOccurrences(globalsCss, "forwards"),
    0,
    "expected no forwards fill",
  );
});

test("section-pane-enter keyframes only define a from block", () => {
  const start = globalsCss.indexOf("@keyframes section-pane-enter");
  assert.notEqual(start, -1, "keyframes block must exist");
  const block = globalsCss.slice(start, globalsCss.indexOf("}", start) + 1);
  assert.ok(block.includes("from"), "expected a from block");
  assert.ok(block.includes("opacity: 0"), "expected opacity: 0");
  assert.ok(block.includes("translateY(6px)"), "expected translateY(6px)");
  assert.ok(!block.includes("to {"), "expected no to block");
});

test("section-pane-enter keyframes sit after blob and before dark mode", () => {
  const blob = globalsCss.indexOf("@keyframes blob");
  const pane = globalsCss.indexOf("@keyframes section-pane-enter");
  const dark = globalsCss.indexOf("@media (prefers-color-scheme: dark)");
  assert.ok(blob !== -1 && pane !== -1 && dark !== -1, "anchors must exist");
  assert.ok(blob < pane, "keyframes must come after blob");
  assert.ok(pane < dark, "keyframes must come before dark mode");
});

test("section-pane-enter class lives inside the components layer", () => {
  const layer = globalsCss.indexOf("@layer components");
  const cls = globalsCss.indexOf(".section-pane-enter");
  assert.ok(layer !== -1 && cls !== -1, "anchors must exist");
  assert.ok(layer < cls, "class must be inside @layer components");
});
