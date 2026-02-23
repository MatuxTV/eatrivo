import type { ChatState } from "../state";

export async function fetchPantry(
  _state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  // TODO: keď bude inventoryContext v schema.ts:
  // const items = await db.select().from(inventoryContext)
  //   .where(eq(inventoryContext.userProfileId, state.userProfileId));
  // return { pantryItems: items.map(i => ({ name: i.name, quantity: i.quantity })) };

  return { pantryItems: null };
}
