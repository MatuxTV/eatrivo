import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.join(
  process.cwd(),
  "src/app/home/components/MobileNavigation.tsx",
);

const source = readFileSync(SOURCE_PATH, "utf8");

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

test("MobileNavigation keeps each tutorial anchor exactly once", () => {
  for (const anchor of ["nav-home", "nav-pantry", "nav-chat"]) {
    const literal = `data-tutorial-anchor="${anchor}"`;
    assert.equal(
      countOccurrences(source, literal),
      1,
      `expected exactly one ${literal}`,
    );
  }
});

test("MobileNavigation renders the frosted-glass island primitives", () => {
  for (const token of [
    "rounded-full",
    "backdrop-blur-xl",
    "max-w-[400px]",
    "env(safe-area-inset-bottom)",
    'layoutId="mobile-nav-island-active"',
    "useReducedMotion",
    "aria-current",
  ]) {
    assert.ok(source.includes(token), `expected island source to contain ${token}`);
  }
});

test("MobileNavigation does not use forbidden legacy styling", () => {
  for (const token of [
    "animate-ping",
    "transition-all",
    'mobile-nav-active"',
    "MOBILE_BOTTOM_NAV_HEIGHT_CLASS",
  ]) {
    assert.ok(
      !source.includes(token),
      `expected island source NOT to contain ${token}`,
    );
  }
});

test("MobileNavigation wires all five sections through handleSectionChange", () => {
  for (const section of [
    "home",
    "pantry",
    "chatWithRivo",
    "kitchenCounter",
    "profile",
  ]) {
    assert.ok(
      source.includes(`handleSectionChange("${section}")`),
      `expected a reachable ${section} section trigger`,
    );
  }
});
