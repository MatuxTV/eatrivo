/**
 * Script: disconnect-assigned-templates.ts
 *
 * Disconnects template assignments from all user accounts without deleting
 * any shopping list or meal plan records.
 *
 * What it does:
 *   1. Removes all rows from `template_assignments` (breaks the user ↔ template link)
 *   2. Marks all shopping lists as "cancelled" (hides them in the app, records stay in DB)
 *
 * Records in `shopping_lists` and `meal_plans` are preserved.
 *
 * Run: npx tsx scripts/disconnect-assigned-templates.ts
 */

import "dotenv/config";
import { db } from "@/index";
import { templateAssignments, shoppingLists, shoppingListTemplates, mealPlanTemplates } from "@/db/schema";

async function disconnectTemplates() {
  // 1. Remove template assignment links
  const deletedAssignments = await db
    .delete(templateAssignments)
    .returning({ id: templateAssignments.id });
  console.log(`✓ Removed ${deletedAssignments.length} template assignments`);

  // 2. Mark all shopping lists as cancelled so they no longer appear in the app.
  //    Records are kept in the DB — nothing is deleted.
  const updatedLists = await db
    .update(shoppingLists)
    .set({ status: "cancelled" })
    .returning({ id: shoppingLists.id });
  console.log(`✓ Marked ${updatedLists.length} shopping lists as cancelled`);

  // 3. Deactivate all shopping list templates
  const updatedSlTemplates = await db
    .update(shoppingListTemplates)
    .set({ isActive: false })
    .returning({ id: shoppingListTemplates.id });
  console.log(`✓ Marked ${updatedSlTemplates.length} shopping list templates as inactive`);

  // 4. Deactivate all meal plan templates
  const updatedMpTemplates = await db
    .update(mealPlanTemplates)
    .set({ isActive: false })
    .returning({ id: mealPlanTemplates.id });
  console.log(`✓ Marked ${updatedMpTemplates.length} meal plan templates as inactive`);

  console.log("\nDone. Users are now disconnected from all template assignments.");
  console.log("Shopping list and meal plan records are preserved in the database.");
}

disconnectTemplates()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
