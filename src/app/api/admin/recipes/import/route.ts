import { NextResponse } from "next/server";

import { isAuthError, requireAdminAuth } from "@/lib/auth/adminAuth";
import {
  persistPreparedRecipeImport,
  prepareRecipeImportFromObject,
} from "@/lib/recipes/recipe-importer";

interface RecipeImportRequest {
  jsonText: string;
  dryRun?: boolean;
  uploadedImageKey?: string | null;
}

function applyUploadedImageKey(input: unknown, uploadedImageKey?: string | null) {
  if (!uploadedImageKey) {
    return input;
  }

  if (!input || typeof input !== "object" || !("recipes" in input)) {
    throw new Error("Recipe import payload must be an object with a recipes array.");
  }

  const payload = input as { recipes?: Array<Record<string, unknown>> };
  if (!Array.isArray(payload.recipes)) {
    throw new Error("Recipe import payload has invalid recipes array.");
  }

  if (payload.recipes.length !== 1) {
    throw new Error("Photo upload is currently supported only when importing a single recipe.");
  }

  return {
    ...payload,
    recipes: payload.recipes.map((recipe) => ({
      ...recipe,
      image_key: uploadedImageKey,
    })),
  };
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(["admin"]);
    if (isAuthError(authResult)) {
      return authResult;
    }

    const body = (await request.json()) as RecipeImportRequest;
    const jsonText = body.jsonText?.trim();

    if (!jsonText) {
      return NextResponse.json(
        { error: "Missing required field: jsonText" },
        { status: 400 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText) as unknown;
    } catch {
      return NextResponse.json(
        { error: "Recipe import payload is not valid JSON." },
        { status: 400 },
      );
    }

    const prepared = prepareRecipeImportFromObject(
      applyUploadedImageKey(parsed, body.uploadedImageKey?.trim() || null),
    );

    if (body.dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        importedCount: prepared.rows.length,
        externalKeys: prepared.rows.map((row) => row.recipe.externalKey),
        preview: prepared.preview,
      });
    }

    const result = await persistPreparedRecipeImport(prepared.rows);

    return NextResponse.json({
      success: true,
      importedCount: result.importedCount,
      externalKeys: result.externalKeys,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Recipe import failed.",
      },
      { status: 400 },
    );
  }
}