import { archivedFeatureResponse } from "@/app/api/_lib/archived-feature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return archivedFeatureResponse("Legacy shopping-list PDF download");
}
