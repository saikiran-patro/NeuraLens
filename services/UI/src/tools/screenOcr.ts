import { createWorker, PSM, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

const getWorker = () => {
  if (!workerPromise) {
    workerPromise = createWorker("eng").then(async (worker) => {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
      return worker;
    });
  }
  return workerPromise;
};

export const warmScreenOcr = () => { void getWorker(); };

const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const normalize = (value: string) => value
  .replace(/[ \t]+/g, " ")
  .replace(/[|¦]{2,}/g, "|")
  .trim();

const prepareFrame = (frame: string) => new Promise<HTMLCanvasElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const scale = Math.max(1.35, Math.min(2, 2400 / Math.max(image.width, image.height)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("Screen image preparation is unavailable."));
      return;
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.filter = "grayscale(1) contrast(1.28)";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    resolve(canvas);
  };
  image.onerror = () => reject(new Error("The current screen frame could not be prepared."));
  image.src = frame;
});

export interface ScreenMarkdown {
  markdown: string;
  confidence: number;
  visibility: "clear" | "partial" | "unreadable";
}

export async function recognizeScreen(frame: string): Promise<ScreenMarkdown> {
  const worker = await getWorker();
  const prepared = await prepareFrame(frame);
  const result = await worker.recognize(prepared, {}, { blocks: true, text: true });
  const lines = (result.data.blocks || [])
    .flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines))
    .filter((line) => line.words.length > 0)
    .sort((a, b) => {
      const rowTolerance = Math.max(8, Math.min(a.bbox.y1 - a.bbox.y0, b.bbox.y1 - b.bbox.y0) * 0.55);
      return Math.abs(a.bbox.y0 - b.bbox.y0) <= rowTolerance ? a.bbox.x0 - b.bbox.x0 : a.bbox.y0 - b.bbox.y0;
    });

  const normalHeight = median(lines.map((line) => line.bbox.y1 - line.bbox.y0).filter((height) => height > 4));
  const markdown = lines.map((line) => {
    const reliableWords = line.words.filter((word) => word.confidence >= 48 && normalize(word.text).length > 0);
    const text = normalize(reliableWords.map((word) => word.text).join(" "));
    if (!text || text.length === 1 && !/[A-Za-z0-9]/.test(text)) return "";
    const height = line.bbox.y1 - line.bbox.y0;
    const isHeading = normalHeight > 0 && height >= normalHeight * 1.42 && reliableWords.length <= 14;
    if (isHeading) return `## ${text.replace(/^#+\s*/, "")}`;
    if (/^[•·▪◦]\s*/.test(text)) return `- ${text.replace(/^[•·▪◦]\s*/, "")}`;
    return text;
  }).filter(Boolean).join("\n\n").slice(0, 10_000);

  const confidence = Math.round(result.data.confidence || 0);
  const visibility = !markdown || markdown.length < 20
    ? "unreadable"
    : confidence >= 72
      ? "clear"
      : "partial";
  return { markdown, confidence, visibility };
}
