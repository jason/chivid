import { AutoPausePreference, PlayMode } from '@project/common/src/model';
import { AutoPauseResumeMode, SubtitleVisibility } from '@project/common/settings/settings';
import type { AsbplayerSettings } from '@project/common/settings/settings';
import type { Recipe } from '@project/common/settings/settings-recipes';

export type MandarinRecipeId = 'justWatch' | 'ears' | 'listenFirst';

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
];

/** Recognises one of the seeded recipes by name, so the overlay can give it its own icon. */
export const mandarinRecipeId = (recipe: Pick<Recipe, 'name'> | undefined): MandarinRecipeId | undefined =>
    mandarinRecipes.find((candidate) => candidate.name === recipe?.name)?.id;

export const recipeCycleShortcut = { keys: 'shift+L' };

/**
 * Settings to write when the learner turns the Mandarin Edition on: adds any of the three
 * recipes they do not already have (matched by name, so renamed or edited copies are left alone)
 * and binds Shift+L to the next recipe if that shortcut is free. Never changes the active recipe.
 */
export const settingsForEnablingMandarin = (
    settings: Pick<AsbplayerSettings, 'recipes' | 'keyBindSet'>
): Partial<AsbplayerSettings> => {
    const existingNames = new Set(settings.recipes.map((recipe) => recipe.name));
    const missing = mandarinRecipes
        .filter((recipe) => !existingNames.has(recipe.name))
        .map(({ name, playbackModes, settings: recipeSettings }) => ({
            name,
            playbackModes,
            settings: recipeSettings,
        }));
    const cycleIsFree = !settings.keyBindSet.cycleRecipesForward.keys;
    return {
        mandarinEditionEnabled: true,
        ...(missing.length > 0 ? { recipes: [...settings.recipes, ...missing] } : {}),
        ...(cycleIsFree ? { keyBindSet: { ...settings.keyBindSet, cycleRecipesForward: recipeCycleShortcut } } : {}),
    };
};
