import { archivedFeatureResponse } from "@/app/api/_lib/archived-feature";

export function GET() {
  return archivedFeatureResponse("Shopping-list creation progress");
}
