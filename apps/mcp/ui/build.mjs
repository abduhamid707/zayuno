import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = await build({ absWorkingDir: root, entryPoints: ['ui/choices.tsx'], bundle: true,
  write: false, outdir: 'dist/ui', minify: true, format: 'iife', target: 'es2022',
  jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
});
const js = result.outputFiles.find(f => f.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script');
const css = result.outputFiles.find(f => f.path.endsWith('.css'))?.text || '';
const html = `<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zayuno tanlovlari</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`;
await mkdir(new URL('../dist/ui/', import.meta.url), { recursive: true });
await writeFile(new URL('../dist/ui/text-choices.html', import.meta.url), html);
console.log(`Text choices: ${Math.round(Buffer.byteLength(html) / 1024)} KB, self-contained; no external assets.`);
