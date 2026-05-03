"use client";

import { useState } from "react";
import { CheckCircle2, FileCode2, Loader2, Upload, WandSparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const recipePayloadExample = `{
  "recipes": [
    {
      "external_key": "high-protein-breakfast-bowl",
      "default_locale": "en",
      "category_key": "breakfast",
      "diet_tags": ["high-protein"],
      "restriction_flags": ["gluten-free"],
      "servings": 2,
      "prep_time_min": 10,
      "total_time_min": 15,
      "nutrition_per_serving": {
        "calories": 420,
        "protein_g": 32,
        "carbohydrates_g": 28,
        "fat_g": 18
      },
      "ingredients": [
        {
          "ingredient_key": "greek-yogurt",
          "ingredient_specific_key": null,
          "canonical_name": "Greek yogurt",
          "quantity": 250,
          "unit": "g",
          "optional": false,
          "sort_order": 0,
          "translations": {
            "en": { "display_name": "Greek yogurt" },
            "sk": { "display_name": "Grécky jogurt" }
          }
        }
      ],
      "translations": {
        "en": {
          "name": "High Protein Breakfast Bowl",
          "instructions": ["Mix everything together."],
          "notes": null,
          "serving_unit_label": "bowl",
          "category_label": "Breakfast"
        },
        "sk": {
          "name": "Proteínová raňajková miska",
          "instructions": ["Všetko spolu premiešaj."],
          "notes": null,
          "serving_unit_label": "miska",
          "category_label": "Raňajky"
        }
      },
      "meal_prep_friendly": true
    }
  ]
}`;

interface DryRunPreviewRow {
  recipe: {
    externalKey: string;
    categoryKey: string;
    defaultLocale: string;
    servings: number;
  };
  recipeIngredients: {
    canonicalName: string | null;
    ingredientKey: string | null;
    ingredientSpecificKey: string | null;
    quantity: string | null;
    unit: string | null;
    optional: boolean;
    sortOrder: number;
  }[];
}

interface RecipeImportResponse {
  success?: boolean;
  importedCount?: number;
  externalKeys?: string[];
  dryRun?: boolean;
  preview?: DryRunPreviewRow[];
  error?: string;
}

export default function RecipesTab() {
  const [jsonText, setJsonText] = useState(recipePayloadExample);
  const [isDryRunning, setIsDryRunning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastResult, setLastResult] = useState<RecipeImportResponse | null>(null);

  const handleSubmit = async (dryRun: boolean) => {
    if (!jsonText.trim()) {
      toast.error("Vlož recipe JSON payload.");
      return;
    }

    if (dryRun) {
      setIsDryRunning(true);
    } else {
      setIsImporting(true);
    }

    try {
      const response = await fetch("/api/admin/recipes/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jsonText, dryRun }),
      });

      const result = (await response.json()) as RecipeImportResponse;

      if (!response.ok) {
        throw new Error(result.error || "Recipe import failed.");
      }

      setLastResult(result);
      toast.success(
        dryRun
          ? `Dry run pripravil ${result.importedCount ?? 0} receptov.`
          : `Importovaných ${result.importedCount ?? 0} receptov.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Recipe import failed.";
      setLastResult({ error: message });
      toast.error(message);
    } finally {
      if (dryRun) {
        setIsDryRunning(false);
      } else {
        setIsImporting(false);
      }
    }
  };

  return (
    <div className="space-y-6">  
      <div className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
        <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Recipe JSON editor</h3>
              <p className="mt-1 text-sm text-slate-500">
                Inline editor pre import jedného alebo viacerých receptov v canonical formáte.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void handleSubmit(true)}
                disabled={isDryRunning || isImporting}
              >
                {isDryRunning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileCode2 className="mr-2 h-4 w-4" />
                )}
                Dry run
              </Button>
              <Button onClick={() => void handleSubmit(false)} disabled={isDryRunning || isImporting}>
                {isImporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Import to DB
              </Button>
            </div>
          </div>

          <Textarea
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            spellCheck={false}
            className="min-h-[28rem] resize-y font-mono text-xs leading-6"
          />
        </div>

        <div className="space-y-6">
    
          <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <h3 className="font-semibold text-slate-900">Last result</h3>
            </div>

            {!lastResult ? (
              <p className="mt-4 text-sm text-slate-500">
                Zatiaľ bez výsledku. Spusť dry run alebo ostrý import.
              </p>
            ) : lastResult.error ? (
              <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                {lastResult.error}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-sm font-medium text-emerald-800">
                    {lastResult.dryRun ? "Dry run OK" : "Import OK"}
                  </p>
                  <p className="mt-1 text-sm text-emerald-700">
                    {lastResult.importedCount ?? 0} receptov pripravených alebo importovaných.
                  </p>
                </div>

                {lastResult.externalKeys && lastResult.externalKeys.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      External keys
                    </p>
                    <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
                      {lastResult.externalKeys.map((key) => (
                        <div key={key} className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                          {key}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {lastResult.dryRun && lastResult.preview && lastResult.preview.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Preview
                    </p>
                    <div className="mt-2 space-y-3">
                      {lastResult.preview.map((row) => (
                        <div key={row.recipe.externalKey} className="rounded-xl border border-slate-200 p-3">
                          <p className="text-sm font-medium text-slate-900">{row.recipe.externalKey}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {row.recipe.categoryKey} · {row.recipe.defaultLocale} · {row.recipe.servings} servings
                          </p>
                          <div className="mt-3 space-y-2">
                            {row.recipeIngredients.map((ingredient, index) => (
                              <div key={`${row.recipe.externalKey}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                {(ingredient.canonicalName || ingredient.ingredientKey || "ingredient")}
                                {ingredient.quantity ? ` · ${ingredient.quantity}` : ""}
                                {ingredient.unit ? ` ${ingredient.unit}` : ""}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}