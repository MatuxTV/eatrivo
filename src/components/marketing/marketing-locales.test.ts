import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const MARKETING_DIR = path.join(ROOT, "src/components/marketing");
const LOCALES_DIR = path.join(ROOT, "locales");

const LOCALES = ["sk", "en"] as const;
type Locale = (typeof LOCALES)[number];

type NestedMessages = { [key: string]: NestedMessages | string };

/* -------------------------------------------------------------------------- */
/* Locale loading                                                              */
/* -------------------------------------------------------------------------- */

function isNestedMessages(value: unknown): value is NestedMessages {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readMarketingMessages(locale: Locale): NestedMessages {
  const file = path.join(LOCALES_DIR, `${locale}.json`);
  const parsed = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  const marketing = parsed.marketing;
  assert.ok(
    isNestedMessages(marketing),
    `${locale}.json: expected a "marketing" messages object`,
  );
  return marketing;
}

const messages: Record<Locale, NestedMessages> = {
  sk: readMarketingMessages("sk"),
  en: readMarketingMessages("en"),
};

/** Flatten a messages tree into sorted `a.b.c` leaf paths. */
function flattenKeys(node: NestedMessages, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    if (isNestedMessages(value)) keys.push(...flattenKeys(value, keyPath));
    else keys.push(keyPath);
  }
  return keys.sort();
}

function getLeaf(node: NestedMessages, keyPath: string): unknown {
  return keyPath
    .split(".")
    .reduce<unknown>(
      (acc, part) => (isNestedMessages(acc) ? acc[part] : undefined),
      node,
    );
}

/* -------------------------------------------------------------------------- */
/* Marketing source parsing                                                    */
/* -------------------------------------------------------------------------- */

type MarketingSource = { file: string; text: string };

const sources: MarketingSource[] = readdirSync(MARKETING_DIR)
  .filter((entry) => entry.endsWith(".tsx"))
  .sort()
  .map((entry) => ({
    file: `src/components/marketing/${entry}`,
    text: readFileSync(path.join(MARKETING_DIR, entry), "utf8"),
  }));

/** `const t = await getTranslations({ locale, namespace: "marketing.hero" })` */
const NAMESPACE_BINDING =
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*await\s+getTranslations\(\s*\{[^}]*?namespace\s*:\s*"([^"]*)"[^}]*\}\s*\)/g;

/** `ARRAY.map((param) =>`, `ARRAY.map(({ param, ... }) =>`, also filter/some/find. */
const MAP_CALL =
  /([A-Za-z_$][\w$]*)\.(?:map|flatMap|filter|some|find)\(\s*\(\s*(?:\{\s*([\w$][\w$,\s:]*?)\s*\}|([A-Za-z_$][\w$]*))/g;

/** The `[...]` literal that follows the `=` of a declaration, brackets balanced. */
function arrayLiteral(text: string, from: number): string | null {
  const start = text.indexOf("[", from);
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    // Skip string literals so brackets inside them do not unbalance the scan.
    if (char === '"' || char === "'" || char === "`") {
      for (i += 1; i < text.length && text[i] !== char; i += 1) {
        if (text[i] === "\\") i += 1;
      }
      continue;
    }

    if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

/**
 * Values of a top-level `const NAME = [...]` declaration: the `key: "..."` props
 * when the array holds objects, otherwise every string literal in it.
 */
function declarationValues(text: string, name: string): string[] {
  const declaration = new RegExp(
    `(?:const|let|var)\\s+${name}\\b\\s*(?::[^=]*)?=`,
  ).exec(text);
  if (!declaration) return [];

  const body = arrayLiteral(text, declaration.index);
  if (!body) return [];

  const keyed = [...body.matchAll(/\bkey\s*:\s*"([^"]*)"/g)].map((m) => m[1]);
  if (keyed.length > 0) return keyed;

  return [...body.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
}

/** The array whose callback binds `param`, at the closest `.map((param) => ...)` before `before`. */
function resolveMapArray(
  text: string,
  before: number,
  param: string,
): string | null {
  let arrayName: string | null = null;
  let bestIndex = -1;

  for (const match of text.matchAll(MAP_CALL)) {
    const index = match.index ?? 0;
    if (index >= before) break;

    const destructured = match[2];
    const name = destructured
      ? destructured.split(",")[0].split(":")[0].trim()
      : match[3];
    if (name !== param) continue;

    if (index > bestIndex) {
      bestIndex = index;
      arrayName = match[1];
    }
  }

  return arrayName;
}

/**
 * Candidate values for one `${...}` placeholder, e.g. the `key` values of the
 * array the placeholder is mapped over. Returns null when it cannot be resolved.
 */
function expandPlaceholder(
  source: MarketingSource,
  before: number,
  param: string,
): string[] | null {
  const arrayName = resolveMapArray(source.text, before, param);
  if (arrayName) {
    for (const candidate of sources) {
      const values = declarationValues(candidate.text, arrayName);
      if (values.length > 0) return values;
    }
  }

  // `t(titleKey)` style: literals assigned to that property anywhere in the file.
  const assigned = [
    ...source.text.matchAll(new RegExp(`\\b${param}\\s*:\\s*"([^"]*)"`, "g")),
  ].map((m) => m[1]);

  return assigned.length > 0 ? assigned : null;
}

type Usage = { file: string; path: string };
type ParseResult = { usages: Usage[]; skipped: string[] };

/**
 * Every `marketing.<...>` key path referenced by the marketing components, plus
 * the dynamic calls that could not be expanded.
 */
function parseMarketingUsages(): ParseResult {
  const usages: Usage[] = [];
  const skipped: string[] = [];

  for (const source of sources) {
    const bindings = [
      ...source.text.matchAll(NAMESPACE_BINDING),
    ].map((m) => ({
      index: m.index ?? 0,
      name: m[1],
      namespace: m[2],
    }));
    if (bindings.length === 0) continue;

    const record = (namespace: string, key: string) => {
      const prefix =
        namespace === "marketing" ? "" : `${namespace.replace(/^marketing\./, "")}.`;
      usages.push({ file: source.file, path: `${prefix}${key}` });
    };

    for (const name of new Set(bindings.map((binding) => binding.name))) {
      const callPattern = new RegExp(
        `\\b${name}\\(\\s*("[^"]*"|\`[^\`]*\`|[A-Za-z_$][\\w$]*(?:\\.[\\w$]+)*)`,
        "g",
      );

      for (const call of source.text.matchAll(callPattern)) {
        const index = call.index ?? 0;
        const namespace = bindings
          .filter((binding) => binding.name === name && binding.index < index)
          .pop()?.namespace;
        if (!namespace) continue;

        const argument = call[1];

        // Static key: t("titleLine1")
        if (argument.startsWith('"')) {
          record(namespace, argument.slice(1, -1));
          continue;
        }

        // Template key: t(`tags.${tag.key}`)
        if (argument.startsWith("`")) {
          const template = argument.slice(1, -1);
          const placeholder = /\$\{([^}]*)\}/.exec(template);

          if (!placeholder) {
            record(namespace, template);
            continue;
          }

          const [prefix, suffix] = template.split(/\$\{[^}]*\}/);
          const param = placeholder[1].trim().split(".")[0];
          const values = expandPlaceholder(source, index, param);

          if (!values) {
            skipped.push(`${source.file}: ${argument}`);
            continue;
          }

          for (const value of values) record(namespace, `${prefix}${value}${suffix}`);
          continue;
        }

        // Dynamic key: t(titleKey) / t(link.key)
        const param = argument.split(".")[0];
        const values = expandPlaceholder(source, index, param);
        if (!values) {
          skipped.push(`${source.file}: ${argument}`);
          continue;
        }

        for (const value of values) record(namespace, value);
      }
    }
  }

  return { usages, skipped };
}

const parsed = parseMarketingUsages();

/* -------------------------------------------------------------------------- */
/* 1. Locale parity                                                            */
/* -------------------------------------------------------------------------- */

test("marketing key paths are identical in sk.json and en.json", () => {
  const skKeys = flattenKeys(messages.sk);
  const enKeys = flattenKeys(messages.en);
  const skSet = new Set(skKeys);
  const enSet = new Set(enKeys);

  const missingInSk = enKeys.filter((key) => !skSet.has(key));
  const missingInEn = skKeys.filter((key) => !enSet.has(key));

  assert.equal(
    missingInSk.length,
    0,
    `en.json defines key paths missing from sk.json:\n  ${missingInSk.join("\n  ")}`,
  );
  assert.equal(
    missingInEn.length,
    0,
    `sk.json defines key paths missing from en.json:\n  ${missingInEn.join("\n  ")}`,
  );
});

for (const locale of LOCALES) {
  test(`every marketing leaf in ${locale}.json is a non-empty string`, () => {
    const invalid = flattenKeys(messages[locale]).filter((keyPath) => {
      const value = getLeaf(messages[locale], keyPath);
      return typeof value !== "string" || value.trim().length === 0;
    });

    assert.equal(
      invalid.length,
      0,
      `${locale}.json has empty or non-string leaves:\n  ${invalid.join("\n  ")}`,
    );
  });
}

/* -------------------------------------------------------------------------- */
/* 2. Keys used by the components exist                                        */
/* -------------------------------------------------------------------------- */

test("the parser resolves the known dynamic marketing keys", () => {
  const resolved = new Set(parsed.usages.map((usage) => usage.path));
  const expected = [
    ...["eggs", "tomatoes", "pepper", "onion", "feta", "spinach"].map(
      (key) => `hero.tags.${key}`,
    ),
    ...["eggs", "tomatoes", "pepper", "onion", "feta", "spinach"].map(
      (key) => `counter.ingredients.${key}`,
    ),
    ...["eggs", "tomatoes", "pepper", "onion", "feta", "spinach"].flatMap(
      (key) => [`fill.items.${key}.name`, `fill.items.${key}.qty`],
    ),
    ...["spinach", "feta", "tomatoes", "eggs"].flatMap((key) => [
      `expiry.rows.${key}.name`,
      `expiry.rows.${key}.qty`,
      `expiry.rows.${key}.expires`,
    ]),
  ];

  const missing = expected.filter((keyPath) => !resolved.has(keyPath));
  assert.equal(
    missing.length,
    0,
    `dynamic keys were not expanded:\n  ${missing.join("\n  ")}`,
  );
});

test("every marketing key used by a component exists in sk.json", () => {
  const known = new Set(flattenKeys(messages.sk));
  const missing = new Map<string, string[]>();

  for (const usage of parsed.usages) {
    if (known.has(usage.path)) continue;
    missing.set(usage.path, [
      ...(missing.get(usage.path) ?? []),
      usage.file,
    ]);
  }

  const report = [...missing.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([keyPath, files]) => `marketing.${keyPath} (${files.join(", ")})`);

  assert.equal(
    report.length,
    0,
    `keys used in components but missing from locales/sk.json:\n  ${report.join("\n  ")}`,
  );
});

test("every used marketing key is also present in en.json", () => {
  const known = new Set(flattenKeys(messages.en));
  const missing = [...new Set(parsed.usages.map((usage) => usage.path))].filter(
    (keyPath) => !known.has(keyPath),
  );

  assert.equal(
    missing.length,
    0,
    `keys used in components but missing from locales/en.json:\n  ${missing
      .sort()
      .map((keyPath) => `marketing.${keyPath}`)
      .join("\n  ")}`,
  );
});

test("marketing components only use keys under the marketing namespace", () => {
  const foreign = parsed.usages.filter(
    (usage) => usage.path.startsWith("landing.") || usage.path.startsWith("auth."),
  );

  assert.equal(
    foreign.length,
    0,
    `marketing components reference non-marketing keys:\n  ${foreign
      .map((usage) => `${usage.file}: ${usage.path}`)
      .join("\n  ")}`,
  );
});

/* -------------------------------------------------------------------------- */
/* 3. No invented proof                                                        */
/* -------------------------------------------------------------------------- */

test("marketing components do not reference removed landing proof", () => {
  const forbidden = [
    "landing.socialProof",
    "landing.testimonials",
    "src/components/landing",
  ];

  const offenders: string[] = [];
  for (const source of sources) {
    for (const token of forbidden) {
      if (source.text.includes(token)) offenders.push(`${source.file}: ${token}`);
    }
  }

  assert.equal(
    offenders.length,
    0,
    `forbidden references in the marketing components:\n  ${offenders.join("\n  ")}`,
  );
});

/* -------------------------------------------------------------------------- */
/* 4. Routing                                                                  */
/* -------------------------------------------------------------------------- */

test("the locale home page renders the marketing LandingPage", () => {
  const file = path.join(ROOT, "src/app/[locale]/page.tsx");
  const text = readFileSync(file, "utf8");

  assert.match(
    text,
    /import\s+LandingPage\s+from\s+"@\/components\/marketing\/LandingPage"/,
    "src/app/[locale]/page.tsx must import @/components/marketing/LandingPage",
  );
});

test("the locale sign-in page renders WelcomeAuthScreen", () => {
  const file = path.join(ROOT, "src/app/[locale]/signin/page.tsx");
  const text = readFileSync(file, "utf8");

  assert.match(
    text,
    /import\s+\{\s*WelcomeAuthScreen\s*\}\s+from\s+"@\/components\/auth\/WelcomeAuthScreen"/,
    "src/app/[locale]/signin/page.tsx must import WelcomeAuthScreen",
  );
  assert.match(
    text,
    /<WelcomeAuthScreen[\s/>]/,
    "src/app/[locale]/signin/page.tsx must render WelcomeAuthScreen",
  );
});
