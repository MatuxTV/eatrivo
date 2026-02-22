import { NextResponse } from "next/server";
import { requireAdminAuth, isAuthError } from "@/lib/adminAuth";
import { db } from "@/index";
import { users, userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const authResult = await requireAdminAuth();
    if (isAuthError(authResult)) return authResult;

    // Fetch all users with their profiles
    const usersWithProfiles = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        membership: users.membership,
        profileId: userProfiles.id,
        fullName: userProfiles.fullName,
        isProfileComplete: userProfiles.isProfileComplete,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .orderBy(users.name);

    return NextResponse.json({
      success: true,
      users: usersWithProfiles,
    });

  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}