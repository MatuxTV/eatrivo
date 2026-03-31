import { NextResponse } from "next/server";

export function archivedFeatureResponse(feature: string) {
  return NextResponse.json(
    {
      error: "Feature archived",
      message: `${feature} has been archived and is no longer available in the current app flow.`,
    },
    { status: 410 },
  );
}