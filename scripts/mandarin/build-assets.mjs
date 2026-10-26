#!/usr/bin/env node
// Builds the Mandarin Edition engine assets into extension/public/mandarin/:
//   cedict.txt  CC-CEDICT packed one entry per line (format: packedTextSource in
//               common/mandarin/engine/dictionary.ts), at most four glosses per entry
//   jieba_rs_wasm_bg.wasm  the jieba segmenter, loaded with the engine in the offscreen document
// CC-CEDICT is licensed CC BY-SA 4.0 (https://cc-cedict.org); attribution ships alongside.
import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'extension', 'public', 'mandarin');
const require = createRequire(join(root, 'package.json'));
mkdirSync(out, { recursive: true });

const cedictPath = join(dirname(require.resolve('cedict-json')), 'cedict.json');
const rows = JSON.parse(readFileSync(cedictPath, 'utf8'));
// Mirrors packCedictText in common/mandarin/engine/dictionary.ts (dictionary.test.ts checks they agree).
const maxGlossesPerEntry = 4;
const groups = new Map();
for (const row of rows) {
    const traditional = row.traditional === row.simplified ? '' : row.traditional;
    const glosses = row.english.slice(0, maxGlossesPerEntry).join('\u001f');
    const line = `${row.simplified}\t${traditional}\t${row.pinyin}\t${glosses}`;
    const group = groups.get(row.simplified);
    if (group) group.push(line);
    else groups.set(row.simplified, [line]);
}
writeFileSync(join(out, 'cedict.txt'), [...groups.values()].map((lines) => lines.join('\n')).join('\n'));
rmSync(join(out, 'cedict.json'), { force: true });

const extensionRequire = createRequire(join(root, 'extension', 'package.json'));
const jiebaWeb = join(dirname(extensionRequire.resolve('jieba-wasm/web')), 'jieba_rs_wasm_bg.wasm');
copyFileSync(jiebaWeb, join(out, 'jieba_rs_wasm_bg.wasm'));

const cedictVersion = JSON.parse(readFileSync(join(dirname(cedictPath), 'package.json'), 'utf8')).version;
writeFileSync(
    join(out, 'ATTRIBUTION.txt'),
    `CC-CEDICT (cedict-json ${cedictVersion}), https://cc-cedict.org, licensed CC BY-SA 4.0.\n` +
        `jieba-rs (jieba-wasm), MIT License.\n` +
        `HSK 3.0 character levels (common/mandarin/hsk-characters.ts), derived from drkameleon/complete-hsk-vocabulary, MIT License.\n`
);

const mb = (file) => (statSync(join(out, file)).size / 1e6).toFixed(1);
console.log(
    `mandarin assets: ${groups.size} headwords, cedict.txt ${mb('cedict.txt')} MB, wasm ${mb('jieba_rs_wasm_bg.wasm')} MB`
);
