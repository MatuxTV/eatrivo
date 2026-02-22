import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminAuth, isAuthError } from "@/lib/adminAuth";
import { db } from "@/index";
import { shoppingListTemplates, mealPlanTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateTemplateSchema } from "@/lib/schemas/template";
import { apiLogger } from "@/lib/logger";

/**
 * GET /api/admin/templates/[id]
 * Get a single template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAdminAuth();
    if (isAuthError(authResult)) return authResult;

    const { id: templateId } = await params;

    // Fetch template
    const template = await db.query.shoppingListTemplates.findFirst({
      where: eq(shoppingListTemplates.id, templateId),
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    // Fetch associated meal plan template if exists
    const mealPlanTemplate = await db.query.mealPlanTemplates.findFirst({
      where: eq(mealPlanTemplates.shoppingListTemplateId, templateId),
    });

    return NextResponse.json({
      shoppingListTemplate: template,
      mealPlanTemplate,
    });
  } catch (error) {
    apiLogger.error("Error fetching template", error, {
      metadata: { templateId: "unknown" },
    });
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/templates/[id]
 * Update a template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAdminAuth();
    if (isAuthError(authResult)) return authResult;

    const { id: templateId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validationResult.error.issues },
        { status: 400 },
      );
    }

    const updateData = validationResult.data;

    // Check if template exists
    const existingTemplate = await db.query.shoppingListTemplates.findFirst({
      where: eq(shoppingListTemplates.id, templateId),
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    // Update template
    const [updatedTemplate] = await db
      .update(shoppingListTemplates)
      .set({
        ...updateData,
        updated_at: new Date(),
      })
      .where(eq(shoppingListTemplates.id, templateId))
      .returning();

    apiLogger.info("Template updated successfully", {
      metadata: {
        templateId,
        changes: Object.keys(updateData),
      },
    });

    return NextResponse.json({ template: updatedTemplate });
  } catch (error) {
    apiLogger.error("Error updating template", error, {
      metadata: { templateId: "unknown" },
    });
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/templates/[id]
 * Soft delete a template (set isActive to false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAdminAuth();
    if (isAuthError(authResult)) return authResult;

    const { id: templateId } = await params;

    // Check if template exists
    const existingTemplate = await db.query.shoppingListTemplates.findFirst({
      where: eq(shoppingListTemplates.id, templateId),
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    // Soft delete (set is is_active to false)
    await db
      .update(shoppingListTemplates)
      .set({
        isActive: false,
        updated_at: new Date(),
      })
      .where(eq(shoppingListTemplates.id, templateId));

    // Also deactivate associated meal plan template
    await db
      .update(mealPlanTemplates)
      .set({
        isActive: false,
        updated_at: new Date(),
      })
      .where(eq(mealPlanTemplates.shoppingListTemplateId, templateId));

    apiLogger.info("Template soft deleted successfully", {
      metadata: { templateId },
    });

    return NextResponse.json({
      message: "Template deactivated successfully",
    });
  } catch (error) {
    apiLogger.error("Error deleting template", error, {
      metadata: { templateId: "unknown" },
    });
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 },
    );
  }
}
