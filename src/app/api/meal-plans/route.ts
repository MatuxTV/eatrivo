import { archivedFeatureResponse } from "@/app/api/_lib/archived-feature";

export function POST() {
  return archivedFeatureResponse("Meal-plan generation");
}
