// Mandarin Edition end-to-end user journeys.
// Run: pnpm --filter @project/extension run build && node --test --test-concurrency=1 e2e/mandarin/
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import * as h from './harness.mjs';

const learnerOwn = {
    subtitleVisibility: 'whenDue',
    autoPausePreference: 3,
    autoPauseResumeMode: 'subtitleLength',
    repeatCountPreference: 3,
};

let server;
before(async () => {
    server = await h.startServer();
});
after(async () => {
    await server.close();
});

/** Starts a fresh browser with the given settings, opens the player and loads the episode. */
const session = async (settings) => {
    const app = await h.launch();
    await h.setSettings(app.worker, h.baseSettings(settings));
    const page = await h.openPlayer(app.context, server.url);
    await h.dropSubtitles(page);
    return { ...app, page };
};

/** The three recipes Mandarin Edition adds, exactly as common/mandarin/recipes.ts defines them. */
const seededRecipes = [
    { name: 'Just Watch', playbackModes: [1], settings: { subtitleVisibility: 'whenDue', hideUntilRevealed: false } },
    { name: 'Ears', playbackModes: [1], settings: { subtitleVisibility: 'whenDue', hideUntilRevealed: true } },
    {
        name: 'Listen First',
        playbackModes: [3],
        settings: {
            subtitleVisibility: 'whenDue',
            hideUntilRevealed: true,
            autoPausePreference: 2,
            autoPauseResumeMode: 'manual',
            repeatCountPreference: 1,
        },
    },
];

/** Settings for a learner with the edition on and the named recipe active (null for none). */
const withRecipe = (name) => ({
    mandarinEditionEnabled: true,
    recipes: seededRecipes,
    activeRecipeId: name === null ? null : seededRecipes.findIndex((recipe) => recipe.name === name),
});

const line = (n) => h.lines[n - 1];
const insideLine = (n) => line(n).start + 400;

describe('Journey 1: a learner who has not turned Mandarin Edition on gets stock asbplayer', () => {
    it('shows subtitles when due and ignores every Mandarin key', async () => {
        const s = await session({ mandarinEditionEnabled: false });
        try {
            await h.seekTo(s.page, insideLine(2));
            assert.equal(await h.visibleSubtitle(s.page), line(2).text);

            for (const key of ['g', 'h', 'r', '[', ']', 'Shift+L']) await h.press(s.page, key);

            assert.equal(await h.visibleSubtitle(s.page), line(2).text);
            assert.deepEqual(await h.readLedger(s.worker), []);
            const { activeRecipeId } = await h.getSettings(s.worker, ['activeRecipeId']);
            assert.equal(activeRecipeId ?? null, null);
        } finally {
            await s.close();
        }
    });
});

describe('Journey 2: turning the edition on adds three recipes, and switching never touches the learner own settings', () => {
    it('adds Just Watch, Ears and Listen First after the learner own recipe and binds Shift+L', async () => {
        const app = await h.launch();
        try {
            const ownRecipe = { name: 'Dialogue focus', playbackModes: [2], settings: { playbackRate: 0.8 } };
            await h.setSettings(app.worker, h.baseSettings({ mandarinEditionEnabled: false, recipes: [ownRecipe] }));
            const settingsPage = await app.context.newPage();
            await settingsPage.goto(`chrome-extension://${app.extensionId}/options.html`);
            await settingsPage.getByRole('tab', { name: 'Misc' }).click();
            await settingsPage.getByLabel('Enable Mandarin Edition').check();
            await settingsPage.waitForTimeout(500);

            const stored = await h.getSettings(app.worker, ['mandarinEditionEnabled', 'recipes', 'keyBindSet']);
            assert.equal(stored.mandarinEditionEnabled, true);
            assert.deepEqual(
                stored.recipes.map((recipe) => recipe.name),
                ['Dialogue focus', 'Just Watch', 'Ears', 'Listen First']
            );
            assert.equal(stored.recipes[2].settings.hideUntilRevealed, true);
            assert.match(stored.keyBindSet.cycleRecipesForward.keys, /shift\+L|⇧\+L/i);
        } finally {
            await app.close();
        }
    });

    it('cycles the recipes with Shift+L and leaves the learner settings exactly as they were', async () => {
        const s = await session({
            ...withRecipe(null),
            ...learnerOwn,
            keyBindSet: { cycleRecipesForward: { keys: 'shift+L' } },
        });
        try {
            await h.seekTo(s.page, insideLine(2));

            const expectations = [
                ['Just Watch', 0, line(2).text],
                ['Ears', 1, ''],
                ['Listen First', 2, ''],
            ];
            for (const [name, id, visible] of expectations) {
                await h.press(s.page, 'Shift+L');
                await s.page.waitForTimeout(300);
                assert.match(await h.notificationText(s.page), new RegExp(`Recipe: ${name}`));
                assert.equal((await h.getSettings(s.worker, ['activeRecipeId'])).activeRecipeId, id);
                await h.seekTo(s.page, insideLine(2));
                assert.equal(await h.visibleSubtitle(s.page), visible, `${name} text visibility`);
            }

            await h.press(s.page, 'Shift+L');
            assert.equal((await h.getSettings(s.worker, ['activeRecipeId'])).activeRecipeId, null);
            const own = await h.getSettings(s.worker, Object.keys(learnerOwn));
            for (const [key, value] of Object.entries(learnerOwn)) assert.equal(own[key], value, key);
        } finally {
            await s.close();
        }
    });
});

describe('Journey 3: with the Ears recipe, a learner listens without text and marks what they understood', () => {
    it('keeps the line hidden while playing and while paused, until Reveal', async () => {
        const s = await session(withRecipe('Ears'));
        try {
            await h.seekTo(s.page, line(2).start - 300);
            await h.play(s.page);
            await s.page.waitForTimeout(900);
            assert.equal(await h.visibleSubtitle(s.page), '', 'hidden while playing');
            await h.pause(s.page);
            await s.page.waitForTimeout(300);
            assert.equal(await h.visibleSubtitle(s.page), '', 'pausing does not reveal');

            await h.press(s.page, 'r');
            assert.equal(await h.visibleSubtitle(s.page), line(2).text, 'Reveal shows the line');
        } finally {
            await s.close();
        }
    });

    it('records G on a hidden line, and refuses G once the line has been revealed', async () => {
        const s = await session(withRecipe('Ears'));
        try {
            await h.seekTo(s.page, insideLine(2));
            await h.press(s.page, 'g');
            assert.match(await h.notificationText(s.page), /Got it/);

            let ledger = await h.readLedger(s.worker);
            assert.equal(ledger.length, 1);
            assert.equal(ledger[0].kind, 'audio');
            assert.equal(ledger[0].result, 'got');
            assert.equal(ledger[0].sentence, line(2).text);
            assert.equal(ledger[0].recipe, 'Ears');
            assert.equal(ledger[0].start, line(2).start);
            assert.equal(ledger[0].sourceUrl, server.url);

            await h.seekTo(s.page, insideLine(3));
            await h.press(s.page, 'r');
            await h.press(s.page, 'g');
            assert.match(await h.notificationText(s.page), /already shown/);
            ledger = await h.readLedger(s.worker);
            assert.equal(ledger.length, 1, 'a revealed line is never counted as heard');
        } finally {
            await s.close();
        }
    });

    it('records H as missed, and still lets the learner change their mind before revealing', async () => {
        const s = await session(withRecipe('Ears'));
        try {
            await h.seekTo(s.page, insideLine(4));
            await h.press(s.page, 'h');
            await h.press(s.page, 'h');
            await h.press(s.page, 'g');
            const results = (await h.readLedger(s.worker)).map((e) => e.result);
            assert.deepEqual(results, ['missed', 'got'], 'a repeated identical mark is not duplicated');
        } finally {
            await s.close();
        }
    });

    it('does not treat Shift+R (upstream repeat) as Reveal', async () => {
        const s = await session(withRecipe('Ears'));
        try {
            await h.seekTo(s.page, insideLine(2));
            await h.press(s.page, 'Shift+R');
            assert.equal(await h.visibleSubtitle(s.page), '');
        } finally {
            await s.close();
        }
    });
});

describe('Journey 4: with the Just Watch recipe, text is on screen, so G and H are not listening evidence', () => {
    it('shows the line and refuses to record a mark for it', async () => {
        const s = await session(withRecipe('Just Watch'));
        try {
            await h.seekTo(s.page, insideLine(2));
            assert.equal(await h.visibleSubtitle(s.page), line(2).text);
            await h.press(s.page, 'g');
            assert.match(await h.notificationText(s.page), /already shown/);
            assert.deepEqual(await h.readLedger(s.worker), []);
        } finally {
            await s.close();
        }
    });
});

describe('Journey 5: a learner drills a short scene with the segment loop', () => {
    it('loops lines 1 to 2 with text hidden, gives a clean pass, then stops', async () => {
        const s = await session(withRecipe('Just Watch'));
        try {
            await h.seekTo(s.page, insideLine(1));
            await h.press(s.page, '[');
            assert.match(await h.notificationText(s.page), /Segment start marked/);

            await h.seekTo(s.page, insideLine(2));
            await h.press(s.page, ']');
            assert.match(await h.notificationText(s.page), /Looping segment/);
            await s.page.waitForFunction((t) => document.querySelector('video').currentTime * 1000 < t, line(2).start);
            assert.ok((await h.currentMs(s.page)) <= line(1).start + 500, 'jumped back to the start of the segment');

            await h.seekTo(s.page, insideLine(2));
            assert.equal(await h.visibleSubtitle(s.page), '', 'text hidden during the loop, even in Just Watch');

            await h.seekTo(s.page, line(2).end - 600);
            await h.play(s.page);
            await s.page.waitForFunction(
                (t) => {
                    const v = document.querySelector('video');
                    return !v.paused && v.currentTime * 1000 < t;
                },
                line(2).start,
                { timeout: 5000 }
            );

            await h.press(s.page, 'r');
            await h.press(s.page, '[');
            assert.match(await h.notificationText(s.page), /Clean pass/);

            await h.press(s.page, ']');
            assert.match(await h.notificationText(s.page), /Loop stopped/);
            await h.seekTo(s.page, insideLine(2));
            assert.equal(await h.visibleSubtitle(s.page), line(2).text, 'Just Watch shows text again after the loop');
        } finally {
            await s.close();
        }
    });
});

describe('Journey 6: the learner exports last night and hands it to their tutor', () => {
    it('exports the ledger from settings as JSONL with one object per mark', async () => {
        const s = await session(withRecipe('Ears'));
        try {
            await h.seekTo(s.page, insideLine(2));
            await h.press(s.page, 'h');
            await h.seekTo(s.page, insideLine(5));
            await h.press(s.page, 'g');

            const settingsPage = await s.context.newPage();
            await settingsPage.goto(`chrome-extension://${s.extensionId}/options.html`);
            await settingsPage.getByRole('tab', { name: 'Misc' }).click();
            const exportButton = settingsPage.getByRole('button', { name: 'Export learning ledger' });
            await exportButton.waitFor({ state: 'visible' });
            const [download] = await Promise.all([settingsPage.waitForEvent('download'), exportButton.click()]);
            assert.match(download.suggestedFilename(), /^mandarin-ledger-.*\.jsonl$/);

            const path = await download.path();
            const { readFile } = await import('node:fs/promises');
            const events = (await readFile(path, 'utf8'))
                .trim()
                .split('\n')
                .map((l) => JSON.parse(l));
            assert.deepEqual(
                events.map((e) => [e.result, e.sentence]),
                [
                    ['missed', line(2).text],
                    ['got', line(5).text],
                ]
            );

            const { execFileSync } = await import('node:child_process');
            const tool = new URL('../../tools/ledger_to_lesson.py', import.meta.url).pathname;
            const lesson = execFileSync('python3', [tool, path, '--hours', '1'], { encoding: 'utf8' });
            assert.match(lesson, /1 missed, 1 understood without text/);
            assert.ok(lesson.includes(`- ${line(2).text}  (0:04)`), lesson);
        } finally {
            await s.close();
        }
    });
});

describe('Journey 7: the learner sees and switches the mode from the on-video controls', () => {
    it('shows the active recipe as its own icon, and picks another from the vertical menu', async () => {
        const s = await session({ ...withRecipe('Ears'), streamingEnableOverlay: true });
        try {
            await h.seekTo(s.page, insideLine(2));
            await s.page.locator('video').hover();
            const overlay = await s.page.waitForEvent('frameattached', { timeout: 5000 }).catch(() => undefined);
            await s.page.waitForTimeout(1200);
            const frame = s.page.frames().find((f) => f.url().includes('mobile-video-overlay')) ?? overlay;
            assert.ok(frame, 'the on-video controls are showing');

            const button = frame.locator('[data-learning-mode]');
            assert.equal(await button.getAttribute('data-learning-mode'), 'ears');
            assert.match(await button.getAttribute('aria-label'), /^Mode: Ears/);

            await button.click();
            const items = frame.getByRole('menuitemradio');
            assert.deepEqual(await items.allTextContents(), ['Off', 'Just Watch', 'Ears', 'Listen First']);
            const box = await items.last().boundingBox();
            assert.ok(box && box.height > 20, 'the last item is fully visible, not clipped');

            await items.nth(1).click();
            await s.page.waitForFunction(
                () => document.querySelector('.asbplayer-subtitles-container-bottom')?.textContent?.length > 0,
                null,
                { timeout: 5000 }
            );
            assert.equal((await h.getSettings(s.worker, ['activeRecipeId'])).activeRecipeId, 0);
            assert.equal(await h.visibleSubtitle(s.page), line(2).text, 'Just Watch shows the line');
            await s.page.waitForTimeout(800);
            assert.equal(await frame.locator('[data-learning-mode]').getAttribute('data-learning-mode'), 'justWatch');
        } finally {
            await s.close();
        }
    });
});
