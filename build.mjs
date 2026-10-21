import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
let esbuild;
try { esbuild = require('esbuild'); } catch (e) {
  if (!process.env.ESBUILD_PATH) { console.error('esbuild bulunamadı. Önce "npm install" çalıştır.'); process.exit(1); }
  esbuild = require(process.env.ESBUILD_PATH);
}
const dev = process.argv.includes('--dev');

const worker = await esbuild.build({
  entryPoints: ['src/ai/worker.js'], bundle: true, write: false, format: 'iife', minify: !dev, target: 'es2019',
});
const workerCode = worker.outputFiles[0].text;

const virt = {
  name: 'virtual', setup(b) {
    b.onResolve({ filter: /^virtual:ai-worker$/ }, () => ({ path: 'ai-worker', namespace: 'virt' }));
    b.onLoad({ filter: /.*/, namespace: 'virt' }, () => ({ contents: 'export default ' + JSON.stringify(workerCode), loader: 'js' }));
  },
};
const main = await esbuild.build({
  entryPoints: ['src/main.js'], bundle: true, write: false, format: 'iife', minify: !dev, target: 'es2019',
  plugins: [virt], legalComments: 'none', metafile: true,
});
let js = main.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const cssRaw = fs.readFileSync('src/fonts.css', 'utf8') + '\n' + fs.readFileSync('src/styles.css', 'utf8') + '\nhtml{box-sizing:border-box}';
const css = (await esbuild.transform(cssRaw, { loader: 'css', minify: true })).code.replace(/<\/style/gi, '<\\/style');

const title = 'Retro Oyun Koleksiyonu';
const full = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<style>${css}</style>
</head>
<body>
<div id="app"></div>
<script>${js}</script>
</body>
</html>
`;
const page = `<title>${title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css}</style>
<div id="app"></div>
<script>${js}</script>
`;
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/retro-oyun-koleksiyonu.html', full);
fs.writeFileSync('dist/page.html', page);
fs.writeFileSync('index.html', full);
const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log('js', kb(js.length), 'css', kb(css.length), 'worker', kb(workerCode.length), 'total', kb(full.length));
if (process.argv.includes('--meta')) {
  const out = Object.values(main.metafile.outputs)[0];
  const rows = Object.entries(out.inputs).map(([k, v]) => [k, v.bytesInOutput]).sort((a, b) => b[1] - a[1]).slice(0, 25);
  for (const [k, v] of rows) console.log(String(v).padStart(8), k);
}
