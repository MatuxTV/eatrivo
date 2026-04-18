import test from "node:test";
import assert from "node:assert/strict";

import {
  formatAmountLabel,
  formatLocalizedAmountLabel,
  localizeAmountForDisplay,
  localizeStoredAmountLabel,
} from "./format";

test("formatAmountLabel keeps canonical storage values", () => {
  assert.equal(formatAmountLabel(2, "tbsp"), "2 tbsp");
  assert.equal(formatAmountLabel(2, "ks"), "2 ks");
});

test("formatLocalizedAmountLabel localizes pantry units for UI", () => {
  assert.equal(formatLocalizedAmountLabel(2, "tbsp", "sk"), "2 pl");
  assert.equal(formatLocalizedAmountLabel(2, "ks", "en"), "2 pc");
  assert.equal(formatLocalizedAmountLabel(2, "pc", "sk"), "2 ks");
  assert.equal(
    formatLocalizedAmountLabel(1.125, "tbsp", "sk", {
      maximumFractionDigits: 3,
    }),
    "1,125 pl",
  );
});

test("localizeStoredAmountLabel localizes stored amount labels at render time", () => {
  assert.equal(localizeStoredAmountLabel("2 tbsp", "sk"), "2 pl");
  assert.equal(localizeStoredAmountLabel("2 ks", "en"), "2 pc");
  assert.equal(localizeStoredAmountLabel("500 g", "sk"), "500 g");
  assert.equal(localizeStoredAmountLabel("2", "sk"), "2");
});

test("localizeAmountForDisplay prefers split fields over legacy stored label", () => {
  assert.equal(localizeAmountForDisplay("2", "tbsp", "500 g", "sk"), "2 pl");
  assert.equal(localizeAmountForDisplay(null, null, "2 ks", "en"), "2 pc");
});