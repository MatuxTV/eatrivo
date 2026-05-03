import { NextResponse } from "next/server";

import { isAuthError, requireAdminAuth } from "@/lib/auth/adminAuth";
import {
  importRecipesFromText,
  prepareRecipeImportFromText,
} from "@/lib/recipes/recipe-importer";

interface RecipeImportRequest {
  jsonText: string;
  dryRun?: boolean;
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

    if (body.dryRun) {
      const prepared = prepareRecipeImportFromText(jsonText);
      return NextResponse.json({
        success: true,
        dryRun: true,
        importedCount: prepared.rows.length,
        externalKeys: prepared.rows.map((row) => row.recipe.externalKey),
        preview: prepared.preview,
      });
    }

    const result = await importRecipesFromText(jsonText);

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