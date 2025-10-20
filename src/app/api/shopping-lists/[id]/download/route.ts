import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Download endpoint now 
 * redirects to the view page,
 * which has client-side PDF generation (html2canvas + jsPDF).
 * This avoids server-side PDF generation dependencies (PhantomJS, etc.)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Redirect to view page where client-side PDF generation is available
    return NextResponse.redirect(
      new URL(`/api/shopping-lists/${id}/view`, req.url)
    );
  } catch (err) {
    console.error("[API] Error redirecting to view:", err);
    return NextResponse.json(
      { error: "Failed to redirect" },
      { status: 500 }
    );
  }
}
