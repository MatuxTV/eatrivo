import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCatalogNameAndAliasRows,
  planCatalogEntries,
  planCatalogParentLinks,
  resolveCatalogCanonicalName,
  type CatalogIngredientInput,
} from "./catalog-core";

function input(overrides: Partial<CatalogIngredientInput>): CatalogIngredientInput {
  return {
    specificKey: null,
    familyKey: null,
    canonicalName: null,
    names: [],
    ...overrides,
  };
}

// ── planCatalogEntries ──────────────────────────────────────────────────────

test("planCatalogEntries keys entries by their specific key and collects family keys", () => {
  const { entries, allKeys } = planCatalogEntries([
    input({ specificKey: "smoked-cheese", familyKey: "cheese" }),
    input({ familyKey: "salt" }),
  ]);

  assert.deepEqual(entries.map((entry) => entry.key), ["smoked-cheese", "salt"]);
  assert.deepEqual([...allKeys].sort(), ["cheese", "salt", "smoked-cheese"]);
});

test("planCatalogEntries drops ingredients without any key", () => {
  const { entries, allKeys } = planCatalogEntries([input({ canonicalName: "mystery" })]);

  assert.equal(entries.length, 0);
  assert.equal(allKeys.size, 0);
});

// ── resolveCatalogCanonicalName ─────────────────────────────────────────────

test("resolveCatalogCanonicalName prefers the recipe's canonical name", () => {
  const { entries } = planCatalogEntries([
    input({
      specificKey: "smoked-cheese",
      canonicalName: "smoked cheese",
      names: [{ locale: "en", name: "Smoked Cheddar" }],
    }),
  ]);

  assert.equal(resolveCatalogCanonicalName("smoked-cheese", entries), "smoked cheese");
});

test("resolveCatalogCanonicalName falls back to the English display name", () => {
  const { entries } = planCatalogEntries([
    input({
      specificKey: "smoked-cheese",
      names: [
        { locale: "sk", name: "údený syr" },
        { locale: "en", name: "smoked cheese" },
      ],
    }),
  ]);

  assert.equal(resolveCatalogCanonicalName("smoked-cheese", entries), "smoked cheese");
});

test("resolveCatalogCanonicalName humanizes the key when nothing else is known", () => {
  const { entries } = planCatalogEntries([
    input({ specificKey: "smoked-cheese", familyKey: "cheese", names: [{ locale: "sk", name: "údený syr" }] }),
  ]);

  assert.equal(resolveCatalogCanonicalName("smoked-cheese", entries), "smoked cheese");
  // Family-only keys have no entry of their own.
  assert.equal(resolveCatalogCanonicalName("cheese", entries), "cheese");
});

// ── planCatalogParentLinks ──────────────────────────────────────────────────

test("planCatalogParentLinks links a newly created ingredient to its recipe family", () => {
  const { entries } = planCatalogEntries([
    input({ specificKey: "smoked-cheese", familyKey: "cheese" }),
  ]);
  const idByKey = new Map([
    ["smoked-cheese", "id:smoked-cheese"],
    ["cheese", "id:cheese"],
  ]);

  const parents = planCatalogParentLinks(entries, new Set(["smoked-cheese"]), idByKey);

  assert.deepEqual([...parents], [["smoked-cheese", "id:cheese"]]);
});

test("planCatalogParentLinks never re-parents ingredients that already existed", () => {
  const { entries } = planCatalogEntries([
    input({ specificKey: "smoked-cheese", familyKey: "cheese" }),
  ]);
  const idByKey = new Map([
    ["smoked-cheese", "id:smoked-cheese"],
    ["cheese", "id:cheese"],
  ]);

  assert.equal(planCatalogParentLinks(entries, new Set(), idByKey).size, 0);
});

test("planCatalogParentLinks does not make a family its own parent", () => {
  const { entries } = planCatalogEntries([input({ specificKey: "cheese", familyKey: "cheese" })]);
  const idByKey = new Map([["cheese", "id:cheese"]]);

  assert.equal(planCatalogParentLinks(entries, new Set(["cheese"]), idByKey).size, 0);
});

test("planCatalogParentLinks derives the family from the key when the recipe gives none", () => {
  const { entries } = planCatalogEntries([input({ specificKey: "olive-oil" })]);
  const idByKey = new Map([
    ["olive-oil", "id:olive-oil"],
    ["oil", "id:oil"],
  ]);

  const parents = planCatalogParentLinks(entries, new Set(["olive-oil"]), idByKey);

  assert.equal(parents.get("olive-oil"), "id:oil");
});

test("planCatalogParentLinks skips a family that could not be created", () => {
  const { entries } = planCatalogEntries([
    input({ specificKey: "smoked-cheese", familyKey: "cheese" }),
  ]);
  const idByKey = new Map([["smoked-cheese", "id:smoked-cheese"]]);

  assert.equal(planCatalogParentLinks(entries, new Set(["smoked-cheese"]), idByKey).size, 0);
});

// ── buildCatalogNameAndAliasRows ────────────────────────────────────────────

test("buildCatalogNameAndAliasRows emits one trimmed name per locale entry", () => {
  const { entries } = planCatalogEntries([
    input({
      specificKey: "smoked-cheese",
      names: [
        { locale: "sk", name: "  údený syr " },
        { locale: "en", name: "smoked cheese" },
        { locale: "de", name: "   " },
      ],
    }),
  ]);

  const { nameRows } = buildCatalogNameAndAliasRows(
    entries,
    new Map([["smoked-cheese", "id:smoked-cheese"]]),
  );

  assert.deepEqual(nameRows, [
    { ingredientId: "id:smoked-cheese", locale: "sk", name: "údený syr" },
    { ingredientId: "id:smoked-cheese", locale: "en", name: "smoked cheese" },
  ]);
});

test("buildCatalogNameAndAliasRows adds locale-neutral key aliases and localized name aliases", () => {
  const { entries } = planCatalogEntries([
    input({ specificKey: "smoked-cheese", names: [{ locale: "sk", name: "Údený syr" }] }),
  ]);

  const { aliasRows } = buildCatalogNameAndAliasRows(
    entries,
    new Map([["smoked-cheese", "id:smoked-cheese"]]),
  );
  const has = (locale: string | null, alias: string) =>
    aliasRows.some((row) => row.locale === locale && row.alias === alias);

  assert.ok(has(null, "smoked cheese"));
  assert.ok(has("sk", "udeny syr"));
  assert.ok(aliasRows.every((row) => row.source === "recipe"));
});

test("buildCatalogNameAndAliasRows deduplicates aliases per locale across recipe rows", () => {
  const { entries } = planCatalogEntries([
    input({ specificKey: "basil", names: [{ locale: "sk", name: "bazalka" }] }),
    input({ specificKey: "basil", names: [{ locale: "sk", name: "Bazalka" }] }),
  ]);

  const { aliasRows } = buildCatalogNameAndAliasRows(entries, new Map([["basil", "id:basil"]]));
  const keys = aliasRows.map((row) => `${row.locale ?? "*"}:${row.alias}`);

  assert.equal(new Set(keys).size, keys.length);
  assert.equal(keys.filter((key) => key === "sk:bazalka").length, 1);
});

test("buildCatalogNameAndAliasRows skips entries whose ingredient id is unknown", () => {
  const { entries } = planCatalogEntries([
    input({ specificKey: "smoked-cheese", names: [{ locale: "sk", name: "údený syr" }] }),
  ]);

  const rows = buildCatalogNameAndAliasRows(entries, new Map());

  assert.deepEqual(rows, { nameRows: [], aliasRows: [] });
});
