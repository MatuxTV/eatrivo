import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { isDesktopUserAgent } from "./device";

/* -------------------------------------------------------------------------- */
/* User-agent fixtures                                                         */
/* -------------------------------------------------------------------------- */

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

const ANDROID_PHONE =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

const ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const WINDOWS_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// iPadOS Safari reports a Macintosh UA on purpose — the client fixes it later.
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";

/* -------------------------------------------------------------------------- */
/* isDesktopUserAgent                                                          */
/* -------------------------------------------------------------------------- */

test("iPhone Safari with deviceType mobile is not desktop", () => {
  assert.equal(isDesktopUserAgent(IPHONE_SAFARI, { deviceType: "mobile" }), false);
});

test("Android Chrome phone with deviceType mobile is not desktop", () => {
  assert.equal(isDesktopUserAgent(ANDROID_PHONE, { deviceType: "mobile" }), false);
});

test("Android tablet with deviceType tablet is not desktop", () => {
  assert.equal(isDesktopUserAgent(ANDROID_TABLET, { deviceType: "tablet" }), false);
});

test("Windows Chrome without deviceType is desktop", () => {
  assert.equal(isDesktopUserAgent(WINDOWS_CHROME, {}), true);
});

test("macOS Safari without deviceType is desktop (iPadOS is fixed client-side)", () => {
  assert.equal(isDesktopUserAgent(MAC_SAFARI, {}), true);
});

test("a desktop UA flagged as a bot is not desktop", () => {
  assert.equal(isDesktopUserAgent(WINDOWS_CHROME, { isBot: true }), false);
  assert.equal(isDesktopUserAgent(MAC_SAFARI, { isBot: true }), false);
});

test("desktop UA with mobileHint ?1 is not desktop, ?0 is desktop", () => {
  assert.equal(isDesktopUserAgent(WINDOWS_CHROME, { mobileHint: "?1" }), false);
  assert.equal(isDesktopUserAgent(WINDOWS_CHROME, { mobileHint: "?0" }), true);
});

test("desktop UA with deviceCookie touch is not desktop, other is desktop", () => {
  assert.equal(isDesktopUserAgent(WINDOWS_CHROME, { deviceCookie: "touch" }), false);
  assert.equal(isDesktopUserAgent(WINDOWS_CHROME, { deviceCookie: "other" }), true);
});

test("an empty UA is never treated as desktop", () => {
  assert.equal(isDesktopUserAgent("", {}), false);
});

/* -------------------------------------------------------------------------- */
/* middleware wiring (source-level)                                            */
/* -------------------------------------------------------------------------- */

const middlewarePath = path.join(process.cwd(), "middleware.ts");
const middlewareSource = readFileSync(middlewarePath, "utf8");

test("middleware imports isDesktopRequest from ./src/lib/device", () => {
  assert.match(
    middlewareSource,
    /import\s*\{[^}]*\bisDesktopRequest\b[^}]*\}\s*from\s*"\.\/src\/lib\/device"/,
    "middleware.ts must import isDesktopRequest from ./src/lib/device",
  );
});

test("middleware calls isDesktopRequest(req) at least twice", () => {
  const calls = [...middlewareSource.matchAll(/isDesktopRequest\s*\(\s*req\s*\)/g)];
  assert.ok(
    calls.length >= 2,
    `expected isDesktopRequest(req) at least twice, found ${calls.length}`,
  );
});

test("middleware checks hasAdminRole alongside the desktop gate", () => {
  const gateBlocks = middlewareSource.matchAll(
    /isGated\([^)]*\)[\s\S]{0,200}?hasAdminRole\([^)]*\)[\s\S]{0,200}?isDesktopRequest\(req\)/g,
  );
  assert.ok(
    [...gateBlocks].length >= 1,
    "middleware.ts must check hasAdminRole(...) together with isDesktopRequest(req) inside the gate",
  );
});

test('middleware excludes "/admin" inside isGated', () => {
  const isGated = /function\s+isGated\s*\([^)]*\)\s*\{([\s\S]*?)\}/.exec(
    middlewareSource,
  );
  assert.ok(isGated, "middleware.ts must define isGated()");
  assert.match(
    isGated![1],
    /"\/admin"/,
    'isGated must exclude the "/admin" route',
  );
});

test("middleware still skips /api/stripe/webhook", () => {
  assert.match(
    middlewareSource,
    /\/api\/stripe\/webhook/,
    "middleware.ts must keep the /api/stripe/webhook skip",
  );
});
