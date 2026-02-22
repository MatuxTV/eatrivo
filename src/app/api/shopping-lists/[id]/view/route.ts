import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { db } from "@/index";
import { shoppingLists, userProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
});

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

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!userProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch shopping list — check ownership (or admin/trainer access)
    const isAdmin = ["admin", "trainer"].includes(userProfile.role ?? "");
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

    // Convert markdown to HTML
    const htmlContent = md.render(item.markdownContent);

    // Create formatted dates using Intl.DateTimeFormat
    const dateFormatter = new Intl.DateTimeFormat("sk-SK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const weekStart = dateFormatter.format(new Date(item.weekStartDate));
    const weekEnd = dateFormatter.format(new Date(item.weekEndDate));

    // Create a nice HTML page
    const html = `
<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(item.title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      line-height: 1.6;
      color: #1F2D37;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3rem 2rem;
      text-align: center;
    }
    
    .header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    
    .header .date-range {
      font-size: 1.1rem;
      opacity: 0.9;
      font-weight: 500;
    }
    
    .content {
      padding: 2rem;
      columns: 2;
      column-gap: 3rem;
    }
    
    @media (max-width: 768px) {
      .content {
        columns: 1;
      }
      
      .header h1 {
        font-size: 1.8rem;
      }
      
      body {
        padding: 1rem;
      }
    }
    
    h2 {
      font-size: 1.5rem;
      color: #667eea;
      margin-top: 1.5rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #667eea;
      break-after: avoid;
    }
    
    h2:first-child {
      margin-top: 0;
    }
    
    ul {
      list-style: none;
      margin-bottom: 1.5rem;
      break-inside: avoid;
    }
    
    li {
      padding: 0.5rem 0;
      padding-left: 1.5rem;
      position: relative;
    }
    
    li:before {
      content: "•";
      position: absolute;
      left: 0;
      color: #667eea;
      font-weight: bold;
      font-size: 1.2rem;
    }
    
    .footer {
      text-align: center;
      padding: 2rem;
      color: #9CA3AF;
      font-size: 0.9rem;
      border-top: 1px solid #E5E7EB;
    }
    
    .action-buttons {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      display: flex;
      gap: 1rem;
    }
    
    .action-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 50px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .action-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6);
    }
    
    .action-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
        border-radius: 0;
      }
      
      .action-buttons {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container" id="content-area">
    <div class="header">
      <h1>${escapeHtml(item.title)}</h1>
      <div class="date-range">${weekStart} – ${weekEnd}</div>
    </div>
    
    <div class="content">
      ${htmlContent}
    </div>
    
    <div class="footer">
      Vytvorené pomocou Eatrivo • ${new Intl.DateTimeFormat("sk-SK").format(new Date())}
    </div>
  </div>
  
  <div class="action-buttons">
    <button class="action-button" id="downloadBtn">
      📥 Download PDF
    </button>
    <button class="action-button" onclick="window.print()">
      🖨️ Print
    </button>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" crossorigin="anonymous"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" crossorigin="anonymous"></script>

  <script>
    const sanitizeFilename = (name) => name.replace(/[\\\\/:*?"<>|]+/g, '').trim();
    const filename = sanitizeFilename(${JSON.stringify(item.title)}) + '_' + sanitizeFilename(${JSON.stringify(weekStart)}) + '_to_' + sanitizeFilename(${JSON.stringify(weekEnd)}) + '.pdf';

    document.getElementById('downloadBtn').addEventListener('click', async function() {
      const btn = this;
      btn.disabled = true;
      btn.textContent = '⏳ Generating...';
      
      try {
        // Wait for libraries to load
        if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
          throw new Error('PDF libraries not loaded yet. Please try again.');
        }

        const element = document.getElementById('content-area');
        const canvas = await html2canvas(element, { 
          scale: 2,
          useCORS: true,
          logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const jsPDF = window.jspdf.jsPDF;
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        // A4 size in pixels at 72 DPI
        const pdfWidth = 595.28;
        const pdfHeight = 841.89;
        
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const scaledWidth = imgWidth * ratio;
        const scaledHeight = imgHeight * ratio;
        
        const pdf = new jsPDF({
          orientation: scaledHeight > scaledWidth ? 'portrait' : 'landscape',
          unit: 'pt',
          format: 'a4'
        });
        
        if (scaledHeight <= pdfHeight) {
          // Single page
          pdf.addImage(imgData, 'PNG', 0, 0, scaledWidth, scaledHeight);
        } else {
          // Multi-page
          let position = 0;
          const pageHeight = pdfHeight / ratio;
          
          while (position < imgHeight) {
            const sliceHeight = Math.min(pageHeight, imgHeight - position);
            
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = imgWidth;
            sliceCanvas.height = sliceHeight;
            
            const ctx = sliceCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, position, imgWidth, sliceHeight, 0, 0, imgWidth, sliceHeight);
            
            const sliceData = sliceCanvas.toDataURL('image/png');
            
            if (position > 0) pdf.addPage();
            pdf.addImage(sliceData, 'PNG', 0, 0, scaledWidth, sliceHeight * ratio);
            
            position += sliceHeight;
          }
        }
        
        pdf.save(filename);
        btn.textContent = '✅ Downloaded!';
        setTimeout(() => {
          btn.textContent = '📥 Download PDF';
          btn.disabled = false;
        }, 2000);
      } catch (err) {
        console.error('PDF generation failed:', err);
        alert('Failed to generate PDF. Please try printing instead.');
        btn.textContent = '📥 Download PDF';
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>
    `;

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
