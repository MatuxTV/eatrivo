import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const RECIPES_SECTION_PATH = path.join(
  process.cwd(),
  "src/app/home/components/RecipesSection.tsx",
);
const HOMEPAGE_PATH = path.join(process.cwd(), "src/app/home/basic/HomePage.tsx");
const RECIPE_BROWSER_DIALOG_PATH = path.join(
  process.cwd(),
  "src/app/home/components/RecipeBrowserDialog.tsx",
);
const RECIPE_DETAIL_HERO_PATH = path.join(
  process.cwd(),
  "src/app/home/components/recipe-detail/RecipeDetailHero.tsx",
);

const recipesSection = readFileSync(RECIPES_SECTION_PATH, "utf8");
const homepage = readFileSync(HOMEPAGE_PATH, "utf8");
const recipeBrowserDialog = readFileSync(RECIPE_BROWSER_DIALOG_PATH, "utf8");
const recipeDetailHero = readFileSync(RECIPE_DETAIL_HERO_PATH, "utf8");

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

test("RecipesSection imports the recipe card components from ./recipes", () => {
  const importEnd = recipesSection.indexOf('from "./recipes"');
  assert.notEqual(importEnd, -1, "expected an import from ./recipes");
  const importStart = recipesSection.lastIndexOf("import", importEnd);
  const fullImport = recipesSection.slice(importStart, importEnd);

  for (const name of [
    "RecipeCard",
    "RecipeCardSkeleton",
    "TipOfDayCard",
    "RivoCustomRecipeButton",
    "RivoCustomRecipeCard",
  ]) {
    assert.ok(
      fullImport.includes(name),
      `expected RecipesSection.tsx to import ${name} from ./recipes`,
    );
  }
});

test("bookmark state is owned by HomePage and shared with every section", () => {
  assert.ok(
    !recipesSection.includes("useRecipeBookmarks("),
    "expected RecipesSection to receive bookmarks instead of calling the hook",
  );
  assert.ok(
    homepage.includes("useRecipeBookmarks()"),
    "expected HomePage to own the bookmark state",
  );
  assert.ok(
    countOccurrences(homepage, "bookmarks={bookmarks}") >= 3,
    "expected HomePage to pass bookmarks to recipes, profile and chat",
  );
  const chatCard = readFileSync(
    path.join(process.cwd(), "src/app/chat-with-rivo/components/RecipeCreationResultCard.tsx"),
    "utf8",
  );
  assert.ok(chatCard.includes("isRecipeBookmarked="), "expected the chat card to forward bookmark state");
  const profileBookmarks = readFileSync(
    path.join(process.cwd(), "src/app/home/components/profile/BookmarkedRecipesSection.tsx"),
    "utf8",
  );
  assert.ok(
    profileBookmarks.includes("isActive") && profileBookmarks.includes("silent"),
    "expected the profile bookmark list to reload silently when reopened",
  );
});

test("RecipesSection no longer references the removed pantry dashboard API", () => {
  for (const token of [
    "livePantrySummary",
    "liveAlmostCookableRecipes",
    "pantryDashboard",
    "almostCookable",
    "cookableSpotlightIndex",
    "NutritionGrid",
    "RecipeGridCardSkeleton",
  ]) {
    assert.equal(
      countOccurrences(recipesSection, token),
      0,
      `expected no ${token} in RecipesSection.tsx`,
    );
  }
});

test("RecipesSection renders the all-recipes title once", () => {
  assert.equal(
    countOccurrences(recipesSection, 't("basic.allRecipes.title")'),
    1,
    "expected exactly one basic.allRecipes.title usage",
  );
});

test("RecipesSection mounts exactly one RivoCustomRecipeExperience", () => {
  const matches = recipesSection.match(/<RivoCustomRecipeExperience(?![A-Za-z])/g) ?? [];
  assert.equal(
    matches.length,
    1,
    "expected exactly one RivoCustomRecipeExperience element",
  );
});

test("HomePage no longer passes the removed live pantry props", () => {
  for (const token of [
    "livePantrySummary=",
    "liveAlmostCookableRecipes=",
  ]) {
    assert.equal(
      countOccurrences(homepage, token),
      0,
      `expected no ${token} in HomePage.tsx`,
    );
  }
});

test("RecipesSection renders the cook-now section", () => {
  assert.ok(
    recipesSection.includes("<CookNowSection"),
    "expected RecipesSection.tsx to render <CookNowSection",
  );
});

test("HomePage passes liveCookableRecipes to RecipesSection", () => {
  assert.ok(
    homepage.includes("liveCookableRecipes="),
    "expected HomePage.tsx to pass liveCookableRecipes",
  );
});

test("RecipeBrowserDialog takes bookmark state from the page instead of loading it", () => {
  assert.equal(
    countOccurrences(recipeBrowserDialog, 'method: "GET"'),
    0,
    "expected no bookmark status GET in RecipeBrowserDialog.tsx",
  );
  for (const token of ["isRecipeBookmarked", "onBookmarkChange"]) {
    assert.ok(
      recipeBrowserDialog.includes(token),
      `expected RecipeBrowserDialog.tsx to support ${token}`,
    );
  }
  assert.ok(
    recipesSection.includes("isRecipeBookmarked={bookmarks.isBookmarked}"),
    "expected RecipesSection.tsx to pass the page bookmark state",
  );
});

test("RecipeDetailHero puts bookmark on the left and close on the right", () => {
  const closeButton = recipeDetailHero.slice(
    recipeDetailHero.indexOf("onClick={onClose}"),
    recipeDetailHero.indexOf("onClick={onClose}") + 200,
  );
  const bookmarkButton = recipeDetailHero.slice(
    recipeDetailHero.indexOf("onClick={onToggleBookmark}"),
    recipeDetailHero.indexOf("onClick={onToggleBookmark}") + 600,
  );
  assert.ok(closeButton.includes("right-4"), "expected close button on the right");
  assert.ok(bookmarkButton.includes("left-4"), "expected bookmark button on the left");
});

test("Rivo custom recipes open in the shared recipe sheet", () => {
  const rivo = readFileSync(
    path.join(process.cwd(), "src/app/home/components/RivoCustomRecipeExperience.tsx"),
    "utf8",
  );
  assert.ok(rivo.includes("<RecipeBrowserDialog"), "expected Rivo to render RecipeBrowserDialog");
  assert.ok(!rivo.includes("dialogDirection"), "expected the old Rivo result dialog to be gone");
  assert.ok(
    !/\/api\/recipes\/\$\{[^}]+\}\/bookmark`,\s*\{\s*method: "GET"/.test(rivo),
    "expected no bookmark status GET in Rivo",
  );
  assert.ok(
    recipesSection.includes("onBookmarkChange={bookmarks.setBookmarked}"),
    "expected RecipesSection to pass bookmark state to Rivo",
  );
});
