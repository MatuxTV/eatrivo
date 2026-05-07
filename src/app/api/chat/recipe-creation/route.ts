import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/index";
import { chatMessages, chatSessions } from "@/db/schema";
import { getAuthenticatedChatContext, getOwnedChatSession } from "@/lib/chat/chat-auth";
import {
  type RecipeCreationMealType,
  type RecipeCreationResultMessageMetadata,
} from "@/lib/chat/message-metadata";
import { adaptGeneratedRecipeToPreview } from "@/lib/chat/recipe-preview";
import { trackEvent } from "@/lib/analytics/analytics";
import { buildRecipeCreationGraph } from "@/lib/langgraph/recipe-creation";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

const requestSchema = z.object({
  sourceMessageId: z.string().uuid(),
  sessionId: z.string().uuid(),
  locale: z.enum(["en", "sk"]).default("sk"),
  includeProfile: z.boolean().default(true),
  includePantry: z.boolean().default(true),
  includeBrief: z.boolean().default(true),
  brief: z.string().trim().max(240).optional(),
  servings: z.number().int().min(1).max(10).default(2),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).default("dinner"),
  mealPrep: z.boolean().default(false),
});

export async function POST(request: Request) {
  const authResult = await getAuthenticatedChatContext();
  if (!authResult.ok) {
    return authResult.response;
  }

  const rateLimitResult = await checkRateLimit(
    getRateLimitIdentifier(request, authResult.context.userId),
    "expensive",
  );
  if (!rateLimitResult.success) {
    return rateLimitResult.response ?? Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const ownedSession = await getOwnedChatSession(
    parsed.data.sessionId,
    authResult.context.userProfileId,
  );
  if (!ownedSession) {
    return Response.json({ error: "Chat session not found" }, { status: 404 });
  }

  const graph = buildRecipeCreationGraph();
  const graphResult = await graph.invoke({
    userId: authResult.context.userId,
    userProfileId: authResult.context.userProfileId,
    sessionId: parsed.data.sessionId,
    locale: parsed.data.locale,
    includeProfile: parsed.data.includeProfile,
    includePantry: parsed.data.includePantry,
    brief: parsed.data.includeBrief ? parsed.data.brief?.trim() || null : null,
    servings: parsed.data.servings,
    mealType: parsed.data.mealType as RecipeCreationMealType,
    mealPrep: parsed.data.mealPrep,
  });

  if (!graphResult.generatedRecipe) {
    return Response.json(
      { error: graphResult.fatalError ?? "Recipe creation failed" },
      { status: 422 },
    );
  }

  const preview = adaptGeneratedRecipeToPreview(graphResult.generatedRecipe);
  const payload: RecipeCreationResultMessageMetadata = {
    type: "recipe_creation_result",
    version: 1,
    recipe: graphResult.generatedRecipe,
    preview,
  };
  const now = new Date();
  const messageId = parsed.data.sourceMessageId;
  const content = `Tu je tvoj novy recept: ${graphResult.generatedRecipe.name}`;

  await db
    .update(chatMessages)
    .set({
      content,
      intent: "recipe_creation",
      metadata: {
        model: "recipe_creation_graph",
        payload,
      },
    })
    .where(eq(chatMessages.id, messageId));

  await db
    .update(chatSessions)
    .set({
      updatedAt: now,
      lastMessageAt: now,
    })
    .where(eq(chatSessions.id, parsed.data.sessionId));

  await trackEvent({
    userId: authResult.context.userId,
    eventName: "chat_response_received",
    metadata: {
      sessionId: parsed.data.sessionId,
      responseLength: content.length,
      source: "recipe_creation_api",
      recipeName: graphResult.generatedRecipe.name,
    },
  });

  return Response.json({
    message: {
      id: messageId,
      role: "assistant",
      content,
      metadata: {
        model: "recipe_creation_graph",
        payload,
      },
      createdAt: now.toISOString(),
    },
  });
}