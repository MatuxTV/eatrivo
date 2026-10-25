// Monthly spend guard for AI recipe images. Pure math — the caller supplies the
// already-summed spend so this stays testable without a database.

export function monthKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function canSpend(
  spentUsd: number,
  priceUsd: number,
  budgetUsd: number,
): boolean {
  if (budgetUsd <= 0) {
    return false;
  }

  return spentUsd + priceUsd <= budgetUsd;
}
