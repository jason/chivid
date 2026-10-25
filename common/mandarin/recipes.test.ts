import { defaultKnownCharacters, engineUrlForKnownCharacters } from '@project/common/mandarin/known-characters';
import { describe, expect, it } from '@jest/globals';
import { defaultSettings, normalizeRecipe } from '@project/common/settings';
import {
    mandarinRecipeId,
    mandarinRecipes,
    settingsForDisablingMandarin,
    settingsForEnablingMandarin,
} from '@project/common/mandarin/recipes';
import { mandarinSubtitleStyle } from '@project/common/mandarin/subtitle-style';

describe('Mandarin recipes', () => {
    it('are valid upstream recipes that keep hideUntilRevealed', () => {
        for (const recipe of mandarinRecipes) {
            const normalized = normalizeRecipe({
                name: recipe.name,
                playbackModes: recipe.playbackModes,
                settings: recipe.settings,
            });
            expect(normalized?.name).toBe(recipe.name);
            expect(normalized?.settings.hideUntilRevealed).toBe(recipe.settings.hideUntilRevealed);
        }
    });

    it('turn auto-pause on only in Listen First', () => {
        expect(mandarinRecipes.map((r) => [r.id, r.playbackModes])).toEqual([
            ['justWatch', [1]],
            ['ears', [1]],
            ['listenFirst', [3]],
        ]);
    });

    it('are added after the learner own recipes when the edition is enabled, with Shift+L bound', () => {
        const own = { name: 'Dialogue focus', playbackModes: [2], settings: {} };
        const changes = settingsForEnablingMandarin({ ...defaultSettings, recipes: [own] });
        expect(changes.mandarinEditionEnabled).toBe(true);
        expect(changes.recipes?.map((r) => r.name)).toEqual(['Dialogue focus', 'Just Watch', 'Ears', 'Listen First']);
        expect(changes.keyBindSet?.cycleRecipesForward.keys).toBe('shift+L');
        expect(changes).not.toHaveProperty('activeRecipeId');
    });

    it('do not duplicate recipes or replace a shortcut the learner already chose', () => {
        const settings = {
            ...defaultSettings,
            recipes: [{ name: 'Ears', playbackModes: [1], settings: { hideUntilRevealed: false } }],
            keyBindSet: { ...defaultSettings.keyBindSet, cycleRecipesForward: { keys: 'ctrl+R' } },
        };
        const changes = settingsForEnablingMandarin(settings);
        expect(changes.recipes?.map((r) => r.name)).toEqual(['Ears', 'Just Watch', 'Listen First']);
        expect(changes.recipes?.[0].settings.hideUntilRevealed).toBe(false);
        expect(changes).not.toHaveProperty('keyBindSet');
    });

    it('recognise seeded recipes by name for their icons', () => {
        expect(mandarinRecipeId({ name: 'Ears' })).toBe('ears');
        expect(mandarinRecipeId({ name: 'My recipe' })).toBeUndefined();
        expect(mandarinRecipeId(undefined)).toBeUndefined();
    });

    it('points track 1 at the built-in engine with pinyin on hover for words not yet known', () => {
        const change = settingsForEnablingMandarin(defaultSettings);
        const track = change.dictionaryTracks![0];
        expect(track.dictionaryYomitanUrl).toBe(engineUrlForKnownCharacters(defaultKnownCharacters()));
        expect(track.dictionaryTokenAnnotationConfig.video.reading.onHoverEnabled).toBe(true);
        expect(track.dictionaryTokenAnnotationConfig.video.gloss.onHoverEnabled).toBe(true);
        expect(track.dictionaryTokenAnnotationConfig.onStatuses.map((s) => s.gloss)).toEqual([
            true,
            true,
            true,
            false,
            false,
            false,
        ]);
        expect(track.dictionaryTokenAnnotationConfig.onStatuses.map((s) => s.reading)).toEqual([
            true,
            true,
            true,
            false,
            false,
            false,
        ]);
        expect(change.dictionaryTracks!.slice(1)).toEqual(defaultSettings.dictionaryTracks.slice(1));
    });

    it('leaves a track the learner already pointed at their own Yomitan', () => {
        const ownYomitan = { ...defaultSettings.dictionaryTracks[0], dictionaryYomitanUrl: 'http://127.0.0.1:9999' };
        const change = settingsForEnablingMandarin({
            ...defaultSettings,
            dictionaryTracks: [ownYomitan, ...defaultSettings.dictionaryTracks.slice(1)],
        });
        expect(change.dictionaryTracks).toBeUndefined();
    });

    it('seeds HSK 1-2 as known characters the first time only', () => {
        expect(settingsForEnablingMandarin(defaultSettings).mandarinKnownCharacters).toBe(defaultKnownCharacters());
        const again = settingsForEnablingMandarin({ ...defaultSettings, mandarinKnownCharacters: '我' });
        expect(again.mandarinKnownCharacters).toBeUndefined();
        expect(again.dictionaryTracks![0].dictionaryYomitanUrl).toBe(engineUrlForKnownCharacters('我'));
    });
});

describe('Mandarin Edition subtitle look', () => {
    it('restyles untouched upstream subtitles on enable and restores them on disable', () => {
        const enabled = { ...defaultSettings, ...settingsForEnablingMandarin(defaultSettings) };
        expect(enabled.subtitleBackgroundOpacity).toBe(mandarinSubtitleStyle.subtitleBackgroundOpacity);
        expect(enabled.subtitleThickness).toBe(500);
        const disabled = { ...enabled, ...settingsForDisablingMandarin(enabled) };
        expect(disabled.mandarinEditionEnabled).toBe(false);
        expect(disabled.subtitleThickness).toBe(defaultSettings.subtitleThickness);
        expect(disabled.subtitleCustomStyles).toEqual(defaultSettings.subtitleCustomStyles);
    });

    it("never touches a learner's own subtitle look", () => {
        const own = { ...defaultSettings, subtitleThickness: 400 };
        expect(settingsForEnablingMandarin(own).subtitleThickness).toBeUndefined();
        const edited = {
            ...defaultSettings,
            ...settingsForEnablingMandarin(defaultSettings),
            subtitleBackgroundOpacity: 0.8,
        };
        expect(settingsForDisablingMandarin(edited)).toEqual({ mandarinEditionEnabled: false });
    });
});
