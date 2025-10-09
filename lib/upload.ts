import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { recognize } from "tesseract.js";

function preprocessCanvasForOCR(canvas: HTMLCanvasElement, options?: { contrast?: number; threshold?: number }) {
  const contrast = options?.contrast ?? 1.3; // >1 increases contrast
  const threshold = options?.threshold ?? 140; // 0-255
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context for preprocessing");

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = img.data;
  // Convert to grayscale + apply contrast and thresholding (simple)
  for (let i = 0; i < data.length; i += 4) {
    // sRGB luminance approximation
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    // apply contrast around 128
    gray = ( (gray - 128) * contrast ) + 128;
    // clamp
    if (gray < 0) gray = 0;
    if (gray > 255) gray = 255;
    // apply threshold -> black or white
    const v = gray >= threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = v;
    // keep alpha
  }
  ctx.putImageData(img, 0, 0);
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (!file) {
    console.error("No file provided");
    return "";
  }

  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

   // console.log("PDF loaded:", { filename: file.name, numPages: pdf.numPages });

    const MIN_TEXT_LEN = 20;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      //console.log(`Page ${i} text items:`, (content.items || []).length);

      const strings = (content.items || [])
        .map((item): string => ("str" in item ? (item as TextItem).str : ""))
        .filter(Boolean);

      let pageText = strings.join(" ").trim();
      //console.log(`Page ${i} pdfjs-extracted length:`, pageText.length);

      // If pdfjs text is short, try OCR with multiple scales & preprocessing
      if (pageText.length < MIN_TEXT_LEN) {
        const scalesToTry = [2, 3, 4]; // try higher resolutions
        let ocrFound = "";

        for (const scale of scalesToTry) {
          try {
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(viewport.width);
            canvas.height = Math.round(viewport.height);
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Unable to get canvas 2D context");

            await page.render({ canvasContext: ctx, viewport }).promise;
            //console.log(`Page ${i} rendered to canvas at scale ${scale}: ${canvas.width}x${canvas.height}`);

            // make a copy of the canvas to preprocess so we don't mutate original (optional)
            const procCanvas = document.createElement("canvas");
            procCanvas.width = canvas.width;
            procCanvas.height = canvas.height;
            const procCtx = procCanvas.getContext("2d");
            if (!procCtx) throw new Error("Unable to get proc canvas context");
            procCtx.drawImage(canvas, 0, 0);

            // Preprocess: grayscale + contrast + threshold
            preprocessCanvasForOCR(procCanvas, { contrast: 1.3, threshold: 140 });

            // Try recognize on preprocessed canvas
            try {
              const res = await recognize(procCanvas, "eng", {
                logger: (m) => {
                  if (m && m.status) console.debug(`Tesseract(${i}, scale ${scale}):`, m);
                },
              });
              const text = (res?.data?.text || "").trim();
              //console.log(`Page ${i} OCR length (proc canvas, scale ${scale}):`, text.length);
              if (text.length) {
                ocrFound = text;
                break; // stop trying larger scales
              }
            } catch (ocrErr) {
              //console.warn(`recognize(procCanvas) failed page ${i} scale ${scale}:`, ocrErr);
            }

            // fallback: try dataURL from preprocessed canvas
            try {
              const dataUrl = procCanvas.toDataURL("image/png");
              const res2 = await recognize(dataUrl, "eng", {
                logger: (m) => {
                  if (m && m.status) console.debug(`Tesseract-fallback(${i}, scale ${scale}):`, m);
                },
              });
              const text2 = (res2?.data?.text || "").trim();
              //console.log(`Page ${i} OCR length (dataURL fallback, scale ${scale}):`, text2.length);
              if (text2.length) {
                ocrFound = text2;
                break;
              }
            } catch (dataUrlErr) {
             // console.warn(`recognize(dataUrl) failed page ${i} scale ${scale}:`, dataUrlErr);
            }
          } catch (renderErr) {
            //console.error(`Error rendering/OCR loop for page ${i} scale ${scale}:`, renderErr);
          }
        } // end scales loop

        // Merge OCR text
        if (ocrFound) {
          if (pageText) {
            if (!pageText.includes(ocrFound)) {
              pageText = (pageText + "\n" + ocrFound).trim();
            }
          } else {
            pageText = ocrFound;
          }
        } else {
          //console.log(`Page ${i}: OCR produced no text after all attempts.`);
        }
      }

      fullText += (pageText || "") + "\n";
    }

    //console.log("Extracted full text length:", fullText.trim().length);
    return fullText.trim();
  } catch (err) {
    //console.error("Error in extractTextFromFile:", err);
    return "";
  }
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
