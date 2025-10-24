import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkIfUserWithUsernameExists } from "@/lib/user-utils";
import { apiLogger } from "@/lib/logger";


export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get("username");
    if (!username || username.length < 3) {
      return NextResponse.json(
        { error: "Username is required", exists: false },
        { status: 400 }
      );
    }

    const exists = await checkIfUserWithUsernameExists(username);
    return NextResponse.json({ exists });
  } catch (err) {
    apiLogger.error("[API] Error in GET request", err, {
      metadata: {}
    });
    return NextResponse.json(
      { error: "Failed to process request", exists: false },
      { status: 500 }
    );
  }
}