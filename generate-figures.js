// generate-figures.js
//
// Builds figures.html: a page showing every clue picture in image/ as a
// captioned <figure>, plus a "Download images" button that exports them all.
//
// USAGE
//   node generate-figures.js        (run from anywhere; paths are relative to this file)
//   Re-run whenever images are added, removed or renamed.
//
// INPUTS (in the same folder as this script)
//   image/         The clue pictures (.jpg .jpeg .png .gif .webp .svg). Name each
//                  after its clue, e.g. 11a.jpg, 14d.webp; the name without the
//                  extension becomes the caption. Sorted numerically (2a before 10a).
//   template.html  A <style> block plus the markup for ONE <figure>. Placeholders:
//                    [FILENAME]                              -> image/11a.jpg
//                    [FILENAME WITHOUT FILENAME EXTENSION]   -> 11a
//
// OUTPUT
//   figures.html   The <figure> markup can be copied into a puzzle page (e.g. the
//                  Exolve postscript); the <img> paths point at image/.
//                  The page is several MB because every image is also embedded in
//                  it as data for the download (browsers won't let a page export
//                  pixels from local files otherwise).
//
// DOWNLOAD BUTTON (in figures.html, in the browser)
//   Opens a form: Height in px (required, default 150), Width in px (optional;
//   blank keeps each image's proportions, otherwise the image is scaled to fill
//   and centre-cropped), and Captioned / Not captioned. OK downloads
//   clue-pictures.zip containing colour/11a.png ... and bw/11a_bw.png ...
//   (grayscale). Cancel or Esc does nothing.
//
// PER-PUZZLE EDIT
//   The page <title> below is hard-coded; update it for each new puzzle.

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const imageDir = path.join(dir, 'image');
const template = fs.readFileSync(path.join(dir, 'template.html'), 'utf8');

// Split the template into its <style> block and the <figure> markup.
const styleMatch = template.match(/<style>([\s\S]*?)<\/style>/i);
const style = styleMatch ? styleMatch[1].replace(/^\n+|\s+$/g, '') : '';
const figureTemplate = template.replace(/<style>[\s\S]*?<\/style>/i, '').trim();

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

const files = fs.readdirSync(imageDir)
  .filter(f => /\.(jpe?g|png|gif|webp|svg)$/i.test(f))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const indent = (text, spaces) =>
  text.split('\n').map(line => (line.trim() ? ' '.repeat(spaces) + line : '')).join('\n');

const figures = files.map(file => {
  const name = path.parse(file).name;
  const figure = figureTemplate
    .split('[FILENAME WITHOUT FILENAME EXTENSION]').join(name)
    .split('[FILENAME]').join('image/' + encodeURI(file));
  return indent(figure, 4);
});

// Image data embedded for the export. Browsers refuse to read pixels back from
// images loaded via file://, so the export cannot rely on the <img> elements.
const exportData = files.map(file => {
  const ext = path.extname(file).toLowerCase();
  return {
    name: path.parse(file).name,
    src: `data:${MIME_TYPES[ext]};base64,` +
      fs.readFileSync(path.join(imageDir, file)).toString('base64'),
  };
});
const exportJson = JSON.stringify(exportData).replace(/</g, '\\u003c');

// ---------------------------------------------------------------------------
// Browser-side code. Written as a real function so it is syntax-checked here,
// then inlined into the page with Function.prototype.toString().
// ---------------------------------------------------------------------------
function clientMain() {
  const ZIP_NAME = 'clue-pictures.zip';
  const BASE_HEIGHT = 150;        // template figure height the caption style is designed for
  const BASE_FONT_PX = 22.4;      // 1.4rem
  const BASE_PADDING_PX = 4.8;    // 0.3rem

  const images = JSON.parse(document.getElementById('export-images').textContent);
  const button = document.getElementById('download-button');
  const dialog = document.getElementById('download-dialog');
  const form = dialog.querySelector('form');
  const status = document.getElementById('download-status');

  button.addEventListener('click', () => {
    form.reset();
    dialog.returnValue = '';  // Esc leaves returnValue untouched, so clear any previous 'ok'
    dialog.showModal();
  });

  // Cancel button and Esc both close with returnValue !== 'ok' -> do nothing.
  dialog.addEventListener('close', () => {
    if (dialog.returnValue !== 'ok') return;
    const data = new FormData(form);
    const height = parseInt(data.get('height'), 10);
    const widthRaw = String(data.get('width') || '').trim();
    const width = widthRaw ? parseInt(widthRaw, 10) : null;
    const captioned = data.get('caption') === 'captioned';
    runExport({ height, width, captioned });
  });

  async function runExport(options) {
    button.disabled = true;
    try {
      const entries = [];
      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        status.textContent = `Preparing ${i + 1} of ${images.length}…`;
        const img = await loadImage(item.src);
        const canvas = render(img, item.name, options);
        entries.push({ name: `colour/${item.name}.png`, data: await canvasToBytes(canvas) });
        toGrayscale(canvas);
        entries.push({ name: `bw/${item.name}_bw.png`, data: await canvasToBytes(canvas) });
      }
      const zip = buildZip(entries, ['colour/', 'bw/']);
      download(new Blob([zip], { type: 'application/zip' }), ZIP_NAME);
      status.textContent = `Downloaded ${images.length} images.`;
    } catch (err) {
      console.error(err);
      status.textContent = `Export failed: ${err.message}`;
    } finally {
      button.disabled = false;
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('could not load image'));
      img.src = src;
    });
  }

  // Draw the image at the requested size. With only a height, the aspect ratio
  // is kept. With both, the image is scaled to cover the box and centre-cropped.
  function render(img, name, { height, width, captioned }) {
    const iw = img.naturalWidth || 300;
    const ih = img.naturalHeight || 150;
    const outH = height;
    const outW = width || Math.max(1, Math.round(iw * outH / ih));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const scale = Math.max(outW / iw, outH / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, (outW - dw) / 2, (outH - dh) / 2, dw, dh);

    if (captioned) drawCaption(ctx, name, outH);
    return canvas;
  }

  // Mirrors the figcaption CSS, scaled relative to the 150px template height.
  function drawCaption(ctx, text, outH) {
    const k = outH / BASE_HEIGHT;
    const fontPx = BASE_FONT_PX * k;
    const pad = BASE_PADDING_PX * k;
    ctx.font = `bold ${fontPx}px arial, sans-serif`;
    const boxW = ctx.measureText(text).width + 2 * pad;
    const boxH = fontPx * 1.15 + 2 * pad;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, outH - boxH, boxW, boxH);
    ctx.fillStyle = 'white';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, pad, outH - boxH / 2);
  }

  function toGrayscale(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = imageData.data;
    for (let i = 0; i < px.length; i += 4) {
      const y = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
      px[i] = px[i + 1] = px[i + 2] = y;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function canvasToBytes(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) return reject(new Error('PNG encoding failed'));
        blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)), reject);
      }, 'image/png');
    });
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // --- Minimal zip writer (store, no compression; PNG is already compressed) ---
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function buildZip(fileEntries, dirNames) {
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const encoder = new TextEncoder();
    const all = [
      ...dirNames.map(name => ({ name, data: new Uint8Array(0), isDir: true })),
      ...fileEntries,
    ];

    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const entry of all) {
      const nameBytes = encoder.encode(entry.name);
      const crc = crc32(entry.data);
      const size = entry.data.length;

      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034B50, true);
      local.setUint16(4, 20, true);         // version needed
      local.setUint16(6, 0x0800, true);     // flags: UTF-8 names
      local.setUint16(8, 0, true);          // method: store
      local.setUint16(10, dosTime, true);
      local.setUint16(12, dosDate, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, size, true);
      local.setUint32(22, size, true);
      local.setUint16(26, nameBytes.length, true);
      local.setUint16(28, 0, true);
      localParts.push(new Uint8Array(local.buffer), nameBytes, entry.data);

      const central = new DataView(new ArrayBuffer(46));
      central.setUint32(0, 0x02014B50, true);
      central.setUint16(4, 20, true);       // version made by
      central.setUint16(6, 20, true);       // version needed
      central.setUint16(8, 0x0800, true);
      central.setUint16(10, 0, true);
      central.setUint16(12, dosTime, true);
      central.setUint16(14, dosDate, true);
      central.setUint32(16, crc, true);
      central.setUint32(20, size, true);
      central.setUint32(24, size, true);
      central.setUint16(28, nameBytes.length, true);
      central.setUint16(30, 0, true);
      central.setUint16(32, 0, true);
      central.setUint16(34, 0, true);
      central.setUint16(36, 0, true);
      central.setUint32(38, entry.isDir ? 0x10 : 0, true); // MS-DOS directory attribute
      central.setUint32(42, offset, true);
      centralParts.push(new Uint8Array(central.buffer), nameBytes);

      offset += 30 + nameBytes.length + size;
    }

    const centralSize = centralParts.reduce((n, p) => n + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054B50, true);
    end.setUint16(8, all.length, true);
    end.setUint16(10, all.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);

    return new Blob([...localParts, ...centralParts, new Uint8Array(end.buffer)]);
  }
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MM Giant Holiday XWord #92 - Clue Pictures</title>
  <style>
${style}

    .toolbar {
        font: 1rem arial, sans-serif;
        margin: 4px 4px 12px;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .toolbar button {
        font: bold 1rem arial, sans-serif;
        padding: 0.4rem 0.9rem;
        cursor: pointer;
    }
    #download-dialog {
        font: 1rem arial, sans-serif;
        border: 1px solid #888;
        border-radius: 6px;
        padding: 1.2rem 1.5rem;
    }
    #download-dialog::backdrop {
        background: rgba(0, 0, 0, 0.4);
    }
    #download-dialog h2 {
        margin: 0 0 1rem;
        font-size: 1.2rem;
    }
    #download-dialog .field {
        margin-bottom: 0.9rem;
    }
    #download-dialog label.block {
        display: block;
        font-weight: bold;
        margin-bottom: 0.25rem;
    }
    #download-dialog input[type="number"] {
        width: 7rem;
        font: 1rem arial, sans-serif;
    }
    #download-dialog fieldset {
        border: none;
        margin: 0 0 0.9rem;
        padding: 0;
    }
    #download-dialog legend {
        font-weight: bold;
        padding: 0;
        margin-bottom: 0.25rem;
    }
    #download-dialog .hint {
        color: #666;
        font-size: 0.85rem;
    }
    #download-dialog .actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 1.2rem;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" id="download-button">Download images</button>
    <span id="download-status" role="status"></span>
  </div>

  <dialog id="download-dialog">
    <form method="dialog">
      <h2>Download images</h2>
      <div class="field">
        <label class="block" for="export-height">Height (px)</label>
        <input type="number" id="export-height" name="height" value="150" min="1" step="1" required>
      </div>
      <div class="field">
        <label class="block" for="export-width">Width (px)</label>
        <input type="number" id="export-width" name="width" min="1" step="1" placeholder="auto">
        <div class="hint">Leave blank to keep each image's aspect ratio.</div>
      </div>
      <fieldset>
        <legend>Caption</legend>
        <label><input type="radio" name="caption" value="captioned" checked> Captioned</label>
        <label><input type="radio" name="caption" value="uncaptioned"> Not captioned</label>
      </fieldset>
      <div class="actions">
        <button type="submit" value="cancel" formnovalidate>Cancel</button>
        <button type="submit" value="ok">OK</button>
      </div>
    </form>
  </dialog>

  <main>
${figures.join('\n\n')}
  </main>

  <script type="application/json" id="export-images">${exportJson}</script>
  <script>
(${clientMain.toString()})();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(dir, 'figures.html'), html);
console.log(`Wrote ${files.length} figures to figures.html`);
