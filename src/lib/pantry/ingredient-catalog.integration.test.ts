// DB integration tests for the ingredient catalog and private user
// ingredients. They write to the database in DATABASE_URL, so they only run
// when explicitly enabled:
//
//   npm run test:db
//
// Every row uses a `zz-test-` key or a random owner id and is deleted in
// `after`, even when a test fails.
import test, { after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const enabled = process.env.RUN_DB_INTEGRATION_TESTS === "1";
const userId = randomUUID();
const PREFIX = "zz-test-";

async function load() {
  const [
    { db },
    schema,
    drizzle,
    catalog,
    userIngredients,
    resolution,
  ] = await Promise.all([
    import("@/index"),
    import("@/db/schema"),
    import("drizzle-orm"),
    import("@/lib/ingredients/catalog"),
    import("@/lib/pantry/user-ingredients"),
    import("@/lib/pantry/ingredient-resolution"),
  ]);
  return { db, schema, drizzle, catalog, userIngredients, resolution };
}

describe("ingredient catalog (DB)", { skip: !enabled && "set RUN_DB_INTEGRATION_TESTS=1" }, () => {
  after(async () => {
    const { db, schema, drizzle } = await load();
    await db
      .delete(schema.ingredients)
      .where(drizzle.eq(schema.ingredients.ownerUserId, userId));
    await db
      .delete(schema.ingredients)
      .where(drizzle.like(schema.ingredients.key, `${PREFIX}%`));
  });

  test("ensureCatalogIngredients creates the ingredient, its family, names and aliases", async () => {
    const { db, schema, drizzle, catalog, resolution } = await load();

    const idByKey = await catalog.ensureCatalogIngredients([
      {
        specificKey: `${PREFIX}smoked-cheese`,
        familyKey: `${PREFIX}cheese`,
        canonicalName: null,
        names: [
          { locale: "en", name: "zz test smoked cheese" },
          { locale: "sk", name: "zz test údený syr" },
        ],
      },
    ]);

    const specificId = idByKey.get(`${PREFIX}smoked-cheese`);
    const familyId = idByKey.get(`${PREFIX}cheese`);
    assert.ok(specificId && familyId);

    const [specific] = await db
      .select()
      .from(schema.ingredients)
      .where(drizzle.eq(schema.ingredients.id, specificId));
    assert.equal(specific.parentId, familyId);
    assert.equal(specific.ownerUserId, null);
    assert.equal(specific.reviewState, "trusted");
    assert.equal(specific.source, "recipe");
    assert.equal(specific.canonicalName, "zz test smoked cheese");

    const names = await db
      .select()
      .from(schema.ingredientNames)
      .where(drizzle.eq(schema.ingredientNames.ingredientId, specificId));
    assert.deepEqual(
      names.map((row) => `${row.locale}:${row.name}`).sort(),
      ["en:zz test smoked cheese", "sk:zz test údený syr"],
    );

    // The new ingredient is immediately resolvable from a pantry name.
    const index = await resolution.loadIngredientAliasIndex("sk");
    const resolved = resolution.resolvePantryIngredientIdentity("zz test údený syr", "sk", index);
    assert.equal(resolved.ingredientSpecificKey, `${PREFIX}smoked-cheese`);
    // The family comes from parent_id, not from the key's wording ("cheese").
    assert.equal(resolved.ingredientKey, `${PREFIX}cheese`);
  });

  test("ensureCatalogIngredients is idempotent and only fills missing names", async () => {
    const { db, schema, drizzle, catalog } = await load();

    const first = await catalog.ensureCatalogIngredients([
      {
        specificKey: `${PREFIX}salmon`,
        familyKey: null,
        canonicalName: "zz test salmon",
        names: [{ locale: "en", name: "zz test salmon" }],
      },
    ]);
    const second = await catalog.ensureCatalogIngredients([
      {
        specificKey: `${PREFIX}salmon`,
        familyKey: null,
        canonicalName: "zz test salmon",
        names: [
          { locale: "en", name: "zz test renamed salmon" },
          { locale: "sk", name: "zz test losos" },
        ],
      },
    ]);

    const id = first.get(`${PREFIX}salmon`);
    assert.equal(second.get(`${PREFIX}salmon`), id);

    const names = await db
      .select()
      .from(schema.ingredientNames)
      .where(drizzle.eq(schema.ingredientNames.ingredientId, id!));
    assert.deepEqual(
      names.map((row) => `${row.locale}:${row.name}`).sort(),
      ["en:zz test salmon", "sk:zz test losos"],
    );
  });

  test("a private ingredient is renamed, deduplicated and still resolvable by every learned name", async () => {
    const { db, schema, drizzle, userIngredients, resolution } = await load();

    const first = await userIngredients.ensureUserIngredient({
      userId,
      locale: "sk",
      rawName: "zztestchlieb",
    });
    assert.ok(first?.created);

    await userIngredients.rekeyPrivateIngredient({
      ingredientId: first.id,
      key: `${PREFIX}bread`,
      familyKey: `${PREFIX}bread`,
    });

    const duplicate = await userIngredients.ensureUserIngredient({
      userId,
      locale: "sk",
      rawName: "zztestchleba",
    });
    assert.ok(duplicate?.created);

    await userIngredients.mergePrivateIngredient({
      privateIngredientId: duplicate.id,
      target: { id: first.id, key: `${PREFIX}bread`, familyKey: `${PREFIX}bread` },
      userId,
      locale: "sk",
      learnedNames: ["zztestchleba", "zz test chlebík"],
    });

    const remaining = await db
      .select()
      .from(schema.ingredients)
      .where(drizzle.eq(schema.ingredients.ownerUserId, userId));
    assert.deepEqual(remaining.map((row) => row.key), [`${PREFIX}bread`]);

    const { index, privateIdByKey } = await resolution.loadUserIngredientAliasIndex(
      "sk",
      userId,
    );
    assert.equal(privateIdByKey.get(`${PREFIX}bread`), first.id);
    for (const name of ["zztestchlieb", "zztestchleba", "zz test chlebík"]) {
      const resolved = resolution.resolvePantryIngredientIdentity(name, "sk", index);
      assert.equal(resolved.ingredientSpecificKey, `${PREFIX}bread`, name);
    }

    // Another user never sees these private aliases.
    const other = await resolution.loadUserIngredientAliasIndex("sk", randomUUID());
    assert.equal(
      resolution.resolvePantryIngredientIdentity("zztestchleba", "sk", other.index)
        .ingredientSpecificKey,
      null,
    );
  });

  test("merging into a global ingredient keeps the user's alias pointing at it", async () => {
    const { db, schema, drizzle, catalog, userIngredients, resolution } = await load();

    const globalIds = await catalog.ensureCatalogIngredients([
      {
        specificKey: `${PREFIX}butter`,
        familyKey: null,
        canonicalName: "zz test butter",
        names: [{ locale: "sk", name: "zz test maslo" }],
      },
    ]);
    const globalId = globalIds.get(`${PREFIX}butter`)!;

    const privateIngredient = await userIngredients.ensureUserIngredient({
      userId,
      locale: "sk",
      rawName: "zztestmaslicko",
    });
    assert.ok(privateIngredient);

    await userIngredients.mergePrivateIngredient({
      privateIngredientId: privateIngredient.id,
      target: { id: globalId, key: `${PREFIX}butter`, familyKey: `${PREFIX}butter` },
      userId,
      locale: "sk",
      learnedNames: ["zztestmaslicko"],
    });

    const deleted = await db
      .select()
      .from(schema.ingredients)
      .where(drizzle.eq(schema.ingredients.id, privateIngredient.id));
    assert.equal(deleted.length, 0);

    const aliases = await db
      .select()
      .from(schema.ingredientAliases)
      .where(
        drizzle.and(
          drizzle.eq(schema.ingredientAliases.ingredientId, globalId),
          drizzle.eq(schema.ingredientAliases.ownerUserId, userId),
        ),
      );
    assert.ok(aliases.some((row) => row.alias === "zztestmaslicko"));

    const { index, privateIdByKey } = await resolution.loadUserIngredientAliasIndex(
      "sk",
      userId,
    );
    const resolved = resolution.resolvePantryIngredientIdentity("zztestmaslicko", "sk", index);
    assert.equal(resolved.ingredientSpecificKey, `${PREFIX}butter`);
    assert.equal(privateIdByKey.has(`${PREFIX}butter`), false);

    const graph = await resolution.loadIngredientGraph("en");
    assert.equal(graph.idByKey.get(`${PREFIX}butter`), globalId);
  });
});
