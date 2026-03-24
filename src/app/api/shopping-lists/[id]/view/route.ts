import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { db } from "@/index";
import { shoppingLists, shoppingListItems, userProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rateLimit";
import { formatLocalizedAmountLabel } from "@/lib/pantry/format";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, "standard");
    if (!rl.success) return rl.response!;

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!userProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
  const locale = req.nextUrl.searchParams.get("locale") ?? "sk";

    // Fetch shopping list — check ownership (or admin/trainer access)
    const isAdmin = ["admin", "coach"].includes(userProfile.role ?? "");
    const rows = isAdmin
      ? await db.select().from(shoppingLists).where(eq(shoppingLists.id, id)).limit(1)
      : await db.select().from(shoppingLists).where(
          and(eq(shoppingLists.id, id), eq(shoppingLists.userProfileId, userProfile.id))
        ).limit(1);

    const item = rows[0];
    if (!item) {
      return NextResponse.json(
        { error: "Shopping list not found" },
        { status: 404 },
      );
    }

    // Fetch items
    const items = await db.select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, id))
      .orderBy(shoppingListItems.sortOrder);

    // Group items by category
    const groupedItems: Record<string, typeof items> = {};
    for (const item of items) {
      const cat = item.category || "Ostatné";
      if (!groupedItems[cat]) groupedItems[cat] = [];
      groupedItems[cat].push(item);
    }
    
    const categories = Object.keys(groupedItems).sort();
    
    let htmlContent = "";
    if (categories.length === 0) {
      htmlContent = "<p>Nákupný zoznam je prázdny.</p>";
    } else {
      categories.forEach(cat => {
        htmlContent += `<h2>${escapeHtml(cat)}</h2>\n<ul>\n`;
        groupedItems[cat].forEach(i => {
          const amountLabel = formatLocalizedAmountLabel(i.quantity, i.unit, locale);
          const check = i.isChecked ? "✅ " : "";
          htmlContent += `  <li>${check}<strong>${escapeHtml(i.name)}</strong>${amountLabel ? `: ${escapeHtml(amountLabel)}` : ""}</li>\n`;
        });
        htmlContent += `</ul>\n`;
      });
    }

    // Create formatted dates using Intl.DateTimeFormat
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const weekStart = dateFormatter.format(new Date(item.weekStartDate));
    const weekEnd = dateFormatter.format(new Date(item.weekEndDate));

    // Check for ?print=1 — auto-trigger window.print() on load
    const autoPrint = req.nextUrl.searchParams.get("print") === "1";

    // Create a nice HTML page
    const html = `
<!DOCTYPE html>
<html lang="${escapeHtml(locale)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(item.title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1F2D37;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2.5rem 2rem;
      text-align: center;
    }
    .header h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.4rem; }
    .header .date-range { font-size: 1rem; opacity: 0.9; }

    .content { padding: 2rem; columns: 2; column-gap: 2.5rem; }

    @media (max-width: 640px) {
      .content { columns: 1; }
      .header h1 { font-size: 1.5rem; }
      body { padding: 0.75rem; }
    }

    h2 {
      font-size: 1.25rem;
      color: #667eea;
      margin: 1.5rem 0 0.75rem;
      padding-bottom: 0.4rem;
      border-bottom: 2px solid #667eea;
      break-after: avoid;
    }
    h2:first-child { margin-top: 0; }

    ul { list-style: none; margin-bottom: 1.5rem; break-inside: avoid; }
    li { padding: 0.4rem 0 0.4rem 1.5rem; position: relative; }
    li::before { content: "•"; position: absolute; left: 0; color: #667eea; font-weight: bold; }

    .footer {
      text-align: center;
      padding: 1.5rem;
      color: #9CA3AF;
      font-size: 0.8rem;
      border-top: 1px solid #E5E7EB;
    }

    .action-buttons {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      display: flex;
      gap: 0.75rem;
    }
    .action-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 50px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(102,126,234,0.4);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .action-button:hover { transform: translateY(-2px); box-shadow: 0 6px 30px rgba(102,126,234,0.6); }

    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; border-radius: 0; max-width: 100%; }
      .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .action-buttons { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(item.title)}</h1>
      <div class="date-range">${weekStart} – ${weekEnd}</div>
    </div>
    <div class="content">${htmlContent}</div>
    <div class="footer">
      Vytvorené pomocou Eatrivo &nbsp;•&nbsp; ${new Intl.DateTimeFormat(locale).format(new Date())}
    </div>
  </div>

  <div class="action-buttons">
    <button class="action-button" onclick="window.print()">
      📄 Uložiť ako PDF / Tlačiť
    </button>
  </div>

  ${autoPrint ? `<script>window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 300); });</script>` : ""}
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[API] Error rendering markdown:", err);
    return NextResponse.json(
      { error: "Failed to render markdown" },
      { status: 500 },
    );
  }
}
