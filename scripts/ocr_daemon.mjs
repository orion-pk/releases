import { createWorker } from 'tesseract.js';
import * as fs from 'fs';
import * as readline from 'readline';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas, loadImage } from '@napi-rs/canvas';

let worker = null;
let scanCount = 0;
const MAX_SCANS_BEFORE_RECYCLE = 500;

async function initWorker() {
  if (worker) {
    try {
      await worker.terminate();
    } catch (_) {}
  }
  worker = await createWorker('eng', 1, {
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    cachePath: new URL('.', import.meta.url).pathname,
  });
}

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
    // Dynamic DPI scaling: upscale if low-to-medium resolution (< 2000px), downscale if overly large (> 3500px)
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

async function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found: ' + filePath);
  }

  let ocrTarget = filePath;
  const isPdf = filePath.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    ocrTarget = await renderPdfToImageBuffer(filePath);
  } else {
    ocrTarget = await enhanceImageBuffer(filePath);
  }

  if (!worker) {
    await initWorker();
  }

  const ret = await worker.recognize(ocrTarget);
  scanCount++;

  // Auto-recycle worker after threshold to prevent memory leaks
  if (scanCount >= MAX_SCANS_BEFORE_RECYCLE) {
    scanCount = 0;
    initWorker().catch(() => {});
  }

  return ret?.data?.text || '';
}

async function main() {
  await initWorker();
  process.stdout.write(JSON.stringify({ status: 'READY' }) + '\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let req;
    try {
      req = JSON.parse(trimmed);
    } catch (_) {
      return;
    }

    const id = req.id || 'default';
    const filePath = req.path;

    try {
      const text = await processFile(filePath);
      process.stdout.write(JSON.stringify({ id, success: true, text }) + '\n');
    } catch (err) {
      process.stdout.write(
        JSON.stringify({
          id,
          success: false,
          error: err.message || String(err),
        }) + '\n'
      );
    }
  });
}

main().catch((err) => {
  process.stderr.write(`Daemon Init Error: ${err.message}\n`);
  process.exit(1);
});
