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
  'ds-05': () => import('./presets/ds-05-ledger.fonts.css'),
  'ds-06': () => import('./presets/ds-06-clinic.fonts.css'),
  'ds-07': () => import('./presets/ds-07-atlas.fonts.css'),
  'ds-08': () => import('./presets/ds-08-pulse.fonts.css'),
  'ds-09': () => import('./presets/ds-09-relay.fonts.css'),
  'ds-10': () => import('./presets/ds-10-studio.fonts.css'),
  'ds-11': () => import('./presets/ds-11-commons.fonts.css'),
  'ds-12': () => import('./presets/ds-12-merchant.fonts.css'),
  'ds-13': () => import('./presets/ds-13-folio.fonts.css'),
  'ds-14': () => import('./presets/ds-14-aurora.fonts.css'),
  'ds-15': () => import('./presets/ds-15-grove.fonts.css'),
  'ds-16': () => import('./presets/ds-16-arcade.fonts.css'),
  'ds-17': () => import('./presets/ds-17-noir.fonts.css'),
  'ds-18': () => import('./presets/ds-18-riso.fonts.css'),
  'ds-19': () => import('./presets/ds-19-blueprint.fonts.css'),
  'ds-20': () => import('./presets/ds-20-brutal.fonts.css'),
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
