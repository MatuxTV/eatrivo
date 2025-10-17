import puppeteer from "puppeteer";
import MarkdownIt from "markdown-it";
import { de } from "zod/v4/locales";

const mdParser = new MarkdownIt();

interface PDFGeneratorOptions {
  title: string;
  markdownContent: string;
  weekStartDate: string;
  weekEndDate: string;
}

export default async function generatePDFFromMarkdown(
  options: PDFGeneratorOptions
): Promise<Buffer> {
  const { title, markdownContent, weekStartDate, weekEndDate } = options;

  // Convert Markdown to HTML
  const htmlContent = mdParser.render(markdownContent);

  // Create full HTML document with styling
  const fullHTML = `
<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: white;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #8B5CF6;
    }
    
    .header h1 {
      font-size: 32px;
      color: #1F2937;
      margin-bottom: 10px;
    }
    
    .header .date-range {
      font-size: 14px;
      color: #8B5CF6;
      font-weight: 600;
    }
    
    h1 {
      font-size: 28px;
      color: #1F2937;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 2px solid #E5E7EB;
    }
    
    h2 {
      font-size: 22px;
      color: #374151;
      margin-top: 25px;
      margin-bottom: 12px;
      padding-left: 10px;
      border-left: 4px solid #8B5CF6;
    }
    
    ul, ol {
      margin-left: 25px;
      margin-bottom: 15px;
    }
    
    li {
      margin-bottom: 8px;
      color: #374151;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="date-range">
      ${new Date(weekStartDate).toLocaleDateString("sk-SK")} - 
      ${new Date(weekEndDate).toLocaleDateString("sk-SK")}
    </div>
  </div>
  
  <div class="content">
    ${htmlContent}
  </div>
  
  <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #9CA3AF;">
    Vytvorené pomocou Eatrivo • ${new Date().toLocaleDateString("sk-SK")}
  </div>
</body>
</html>
  `;

  // Launch Puppeteer and generate PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(fullHTML, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
