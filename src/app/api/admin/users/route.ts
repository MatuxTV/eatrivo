import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import { users, userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    
    // Check if user is admin/trainer
    if (!session?.user?.membership || !["trainer", "admin"].includes(session.user.membership.toLowerCase())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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