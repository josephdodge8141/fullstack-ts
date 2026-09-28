import {
  designSystemIds,
  type DesignSystemId,
  type DesignSystemPreference,
  type DesignSystemStatus,
} from '@app/schemas';

/**
 * The token contract every selectable preset must define in both light and dark mode.
 * `main.css` maps these into Tailwind's theme, so editing a value in a preset file
 * propagates to every component that consumes the matching utility.
 */
export const colorTokens = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
  'info',
  'info-foreground',
  'border',
  'input',
  'ring',
  'link',
  'selection',
  'selection-foreground',
  'overlay',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
] as const;

export const typeTokens = [
  'type-display',
  'type-body',
  'type-mono',
  'type-display-weight',
  'type-display-tracking',
  'type-body-tracking',
  'type-body-leading',
] as const;

export const shapeTokens = [
  'radius',
  'density',
  'elevation-xs',
  'elevation-sm',
  'elevation-md',
  'elevation-lg',
  'elevation-xl',
] as const;

export const motionTokens = [
  'motion-duration-fast',
  'motion-duration-base',
  'motion-duration-slow',
  'motion-duration-overlay',
  'motion-ease-standard',
  'motion-ease-enter',
  'motion-ease-exit',
  'motion-ease-emphasized',
  'motion-distance',
  'motion-scale',
  'motion-stagger',
] as const;

export const requiredTokens = [
  ...colorTokens,
  ...typeTokens,
  ...shapeTokens,
  ...motionTokens,
] as const;

export type RequiredToken = (typeof requiredTokens)[number];

export interface DesignSystemTypography {
  readonly display: string;
  readonly body: string;
  readonly mono: string;
}

export interface DesignSystemBrief {
  readonly id: DesignSystemId;
  readonly slot: string;
  readonly name: string;
  readonly status: DesignSystemStatus;
  readonly experience: string;
  readonly audience: string;
  readonly keywords: readonly string[];
  readonly typography: DesignSystemTypography | undefined;
}

const readyBriefs: Readonly<
  Partial<Record<DesignSystemId, Omit<DesignSystemBrief, 'id' | 'slot'>>>
> = {
  'ds-01': {
    name: 'Foundation',
    status: 'preview-ready',
    experience: 'A quiet neutral baseline that lets content and structure lead.',
    audience: 'Internal tools, admin consoles and the default starter.',
    keywords: ['neutral', 'balanced', 'unopinionated', 'grayscale'],
    typography: { display: 'Geist', body: 'Geist', mono: 'Geist Mono' },
  },
  'ds-02': {
    name: 'Harbor',
    status: 'preview-ready',
    experience: 'A crisp, trustworthy blue workspace tuned for dense product screens.',
    audience: 'B2B SaaS dashboards, analytics and operations products.',
    keywords: ['cool', 'precise', 'structured', 'dependable'],
    typography: { display: 'IBM Plex Sans', body: 'IBM Plex Sans', mono: 'IBM Plex Mono' },
  },
  'ds-03': {
    name: 'Hearth',
    status: 'preview-ready',
    experience: 'A warm editorial surface with soft corners and an unhurried rhythm.',
    audience: 'Content, community, wellness and consumer-facing products.',
    keywords: ['warm', 'editorial', 'soft', 'humane'],
    typography: { display: 'Fraunces', body: 'DM Sans', mono: 'JetBrains Mono' },
  },
  'ds-04': {
    name: 'Signal',
    status: 'preview-ready',
    experience: 'A sharp, high-contrast technical console with instant, mechanical feedback.',
    audience: 'Developer tools, monitoring, trading and command-driven products.',
    keywords: ['technical', 'high-contrast', 'square', 'fast'],
    typography: { display: 'JetBrains Mono', body: 'Space Grotesk', mono: 'JetBrains Mono' },
  },
};

export const designSystems: readonly DesignSystemBrief[] = designSystemIds.map((id) => {
  const slot = id.replace('ds-', 'DS-');
  const brief = readyBriefs[id];
  if (brief !== undefined) return { id, slot, ...brief };
  return {
    id,
    slot,
    name: `Open slot ${slot}`,
    status: 'open',
    experience: 'Not yet briefed.',
    audience: 'Open',
    keywords: [],
    typography: undefined,
  };
});

export const defaultDesignSystemPreference: DesignSystemPreference = {
  preset: 'ds-01',
  mode: 'light',
};

export function isSelectable(brief: DesignSystemBrief): boolean {
  return brief.status !== 'open';
}

export function selectableIds(): readonly DesignSystemId[] {
  return designSystems.filter(isSelectable).map((brief) => brief.id);
}
