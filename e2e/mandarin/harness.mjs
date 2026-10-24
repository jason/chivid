// Shared harness for the Mandarin Edition end-to-end journeys.
// Loads the built extension into real Chromium (full headless), serves a local player page,
// and drops a Mandarin .srt onto the video exactly as a user would.
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');

const here = fileURLToPath(new URL('.', import.meta.url));
export const fixturesDir = join(here, 'fixtures');
export const extensionDir = process.env.CHIVID_EXTENSION_DIR ?? join(here, '..', '..', 'extension', '.output', 'chrome-mv3');

export const lines = [
    { start: 1000, end: 3000, text: '你今天怎么这么早？' },
    { start: 4000, end: 6500, text: '银行九点就开门了。' },
    { start: 7500, end: 9500, text: '我觉得这个便宜的银行不太好。' },
    { start: 11000, end: 13000, text: '那你为什么还去？' },
    { start: 14000, end: 16000, text: '因为离家近啊。' },
];

const contentTypes = { '.html': 'text/html; charset=utf-8', '.mp4': 'video/mp4', '.srt': 'text/plain; charset=utf-8' };

/** Serves the fixtures directory, with byte-range support so the video can seek. */
export const startServer = async () => {
    const server = createServer(async (req, res) => {
        const name = req.url === '/' ? 'player.html' : decodeURIComponent(req.url.slice(1).split('?')[0]);
        try {
            const body = await readFile(join(fixturesDir, name));
            const type = contentTypes[extname(name)] ?? 'application/octet-stream';
            const range = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
            if (range) {
                const start = Number(range[1]);
                const end = range[2] ? Number(range[2]) : body.length - 1;
                res.writeHead(206, {
                    'Content-Type': type,
                    'Content-Range': `bytes ${start}-${end}/${body.length}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': end - start + 1,
                });
                res.end(body.subarray(start, end + 1));
                return;
            }
            res.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length, 'Accept-Ranges': 'bytes' });
            res.end(body);
        } catch {
            res.writeHead(404);
            res.end();
        }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    return { url: `http://127.0.0.1:${port}/`, close: () => new Promise((resolve) => server.close(resolve)) };
};

export const launch = async () => {
    const profileDir = await mkdtemp(join(tmpdir(), 'chivid-e2e-'));
    const context = await chromium.launchPersistentContext(profileDir, {
        headless: false,
        acceptDownloads: true,
        viewport: { width: 1280, height: 800 },
        args: ['--headless=new', `--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`],
    });
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker', { timeout: 20000 });
    const extensionId = new URL(worker.url()).host;
    // Close the first-run tab the extension opens on install, so it cannot steal focus.
    for (const page of context.pages()) if (page.url().startsWith('chrome-extension://')) await page.close();
    context.on('page', (page) => {
        if (page.url().includes('ftue') || page.url().includes('tutorial')) void page.close();
    });
    return {
        context,
        worker,
        extensionId,
        close: async () => {
            await context.close();
            await rm(profileDir, { recursive: true, force: true });
        },
    };
};

/** Writes settings straight into the extension's storage, as the settings page would. */
export const setSettings = (worker, settings) => worker.evaluate((s) => chrome.storage.local.set(s), settings);

export const getSettings = (worker, keys) => worker.evaluate((k) => chrome.storage.local.get(k), keys);

/** Settings every journey starts from: subtitles go straight onto the video, no side list or app tab. */
export const baseSettings = (overrides = {}) => ({
    streamingSubtitleListPreference: 'noSubtitleList',
    streamingEnableOverlay: false,
    ...overrides,
});

export const readLedger = (worker) =>
    worker.evaluate(
        () =>
            new Promise((resolve, reject) => {
                const open = indexedDB.open('MandarinEditionDatabase');
                open.onerror = () => reject(open.error);
                open.onsuccess = () => {
                    const db = open.result;
                    if (!db.objectStoreNames.contains('events')) {
                        db.close();
                        resolve([]);
                        return;
                    }
                    const request = db.transaction('events').objectStore('events').getAll();
                    request.onsuccess = () => {
                        db.close();
                        resolve(request.result.map((row) => row.event));
                    };
                    request.onerror = () => reject(request.error);
                };
            })
    );

export const openPlayer = async (context, url) => {
    const page = await context.newPage();
    await page.goto(url);
    await page.waitForFunction(() => document.querySelector('video')?.readyState >= 3, null, { timeout: 15000 });
    await page.waitForSelector('.asbplayer-drag-zone-initial', { state: 'attached', timeout: 15000 });
    return page;
};

export const dropSubtitles = async (page) => {
    const srt = await readFile(join(fixturesDir, 'episode.srt'), 'utf8');
    await seekTo(page, 0);
    await page.evaluate((text) => {
        const transfer = new DataTransfer();
        transfer.items.add(new File([text], 'episode.srt', { type: 'text/plain' }));
        const zone = document.querySelector('.asbplayer-drag-zone-initial');
        zone.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }));
    }, srt);
    // The extension briefly shows the loaded file name where subtitles go; wait for it to clear.
    await page.waitForFunction(
        () => document.querySelector('.asbplayer-subtitles-container-bottom')?.textContent?.includes('episode.srt'),
        null,
        { timeout: 10000 }
    );
    await page.waitForFunction(
        () => !document.querySelector('.asbplayer-subtitles-container-bottom')?.textContent?.includes('episode.srt'),
        null,
        { timeout: 10000 }
    );
};

/** Pauses at a time and waits for the player to settle there. */
export const seekTo = async (page, ms) => {
    await page.evaluate((t) => {
        const video = document.querySelector('video');
        video.pause();
        video.currentTime = t / 1000;
    }, ms);
    await page.waitForFunction(
        (t) => {
            const video = document.querySelector('video');
            return !video.seeking && Math.abs(video.currentTime * 1000 - t) < 100;
        },
        ms,
        { timeout: 10000 }
    );
    await page.waitForTimeout(400);
};

export const play = (page) => page.evaluate(() => document.querySelector('video').play());
export const pause = (page) => page.evaluate(() => document.querySelector('video').pause());
export const currentMs = (page) => page.evaluate(() => Math.round(document.querySelector('video').currentTime * 1000));

/** Text the learner can actually see in the subtitle area. Empty when hidden. */
export const visibleSubtitle = (page) =>
    page.evaluate(() => {
        const containers = [...document.querySelectorAll('[class*="asbplayer-subtitles-container"]')];
        return containers
            .filter((el) => getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden')
            .map((el) => el.textContent ?? '')
            .join('')
            .trim();
    });

export const notificationText = (page) =>
    page.evaluate(() =>
        [...document.querySelectorAll('[class*="asbplayer-notification"]')]
            .map((el) => el.textContent ?? '')
            .join(' ')
            .trim()
    );

/** Presses a key the way a learner would, focused on the video page. */
export const press = async (page, key) => {
    await page.locator('video').hover();
    await page.keyboard.press(key);
    await page.waitForTimeout(250);
};
