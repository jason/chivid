import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { readFileSync } from 'fs';
import { join } from 'path';
import LearningModeButton from '@project/common/components/LearningModeButton';
import { mandarinRecipes } from '@project/common/mandarin/recipes';
import type { Recipe } from '@project/common/settings';

const translations = JSON.parse(readFileSync(join(__dirname, '../locales/en.json'), 'utf8'));
const recipes: Recipe[] = [
    ...mandarinRecipes.map(({ name, playbackModes, settings }) => ({ name, playbackModes, settings })),
    { name: 'Dialogue focus', playbackModes: [2], settings: {} },
];

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('LearningModeButton', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        document.body.replaceChildren();
    });

    const render = async (
        activeRecipeId: number | null,
        onRecipeSelected = jest.fn(),
        onMenuOpenChange = jest.fn()
    ) => {
        const i18n = createInstance();
        await i18n.init({ lng: 'en', resources: { en: { translation: translations } } });
        await act(async () =>
            root.render(
                <I18nextProvider i18n={i18n}>
                    <LearningModeButton
                        recipes={recipes}
                        activeRecipeId={activeRecipeId}
                        onRecipeSelected={onRecipeSelected}
                        onMenuOpenChange={onMenuOpenChange}
                        cycleKeys="shift+L"
                    />
                </I18nextProvider>
            )
        );
        return { onRecipeSelected, onMenuOpenChange, button: container.querySelector('button')! };
    };

    it.each([
        [null, 'off', 'Mode: Off · shift+L next'],
        [0, 'justWatch', 'Mode: Just Watch · shift+L next'],
        [1, 'ears', 'Mode: Ears · shift+L next'],
        [2, 'listenFirst', 'Mode: Listen First · shift+L next'],
        [3, 'custom', 'Mode: Dialogue focus · shift+L next'],
    ])('shows recipe %p with its own icon and names it for screen readers', async (active, icon, label) => {
        const { button } = await render(active);
        expect(button.dataset.learningMode).toBe(icon);
        expect(button.getAttribute('aria-label')).toBe(label);
    });

    it('lists Off and every recipe, marks the active one, and selects on click', async () => {
        const { button, onRecipeSelected, onMenuOpenChange } = await render(1);
        await act(async () => button.click());

        const items = [...document.querySelectorAll('[role="menuitemradio"]')];
        expect(items.map((item) => item.textContent)).toEqual([
            'Off',
            'Just Watch',
            'Ears',
            'Listen First',
            'Dialogue focus',
        ]);
        expect(items.map((item) => item.getAttribute('aria-checked'))).toEqual([
            'false',
            'false',
            'true',
            'false',
            'false',
        ]);
        expect(onMenuOpenChange).toHaveBeenLastCalledWith(true, 5);

        await act(async () => (items[3] as HTMLElement).click());
        expect(onRecipeSelected).toHaveBeenCalledWith(2);
        expect(onMenuOpenChange).toHaveBeenLastCalledWith(false, 5);
    });

    it('turns recipes off from the menu and ignores choosing the active one', async () => {
        const { button, onRecipeSelected } = await render(1);
        await act(async () => button.click());
        await act(async () => (document.querySelectorAll('[role="menuitemradio"]')[2] as HTMLElement).click());
        expect(onRecipeSelected).not.toHaveBeenCalled();

        await act(async () => button.click());
        await act(async () => (document.querySelectorAll('[role="menuitemradio"]')[0] as HTMLElement).click());
        expect(onRecipeSelected).toHaveBeenCalledWith(null);
    });
});
