#!/usr/bin/env node
// Builds the Mandarin Edition engine assets into extension/public/mandarin/:
//   cedict.json  CC-CEDICT packed as { simplified: [[traditional, pinyin, glosses], ...] }
//   jieba_rs_wasm_bg.wasm  the jieba segmenter, loaded by the background service worker
// CC-CEDICT is licensed CC BY-SA 4.0 (https://cc-cedict.org); attribution ships alongside.
import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'extension', 'public', 'mandarin');
const require = createRequire(join(root, 'package.json'));
mkdirSync(out, { recursive: true });

const cedictPath = join(dirname(require.resolve('cedict-json')), 'cedict.json');
const rows = JSON.parse(readFileSync(cedictPath, 'utf8'));
const packed = {};
for (const row of rows) (packed[row.simplified] ??= []).push([row.traditional, row.pinyin, row.english]);
writeFileSync(join(out, 'cedict.json'), JSON.stringify(packed));

const extensionRequire = createRequire(join(root, 'extension', 'package.json'));
const jiebaWeb = join(dirname(extensionRequire.resolve('jieba-wasm/web')), 'jieba_rs_wasm_bg.wasm');
copyFileSync(jiebaWeb, join(out, 'jieba_rs_wasm_bg.wasm'));

const cedictVersion = JSON.parse(readFileSync(join(dirname(cedictPath), 'package.json'), 'utf8')).version;
writeFileSync(
    join(out, 'ATTRIBUTION.txt'),
    `CC-CEDICT (cedict-json ${cedictVersion}), https://cc-cedict.org, licensed CC BY-SA 4.0.\n` +
        `jieba-rs (jieba-wasm), MIT License.\n`
);

const mb = (file) => (statSync(join(out, file)).size / 1e6).toFixed(1);
console.log(`mandarin assets: ${Object.keys(packed).length} headwords, cedict.json ${mb('cedict.json')} MB, wasm ${mb('jieba_rs_wasm_bg.wasm')} MB`);
