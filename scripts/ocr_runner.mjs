import { createWorker } from 'tesseract.js';
import * as fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas, loadImage } from '@napi-rs/canvas';

async function renderPdfToImageBuffer(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 2.5 });

  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toBuffer('image/png');
}

async function enhanceImageBuffer(filePath) {
  try {
    const img = await loadImage(filePath);
    const scale = img.width < 2000 ? 2.0 : (img.width > 3500 ? 2400 / img.width : 1.0);
    if (scale === 1.0) {
      return filePath;
    }
    const canvas = createCanvas(Math.round(img.width * scale), Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toBuffer('image/png');
  } catch (_) {
    return filePath;
  }
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    process.stderr.write('File path missing or does not exist.\n');
    process.exit(1);
  }

  let ocrTarget = filePath;
  const isPdf = filePath.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    try {
      ocrTarget = await renderPdfToImageBuffer(filePath);
    } catch (e) {
      process.stderr.write(`PDF Render error: ${e.message}\n`);
    }
  } else {
    try {
      ocrTarget = await enhanceImageBuffer(filePath);
    } catch (_) {}
  }

  const worker = await createWorker('eng', 1, {
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    cachePath: new URL('.', import.meta.url).pathname,
  });
  const ret = await worker.recognize(ocrTarget);
  await worker.terminate();

  process.stdout.write(ret?.data?.text || '');
}

main().catch((err) => {
  process.stderr.write(`OCR Execution error: ${err.message}\n`);
  process.exit(1);
});
