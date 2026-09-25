import {
  designSystemPreferenceSchema,
  type DesignSystemId,
  type DesignSystemPreference,
} from '@app/schemas';

import { defaultDesignSystemPreference, designSystems, isSelectable } from './registry.js';

export const designSystemPreferenceKey = 'design-system-preference';

/** Fonts beyond the default Geist family load only for the preset that needs them. */
const fontLoaders: Readonly<Partial<Record<DesignSystemId, () => Promise<unknown>>>> = {
  'ds-02': () => import('./presets/ds-02-harbor.fonts.css'),
  'ds-03': () => import('./presets/ds-03-hearth.fonts.css'),
  'ds-04': () => import('./presets/ds-04-signal.fonts.css'),
};

/**
 * Reads the saved preference. Corrupt JSON, unknown ids and open slots all recover to the
 * default so a partial skin is never applied.
 */
export function readDesignSystemPreference(storage: Storage): DesignSystemPreference {
  let raw: string | null;
  try {
    raw = storage.getItem(designSystemPreferenceKey);
  } catch {
    return defaultDesignSystemPreference;
  }
  if (raw === null) return defaultDesignSystemPreference;
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    return defaultDesignSystemPreference;
  }
  const parsed = designSystemPreferenceSchema.safeParse(candidate);
  if (!parsed.success) return defaultDesignSystemPreference;
  const brief = designSystems.find((entry) => entry.id === parsed.data.preset);
  if (brief === undefined || !isSelectable(brief)) {
    return { ...defaultDesignSystemPreference, mode: parsed.data.mode };
  }
  return parsed.data;
}

export function saveDesignSystemPreference(
  storage: Storage,
  preference: DesignSystemPreference,
): void {
  try {
    storage.setItem(designSystemPreferenceKey, JSON.stringify(preference));
  } catch {
    // Storage can be unavailable (private mode, quota); the in-memory choice still applies.
  }
}

export function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyDesignSystemPreference(
  root: HTMLElement,
  preference: DesignSystemPreference,
): void {
  root.dataset.theme = preference.preset;
  const dark = preference.mode === 'dark' || (preference.mode === 'system' && prefersDark());
  root.classList.toggle('dark', dark);
  const loadFonts = fontLoaders[preference.preset];
  if (loadFonts !== undefined) void loadFonts();
}
