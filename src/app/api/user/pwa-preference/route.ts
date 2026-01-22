import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/index';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { hideInstallPrompt } = body;

    if (typeof hideInstallPrompt !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid data' },
        { status: 400 }
      );
    }

    // Update user preference in database
    const result = await db
      .update(users)
      .set({
        hideInstallPrompt: hideInstallPrompt,
      })
      .where(eq(users.id, session.user.id))
      .returning();

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update user preference' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Preference saved successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving PWA preference:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
