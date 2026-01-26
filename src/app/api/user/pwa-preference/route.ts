import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/index';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await db
      .select({ hideInstallPrompt: users.hideInstallPrompt })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { hideInstallPrompt: result[0].hideInstallPrompt },
      { status: 200 }
    );
  } catch (error) {
    apiLogger.error('Error fetching PWA preference', error as Error, { context: 'PWA Preference' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      apiLogger.warn('Unauthorized request', { context: 'PWA Preference' });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { hideInstallPrompt } = body;

    apiLogger.info(`Updating preference to ${hideInstallPrompt}`, { 
      context: 'PWA Preference', 
      metadata: { userId: session.user.id } 
    });

    if (typeof hideInstallPrompt !== 'boolean') {
      apiLogger.warn('Invalid data type', { 
        context: 'PWA Preference',
        metadata: { hideInstallPrompt } 
      });
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
      .returning({ updatedId: users.id, newVal: users.hideInstallPrompt });

    if (!result || result.length === 0) {
      apiLogger.error('Update returned no results. User might not exist.', undefined, { 
        context: 'PWA Preference',
        metadata: { userId: session.user.id }
      });
      return NextResponse.json(
        { error: 'Failed to update user preference' },
        { status: 500 }
      );
    }

    apiLogger.info('Update successful', { 
      context: 'PWA Preference',
      metadata: { userId: session.user.id }
    });

    return NextResponse.json(
      { success: true, message: 'Preference saved successfully' },
      { status: 200 }
    );
  } catch (error) {
    apiLogger.error('Error saving PWA preference', error as Error, { context: 'PWA Preference' });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
