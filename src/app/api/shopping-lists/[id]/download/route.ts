import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../index";
import { shoppingLists } from "@/db/schema";
import { eq } from "drizzle-orm";
import  generatePDFFromMarkdown  from "@/lib/pdfGenerate";


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch shopping list from database
    const [shoppingList] = await db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.id, id))
      .limit(1);

    if (!shoppingList) {
      return NextResponse.json(
        { error: "Shopping list not found" },
        { status: 404 }
      );
    }

    // Generate PDF from markdown
    const pdfBuffer = await generatePDFFromMarkdown({
      title: shoppingList.title,
      markdownContent: shoppingList.markdownContent,
      weekStartDate: shoppingList.weekStartDate.toISOString(),
      weekEndDate: shoppingList.weekEndDate.toISOString(),
    });

    // Return PDF file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          shoppingList.title
        )}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}