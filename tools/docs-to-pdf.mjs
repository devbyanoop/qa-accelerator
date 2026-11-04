// Converts the Markdown guides in docs/ to PDF, next to their sources. Only the PDFs are committed (see .gitignore).
//
//   node tools/docs-to-pdf.mjs               every docs/**/*.md
//   node tools/docs-to-pdf.mjs docs/reporting.md [more.md ...]
//
// Needs Chromium (`npx playwright install chromium`). Links to other guides become links to their PDF on GitHub, and
// links to other files in the repository become links to them on GitHub, so a PDF still works outside the repository.
// Images are embedded, so a PDF is self-contained.
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const repoUrl = 'https://github.com/devbyanoop/qa-accelerator';
const branch = 'main';
const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

function markdownFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const full = path.join(directory, name);
    if (statSync(full).isDirectory()) return markdownFiles(full);
    return name.endsWith('.md') ? [full] : [];
  });
}

const given = process.argv.slice(2);
const files = (given.length ? given : markdownFiles('docs')).map((f) => path.normalize(f));

const mime = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

/** Rewrites one relative link or image path found in `source`. */
function resolveTarget(source, target, isImage) {
  if (/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) return target;
  const [rawPath, hash = ''] = target.split('#');
  const absolute = path.normalize(path.join(path.dirname(source), decodeURIComponent(rawPath)));
  const repoRelative = absolute.split(path.sep).join('/');
  if (isImage && existsSync(absolute)) {
    const type = mime[path.extname(absolute).toLowerCase()] ?? 'application/octet-stream';
    return `data:${type};base64,${readFileSync(absolute).toString('base64')}`;
  }
  if (repoRelative.endsWith('.md') && repoRelative.startsWith('docs/')) {
    return `${repoUrl}/blob/${branch}/${repoRelative.replace(/\.md$/, '.pdf')}${hash ? `#${hash}` : ''}`;
  }
  const kind = existsSync(absolute) && statSync(absolute).isDirectory() ? 'tree' : 'blob';
  return `${repoUrl}/${kind}/${branch}/${repoRelative}${hash ? `#${hash}` : ''}`;
}

const css = `
body { margin: 0; color: #1f2328; font: 15px/1.55 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
h1 { font-size: 1.9em; border-bottom: 1px solid #d1d9e0; padding-bottom: .3em; }
h2 { font-size: 1.4em; border-bottom: 1px solid #d1d9e0; padding-bottom: .3em; margin-top: 1.8em; }
h3 { font-size: 1.15em; }
h1, h2, h3 { line-height: 1.25; break-after: avoid; }
a { color: #0969da; text-decoration: none; }
p, ul, ol { margin: 0 0 1em; }
code { background: #f6f8fa; padding: .15em .35em; border-radius: 4px; font: 0.88em ui-monospace, SFMono-Regular, Consolas, monospace; }
pre { background: #f6f8fa; padding: 12px 14px; border-radius: 6px; border: 1px solid #d1d9e0; white-space: pre-wrap; word-break: break-word; break-inside: avoid; }
pre code { background: none; padding: 0; font-size: 0.85em; }
table { border-collapse: collapse; width: 100%; margin: 0 0 1em; font-size: .9em; }
th, td { border: 1px solid #d1d9e0; padding: 5px 9px; text-align: left; vertical-align: top; }
th { background: #f6f8fa; }
tr { break-inside: avoid; }
img { max-width: 100%; border: 1px solid #d1d9e0; border-radius: 4px; }
ul:has(input[type=checkbox]) { list-style: none; padding-left: .4em; }
`;

const browser = await chromium.launch();
let overflowing = 0;
for (const file of files) {
  const source = file.split(path.sep).join('/');
  const renderer = new marked.Renderer();
  renderer.link = (href, title, text) =>
    `<a href="${resolveTarget(source, href, false)}"${title ? ` title="${title}"` : ''}>${text}</a>`;
  renderer.image = (href, title, text) =>
    `<img src="${resolveTarget(source, href, true)}" alt="${text}"${title ? ` title="${title}"` : ''}>`;

  const body = marked.parse(readFileSync(file, 'utf8'), { gfm: true, renderer });
  const title = (readFileSync(file, 'utf8').match(/^#\s+(.+)$/m)?.[1] ?? path.basename(file, '.md')).replace(
    /[<>]/g,
    '',
  );
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${body}</body></html>`;

  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  await page.emulateMedia({ media: 'print' });
  await page.setContent(html, { waitUntil: 'load' });
  // `document` exists inside the browser page, not in Node.
  /* eslint-disable no-undef */
  overflowing += await page.evaluate(
    () =>
      [...document.querySelectorAll('pre, table, img')].filter((e) => e.scrollWidth > e.clientWidth + 2)
        .length,
  );
  /* eslint-enable no-undef */
  const pdf = file.replace(/\.md$/, '.pdf');
  await page.pdf({
    path: pdf,
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', bottom: '16mm', left: '15mm', right: '15mm' },
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;font-size:8px;color:#666;text-align:center;font-family:Arial">${title.replace(/&/g, '&amp;')} &nbsp;|&nbsp; <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
  });
  await page.close();
  console.log(`docs: ${source} -> ${pdf.split(path.sep).join('/')}`);
}
await browser.close();
if (overflowing) console.warn(`docs: ${overflowing} block(s) are wider than the page; check the PDFs.`);
