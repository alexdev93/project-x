/**
 * Rasterise the brand SVGs to PNG, and compose the social card.
 *
 *   node scripts/build-brand-png.js
 *
 * A one-off asset tool, not part of `yarn build`. Uses the Chromium that
 * Playwright already provides rather than adding an image dependency; if
 * Playwright is not installed the script explains itself and exits.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BRAND = path.join(ROOT, "public", "brand");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error(
    "playwright is not installed. The committed PNGs are already in\n" +
      "public/brand — you only need this if you changed the SVGs.\n" +
      "  npm i -D playwright   (or run the SVGs through any rasteriser)",
  );
  process.exit(1);
}

const INK = "#1a1714";
const PAPER = "#f5f1ea";
const CANVAS_DARK = "#14120f";
const MUTED = "#a79e93";

/** Page that renders one SVG at an exact pixel size on a transparent ground. */
function svgPage(svg, width) {
  return `<!doctype html><meta charset="utf-8">
  <style>html,body{margin:0;background:transparent}
  #a{width:${width}px}#a svg{width:100%;height:auto;display:block}</style>
  <div id="a">${svg}</div>`;
}

/** 1200x630 social card: mark, name, role, on the brand's dark canvas. */
function ogPage(icon) {
  return `<!doctype html><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    html,body{margin:0}
    body{width:1200px;height:630px;background:${CANVAS_DARK};color:${PAPER};
      font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;
      justify-content:space-between;padding:76px;box-sizing:border-box}
    .mark{width:96px}.mark svg{width:100%;height:auto;display:block}
    /* 62px wraps to two lines within the 1048px content width; 78px overflowed. */
    h1{font-size:62px;line-height:1.1;margin:34px 0 0;font-weight:600;
       letter-spacing:-.025em;max-width:1000px}
    p{font-size:29px;line-height:1.42;color:${MUTED};margin:22px 0 0;max-width:880px}
    .foot{display:flex;align-items:center;gap:14px;font-size:22px;color:${MUTED}}
    .dot{width:11px;height:11px;border-radius:50%;background:#d97b4f}
  </style>
  <div>
    <div class="mark">${icon}</div>
    <h1>Alemayehu&nbsp;“Alex”&nbsp;Mekonen</h1>
    <p>I build backend systems that stay up — and the pipelines that keep them shipping.</p>
  </div>
  <div class="foot"><span class="dot"></span>Full-Stack &amp; DevOps Engineer</div>`;
}

async function main() {
  const read = (f) => fs.readFileSync(path.join(BRAND, f), "utf8");
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });

  const shot = async (html, file, width, height, scale = 2) => {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: scale,
    });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const target = page.locator(height ? "body" : "#a");
    await target.screenshot({
      path: path.join(BRAND, file),
      omitBackground: !height,
    });
    await page.close();
    const kb = (fs.statSync(path.join(BRAND, file)).size / 1024).toFixed(0);
    console.log(`  ${file.padEnd(22)} ${kb} KB`);
  };

  // Transparent so the PNGs drop onto any background.
  await shot(svgPage(read("alex-logo.svg"), 720), "alex-logo.png", 720, 0);
  await shot(svgPage(read("alex-logo-dark.svg"), 720), "alex-logo-dark.png", 720, 0);
  await shot(svgPage(read("alex-icon.svg"), 512), "alex-icon.png", 512, 0);
  await shot(svgPage(read("favicon.svg"), 512), "alex-app-icon.png", 512, 0);
  await shot(ogPage(read("alex-icon-dark.svg")), "alex-og.png", 1200, 630, 1);

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
