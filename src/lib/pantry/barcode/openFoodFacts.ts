import type { ReceiptScanReviewItem } from "@/lib/pantry/receipt-scan-contracts";
import type { PantryBarcodeCatalogSource } from "@/lib/pantry/barcode/catalog";
import { guessFoodCategory, parseQuantity } from "@/lib/ingredients/units";

const OPEN_FOOD_FACTS_API_URL = "https://world.openfoodfacts.org/api/v2/product";
const OPEN_FOOD_FACTS_FIELDS = [
  "product_name",
  "product_name_en",
  "product_name_sk",
  "product_name_cs",
  "generic_name",
  "generic_name_en",
  "generic_name_sk",
  "generic_name_cs",
  "brands",
  "quantity",
  "categories",
  "categories_tags",
] as const;

export type PantryBarcodeLocale = "sk" | "en";

interface OpenFoodFactsProduct {
  product_name?: string;
  product_name_en?: string;
  product_name_sk?: string;
  product_name_cs?: string;
  generic_name?: string;
  generic_name_en?: string;
  generic_name_sk?: string;
  generic_name_cs?: string;
  brands?: string;
  quantity?: string;
  categories?: string;
  categories_tags?: string[];
}

interface OpenFoodFactsProductResponse {
  status?: number;
  product?: OpenFoodFactsProduct;
}

export interface BarcodeLookupResult {
  barcode: string;
  item: ReceiptScanReviewItem;
  vendor: string | null;
  warnings: string[];
  partial: boolean;
  source: PantryBarcodeCatalogSource | "fallback";
}

export function resolvePantryBarcodeLocale(
  headerValue: string | null | undefined,
): PantryBarcodeLocale {
  const normalized = (headerValue ?? "").toLowerCase();
  return normalized.includes("sk") ? "sk" : "en";
}

function getMessage(
  locale: PantryBarcodeLocale,
  key:
    | "notFound"
    | "providerUnavailable"
    | "missingName"
    | "missingQuantity"
    | "estimatedCategory"
    | "fallbackName",
  barcode: string,
): string {
  const messages = {
    sk: {
      notFound: `Produkt s čiarovým kódom ${barcode} sa nenašiel. Doplň ho ručne.`,
      providerUnavailable:
        "Katalóg produktov je momentálne nedostupný. Položku môžeš doplniť ručne.",
      missingName:
        "Produkt nemá použiteľný názov. Skontroluj ho pred uložením.",
      missingQuantity:
        "Nepodarilo sa spoľahlivo zistiť balenie alebo množstvo produktu.",
      estimatedCategory:
        "Kategória produktu bola len odhadnutá podľa názvu.",
      fallbackName: `Produkt z čiarového kódu ${barcode}`,
    },
    en: {
      notFound: `No product was found for barcode ${barcode}. You can fill it in manually.`,
      providerUnavailable:
        "The product catalog is temporarily unavailable. You can complete the item manually.",
      missingName:
        "The product has no usable name. Please review it before saving.",
      missingQuantity:
        "The package size or quantity could not be determined reliably.",
      estimatedCategory:
        "The product category was estimated from the product name.",
      fallbackName: `Barcode product ${barcode}`,
    },
  } as const;

  return messages[locale][key];
}

function buildFallbackItem(
  barcode: string,
  locale: PantryBarcodeLocale,
  warning: string,
): BarcodeLookupResult {
  return {
    barcode,
    item: {
      id: crypto.randomUUID(),
      name: getMessage(locale, "fallbackName", barcode),
      barcode,
      quantity: null,
      unit: null,
      category: null,
      expiryDate: null,
      confidence: null,
      source: "manual",
      needsReview: true,
    },
    vendor: null,
    warnings: [warning],
    partial: true,
    source: "fallback",
  };
}

function pickProductName(
  product: OpenFoodFactsProduct,
  locale: PantryBarcodeLocale,
): string | null {
  const candidates =
    locale === "sk"
      ? [
          product.product_name_sk,
          product.product_name_cs,
          product.product_name,
          product.generic_name_sk,
          product.generic_name_cs,
          product.generic_name,
          product.product_name_en,
        ]
      : [
          product.product_name_en,
          product.product_name,
          product.generic_name_en,
          product.generic_name,
          product.product_name_sk,
          product.product_name_cs,
        ];

  return (
    candidates.find(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    )?.trim() ?? null
  );
}

export async function lookupOpenFoodFactsBarcode(
  barcode: string,
  locale: PantryBarcodeLocale,
): Promise<BarcodeLookupResult> {
  try {
    const response = await fetch(
      `${OPEN_FOOD_FACTS_API_URL}/${barcode}.json?fields=${OPEN_FOOD_FACTS_FIELDS.join(",")}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "EatrivoBarcodeLookup/0.1",
        },
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) {
      return buildFallbackItem(
        barcode,
        locale,
        getMessage(locale, "providerUnavailable", barcode),
      );
    }

    const data = (await response.json()) as OpenFoodFactsProductResponse;
    if (data.status !== 1 || !data.product) {
      return buildFallbackItem(
        barcode,
        locale,
        getMessage(locale, "notFound", barcode),
      );
    }

    const productName = pickProductName(data.product, locale);
    if (!productName) {
      return buildFallbackItem(
        barcode,
        locale,
        getMessage(locale, "missingName", barcode),
      );
    }

    const parsedQuantity = data.product.quantity
      ? parseQuantity(data.product.quantity)
      : null;
    const categoryHint = [
      data.product.categories,
      ...(Array.isArray(data.product.categories_tags)
        ? data.product.categories_tags
        : []),
    ]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ");
    const category = guessFoodCategory(`${productName} ${categoryHint}`.trim());

    const warnings: string[] = [];
    if (!parsedQuantity) {
      warnings.push(getMessage(locale, "missingQuantity", barcode));
    }
    if (category === "other") {
      warnings.push(getMessage(locale, "estimatedCategory", barcode));
    }

    return {
      barcode,
      item: {
        id: crypto.randomUUID(),
        name: productName,
        barcode,
        quantity: parsedQuantity?.value ?? null,
        unit: parsedQuantity?.unit ?? null,
        category,
        expiryDate: null,
        confidence: parsedQuantity ? 0.94 : 0.82,
        source: "detected",
        needsReview: !parsedQuantity,
      },
      vendor:
        typeof data.product.brands === "string" && data.product.brands.trim().length > 0
          ? data.product.brands.trim()
          : null,
      warnings,
      partial: warnings.length > 0,
      source: "open_food_facts",
    };
  } catch {
    return buildFallbackItem(
      barcode,
      locale,
      getMessage(locale, "providerUnavailable", barcode),
    );
  }
}