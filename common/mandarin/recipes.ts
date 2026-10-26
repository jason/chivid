import { subtitleStyleForDisabling, subtitleStyleForEnabling } from '@project/common/mandarin/subtitle-style';
import { defaultKnownCharacters, engineUrlForKnownCharacters } from '@project/common/mandarin/known-characters';
import { AutoPausePreference, PlayMode } from '@project/common/src/model';
import { AutoPauseResumeMode, SubtitleVisibility } from '@project/common/settings/settings';
import type { AsbplayerSettings } from '@project/common/settings/settings';
import type { Recipe } from '@project/common/settings/settings-recipes';
import { defaultDictionaryTracks, TokenStatus } from '@project/common/settings/settings-dictionary';
import type { DictionaryTrack } from '@project/common/settings/settings-dictionary';
import { mandarinEngineUrl } from '@project/common/mandarin/engine/engine-url';

export type MandarinRecipeId = 'justWatch' | 'ears' | 'listenFirst' | 'shadow';

/** The three learning recipes the Mandarin Edition adds when it is turned on. */
export const mandarinRecipes: readonly (Recipe & { readonly id: MandarinRecipeId })[] = [
    {
        id: 'justWatch',
        name: 'Just Watch',
        playbackModes: [PlayMode.normal],
        settings: { subtitleVisibility: SubtitleVisibility.whenDue, hideUntilRevealed: false },
    },
    {
        id: 'ears',
        name: 'Ears',
        playbackModes: [PlayMode.normal],
        settings: { subtitleVisibility: SubtitleVisibility.whenDue, hideUntilRevealed: true },
    },
    {
        id: 'listenFirst',
        name: 'Listen First',
        playbackModes: [PlayMode.autoPause],
        settings: {
            subtitleVisibility: SubtitleVisibility.whenDue,
            hideUntilRevealed: true,
            autoPausePreference: AutoPausePreference.atEnd,
            autoPauseResumeMode: AutoPauseResumeMode.manual,
            repeatCountPreference: 1,
        },
    },
    {
        // Speaking practice: hear the line, then say it in a pause 1.3 times as long as the line.
        id: 'shadow',
        name: 'Shadow',
        playbackModes: [PlayMode.autoPause],
        settings: {
            subtitleVisibility: SubtitleVisibility.whenDue,
            hideUntilRevealed: false,
            autoPausePreference: AutoPausePreference.atEnd,
            autoPauseResumeMode: AutoPauseResumeMode.subtitleDuration,
            autoPauseDurationFactor: 1.3,
            autoPauseMinimumDurationMs: 1200,
            autoPauseMaximumDurationMs: 12000,
            autoPauseResumeDelayMs: 0,
            repeatCountPreference: 1,
        },
    },
];

/** Recognises one of the seeded recipes by name, so the overlay can give it its own icon. */
export const mandarinRecipeId = (recipe: Pick<Recipe, 'name'> | undefined): MandarinRecipeId | undefined =>
    mandarinRecipes.find((candidate) => candidate.name === recipe?.name)?.id;

export const recipeCycleShortcut = { keys: 'shift+L' };

/**
 * Settings to write when the learner turns the Mandarin Edition on: adds any of the four
 * recipes they do not already have (matched by name, so renamed or edited copies are left alone)
 * and binds Shift+L to the next recipe if that shortcut is free. Never changes the active recipe.
 */
/**
 * Points a subtitle track's annotation at the built-in Mandarin engine, with pinyin and the
 * English gloss shown on hover for words that are not yet known (uncollected, unknown, learning).
 */
export const mandarinEngineTrack = (track: DictionaryTrack, knownCharacters?: string): DictionaryTrack => {
    const config = track.dictionaryTokenAnnotationConfig;
    return {
        ...track,
        dictionaryYomitanUrl:
            knownCharacters === undefined ? mandarinEngineUrl : engineUrlForKnownCharacters(knownCharacters),
        dictionaryYomitanParser: 'scanning-parser',
        dictionaryTokenAnnotationConfig: {
            ...config,
            video: {
                ...config.video,
                reading: { ...config.video.reading, onHoverEnabled: true },
                gloss: { ...config.video.gloss, onHoverEnabled: true },
            },
            // In the subtitle list, readings stay in the resting text (styled as an underline under
            // unknown characters, pinyin hidden) and come up with the meaning when the row is hovered.
            subtitlePlayer: {
                ...config.subtitlePlayer,
                reading: { ...config.subtitlePlayer.reading, onHoverEnabled: false },
                gloss: { ...config.subtitlePlayer.gloss, onHoverEnabled: true },
            },
            onStatuses: config.onStatuses.map((options, status) => ({
                ...options,
                reading: status <= TokenStatus.LEARNING,
                gloss: status <= TokenStatus.LEARNING,
            })),
        },
    };
};

export const settingsForEnablingMandarin = (
    settings: Pick<AsbplayerSettings, 'recipes' | 'keyBindSet'> & Partial<AsbplayerSettings>
): Partial<AsbplayerSettings> => {
    // First enable: start from HSK 1-2, so pinyin appears only over characters past that level.
    const seedKnown = !settings.mandarinKnownCharacters;
    const known = seedKnown ? defaultKnownCharacters() : settings.mandarinKnownCharacters;
    const existingNames = new Set(settings.recipes.map((recipe) => recipe.name));
    const missing = mandarinRecipes
        .filter((recipe) => !existingNames.has(recipe.name))
        .map(({ name, playbackModes, settings: recipeSettings }) => ({
            name,
            playbackModes,
            settings: recipeSettings,
        }));
    const cycleIsFree = !settings.keyBindSet.cycleRecipesForward.keys;
    // Track 1 switches to the engine only while it still has upstream's default Yomitan address,
    // so a learner who already set up Yomitan keeps their setup.
    const tracks = settings.dictionaryTracks;
    const firstTrackIsDefault =
        tracks !== undefined && tracks[0]?.dictionaryYomitanUrl === defaultDictionaryTracks[0].dictionaryYomitanUrl;
    return {
        ...subtitleStyleForEnabling(settings),
        mandarinEditionEnabled: true,
        ...(seedKnown ? { mandarinKnownCharacters: known } : {}),
        ...(firstTrackIsDefault
            ? { dictionaryTracks: [mandarinEngineTrack(tracks[0], known), ...tracks.slice(1)] }
            : {}),
        ...(missing.length > 0 ? { recipes: [...settings.recipes, ...missing] } : {}),
        ...(cycleIsFree ? { keyBindSet: { ...settings.keyBindSet, cycleRecipesForward: recipeCycleShortcut } } : {}),
    };
};

/** Settings to write when the learner turns the edition off: the flag, and upstream's subtitle look if untouched. */
export const settingsForDisablingMandarin = (settings: Partial<AsbplayerSettings>): Partial<AsbplayerSettings> => ({
    ...subtitleStyleForDisabling(settings),
    mandarinEditionEnabled: false,
});
