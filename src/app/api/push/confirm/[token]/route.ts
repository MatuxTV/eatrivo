import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/index";
import { consentLogs, pushSubscriptions } from "@/db/schema";
import { apiLogger } from "@/lib/logger";
import { clearPendingPushOptIn, getPendingPushOptIn } from "@/lib/pwa/pushDoubleOptIn";

function renderResultHtml(options: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${options.title}</title>
      <style>
        body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at top,#ede9fe,#fafafa 45%);font-family:Arial,sans-serif;color:#111827}
        .card{width:min(100%,520px);background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:32px;box-shadow:0 18px 50px rgba(17,24,39,.08);text-align:center}
        .badge{display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:999px;background:rgba(139,92,246,.12);color:#8b5cf6;font-size:30px;margin-bottom:20px}
        h1{margin:0 0 12px;font-size:30px;line-height:1.1}
        p{margin:0 0 10px;color:#6b7280;line-height:1.6}
        a{display:inline-block;margin-top:18px;padding:12px 18px;border-radius:999px;background:#8b5cf6;color:#fff;text-decoration:none;font-weight:700}
      </style>
    </head>
    <body>
      <main class="card">
        <div class="badge">R</div>
        <h1>${options.title}</h1>
        <p>${options.description}</p>
        <a href="${options.actionHref}">${options.actionLabel}</a>
      </main>
    </body>
  </html>`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const pending = await getPendingPushOptIn(token);

  if (!pending) {
    return new Response(
      renderResultHtml({
        title: "Confirmation link expired",
        description: "This confirmation link is invalid or has expired. Please request push notifications again in Eatrivo.",
        actionHref: "/sk/home",
        actionLabel: "Back to Eatrivo",
      }),
      { headers: { "content-type": "text/html; charset=utf-8" }, status: 410 },
    );
  }

  const [existingSubscription] = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, pending.userId),
        sql<boolean>`${pushSubscriptions.subscription}->>'endpoint' = ${pending.endpoint}`,
      ),
    )
    .limit(1);

  if (existingSubscription) {
    await db
      .update(pushSubscriptions)
      .set({
        subscription: pending.subscription,
        userAgent: pending.userAgent,
        updatedAt: new Date(),
      })
      .where(eq(pushSubscriptions.id, existingSubscription.id));
  } else {
    await db.insert(pushSubscriptions).values({
      userId: pending.userId,
      subscription: pending.subscription,
      userAgent: pending.userAgent,
    });
  }

  await db.insert(consentLogs).values({
    userId: pending.userId,
    type: 'push_notifications',
    agreed: true,
    ipAddress: pending.ipAddress,
    userAgent: pending.userAgent || 'unknown',
    documentVersion: 'v1.0-double-opt-in',
  });

  await clearPendingPushOptIn(token, pending);

  apiLogger.info('Push subscription confirmed via double opt-in', {
    metadata: { userId: pending.userId, endpoint: pending.endpoint.slice(0, 60) },
  });

  const isEnglish = pending.locale === 'en';
  return new Response(
    renderResultHtml({
      title: isEnglish ? 'Notifications confirmed' : 'Notifikácie potvrdené',
      description: isEnglish
        ? 'Your Eatrivo push notifications are now active. You can return to the app.'
        : 'Push notifikácie Eatrivo sú teraz aktívne. Môžete sa vrátiť do aplikácie.',
      actionHref: `/${pending.locale}/home`,
      actionLabel: isEnglish ? 'Open Eatrivo' : 'Otvoriť Eatrivo',
    }),
    { headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}