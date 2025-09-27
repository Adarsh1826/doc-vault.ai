import type { TextItem } from "pdfjs-dist/types/src/display/api";

export async function extractTextFromFile(file: File): Promise<string> {
  if (!file) {
    console.error("No file provided");
    return "";
  }

  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // ✅ Properly typed instead of (item: any)
    const strings = content.items
      .map((item): string => {
        if ("str" in item) {
          return (item as TextItem).str;
        }
        return "";
      })
      .filter(Boolean);

    fullText += strings.join(" ") + "\n";
  }

  return fullText;
}

export function extractExpiryDateFromText(text: string): string | null {
  const regexes = [
    /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/g, // 2025-09-27 or 2025/09/27
    /\b(\d{1,2}[-/]\d{1,2}[-/]\d{4})\b/g, // 27/09/2025 or 09-27-2025
    /\b(?:exp(?:iry|ires|iration)?\s*[:\-]?\s*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/gi, // expiry: 12/05/2025
    /\b(?:valid\s*until|expires\s*on|valid\s*through|exp\.?\s*date)\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/gi,
  ];

  for (const regex of regexes) {
    const match = regex.exec(text);
    if (match) {
      return match[1];
    }
  }

  return null;
}
