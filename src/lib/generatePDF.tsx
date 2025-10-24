import markdownpdf from "markdown-pdf";

type Opts = {
  title: string;
  markdownContent: string;
  weekStartDate: string;
  weekEndDate: string;
  logoUrl?: string;
};

// Hlavná funkcia na generovanie PDF z Markdown
export default async function generatePDFFromMarkdown(
  opts: Opts
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Vytvor header s titulom a dátumami
    const weekStart = new Date(opts.weekStartDate).toLocaleDateString("sk-SK");
    const weekEnd = new Date(opts.weekEndDate).toLocaleDateString("sk-SK");
    
    const header = `# ${opts.title}\n\n**${weekStart} – ${weekEnd}**\n\n---\n\n`;
    const fullMarkdown = header + opts.markdownContent;

    // Nastavenia pre markdown-pdf
    const options = {
      paperFormat: "A4" as const,
      paperOrientation: "portait" as const, // typo in library types
      paperBorder: "1cm",
      remarkable: {
        breaks: true,
        html: true,
      },
    };

    // Použij to.buffer() API na získanie Buffer
    markdownpdf(options)
      .from.string(fullMarkdown)
      .to.buffer({}, (err: unknown, buffer: ArrayBuffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(Buffer.from(buffer));
        }
      });
  });
}
