import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { cut, tag } from 'jieba-wasm';
import { MandarinDictionary, packCedict } from '@project/common/mandarin/engine/dictionary';
import type { Segmenter } from '@project/common/mandarin/engine/readings';

/** Test helpers: the packed dictionary the extension ships, and jieba's Node build. */
let dictionary: MandarinDictionary | undefined;
const packedPath = join(__dirname, '../../../extension/public/mandarin/cedict.json');

/** The packed file the extension ships if it has been built, otherwise packed here from cedict-json. */
export const testDictionary = () => {
    if (dictionary) return dictionary;
    if (existsSync(packedPath)) {
        dictionary = new MandarinDictionary(JSON.parse(readFileSync(packedPath, 'utf8')));
    } else {
        const require = createRequire(join(__dirname, '../../../package.json'));
        const cedictPath = join(dirname(require.resolve('cedict-json')), 'cedict.json');
        dictionary = new MandarinDictionary(packCedict(JSON.parse(readFileSync(cedictPath, 'utf8'))));
    }
    return dictionary;
};

export const nodeSegmenter: Segmenter = { cut: (text) => cut(text, false), tag: (text) => tag(text, false) };
