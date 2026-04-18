import { NextResponse } from "next/server";

import { auth } from "../../../../../../auth";
import { customRecipeLatestResultResponseSchema } from "@/lib/custom-recipes/contracts";
import { CustomRecipeGenerationStore } from "@/lib/custom-recipes/store";
import { apiLogger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    apiLogger.warn("[customRecipe.latest] unauthorized request");
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const latestResult = await CustomRecipeGenerationStore.getResult(session.user.id);

  if (!latestResult) {
    return new NextResponse(null, { status: 204 });
  }

  await CustomRecipeGenerationStore.touchResult(session.user.id);

  return NextResponse.json(
    customRecipeLatestResultResponseSchema.parse({
      jobId: latestResult.jobId,
      createdAt: latestResult.createdAt,
      result: latestResult.result,
    }),
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}