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
  /** The mode the preset is designed around; the gallery opens it this way unless a mode was chosen. */
  readonly defaultMode: 'light' | 'dark';
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
    defaultMode: 'light',
  },
  'ds-02': {
    name: 'Harbor',
    status: 'preview-ready',
    experience: 'A crisp, trustworthy blue workspace tuned for dense product screens.',
    audience: 'B2B SaaS dashboards, analytics and operations products.',
    keywords: ['cool', 'precise', 'structured', 'dependable'],
    typography: { display: 'IBM Plex Sans', body: 'IBM Plex Sans', mono: 'IBM Plex Mono' },
    defaultMode: 'light',
  },
  'ds-03': {
    name: 'Hearth',
    status: 'preview-ready',
    experience: 'A warm editorial surface with soft corners and an unhurried rhythm.',
    audience: 'Content, community, wellness and consumer-facing products.',
    keywords: ['warm', 'editorial', 'soft', 'humane'],
    typography: { display: 'Fraunces', body: 'DM Sans', mono: 'JetBrains Mono' },
    defaultMode: 'light',
  },
  'ds-04': {
    name: 'Signal',
    status: 'preview-ready',
    experience: 'A sharp, high-contrast technical console with instant, mechanical feedback.',
    audience: 'Developer tools, monitoring, trading and command-driven products.',
    keywords: ['technical', 'high-contrast', 'square', 'fast'],
    typography: { display: 'JetBrains Mono', body: 'Space Grotesk', mono: 'JetBrains Mono' },
    defaultMode: 'light',
  },
  'ds-05': {
    name: 'Ledger',
    status: 'preview-ready',
    experience: 'A precise navy and emerald finance workspace built around trustworthy numbers.',
    audience: 'Fintech, accounting, billing and banking dashboards.',
    keywords: ['precise', 'trustworthy', 'numeric', 'navy'],
    typography: { display: 'Manrope', body: 'Manrope', mono: 'Roboto Mono' },
    defaultMode: 'light',
  },
  'ds-06': {
    name: 'Clinic',
    status: 'preview-ready',
    experience: 'A calm, highly legible teal system with generous targets for care settings.',
    audience: 'Healthcare, patient portals, benefits and public services.',
    keywords: ['calm', 'legible', 'generous', 'teal'],
    typography: {
      display: 'Atkinson Hyperlegible Next',
      body: 'Atkinson Hyperlegible Next',
      mono: 'Atkinson Hyperlegible Mono',
    },
    defaultMode: 'light',
  },
  'ds-07': {
    name: 'Atlas',
    status: 'preview-ready',
    experience: 'A compact slate grid for enterprise data where every pixel carries information.',
    audience: 'ERP, logistics, CRM and internal data-heavy tools.',
    keywords: ['dense', 'slate', 'systematic', 'compact'],
    typography: { display: 'Inter Tight', body: 'Inter', mono: 'Fira Code' },
    defaultMode: 'light',
  },
  'ds-08': {
    name: 'Pulse',
    status: 'preview-ready',
    experience: 'A luminous violet and cyan analytics console on deep indigo.',
    audience: 'Product analytics, observability and real-time dashboards.',
    keywords: ['luminous', 'analytical', 'violet', 'live'],
    typography: { display: 'Sora', body: 'Sora', mono: 'Martian Mono' },
    defaultMode: 'dark',
  },
  'ds-09': {
    name: 'Relay',
    status: 'preview-ready',
    experience: 'A graphite developer platform with safety-orange signals and terse feedback.',
    audience: 'CI/CD, infrastructure, API platforms and developer consoles.',
    keywords: ['graphite', 'terse', 'engineered', 'orange'],
    typography: { display: 'Chivo', body: 'Chivo', mono: 'Chivo Mono' },
    defaultMode: 'dark',
  },
  'ds-10': {
    name: 'Studio',
    status: 'preview-ready',
    experience: 'A neutral charcoal workspace that stays out of the canvas, with a magenta pulse.',
    audience: 'Design, video, audio and other creative tools.',
    keywords: ['neutral', 'immersive', 'creative', 'magenta'],
    typography: { display: 'Outfit', body: 'Figtree', mono: 'Geist Mono' },
    defaultMode: 'dark',
  },
  'ds-11': {
    name: 'Commons',
    status: 'preview-ready',
    experience: 'A friendly, rounded blue-violet space for shared documents and teamwork.',
    audience: 'Collaboration, docs, wikis and project management.',
    keywords: ['friendly', 'rounded', 'collaborative', 'approachable'],
    typography: { display: 'Nunito', body: 'Nunito', mono: 'Source Code Pro' },
    defaultMode: 'light',
  },
  'ds-12': {
    name: 'Merchant',
    status: 'preview-ready',
    experience: 'A crisp white storefront admin with a bold, confident green.',
    audience: 'Commerce admin, point of sale, marketplaces and inventory.',
    keywords: ['crisp', 'confident', 'commercial', 'green'],
    typography: { display: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans', mono: 'DM Mono' },
    defaultMode: 'light',
  },
  'ds-13': {
    name: 'Folio',
    status: 'preview-ready',
    experience: 'An editorial magazine page: grand serif headlines, ink on paper, hairline rules.',
    audience: 'Publishing, long-form reading, portfolios and newsletters.',
    keywords: ['editorial', 'serif', 'inky', 'refined'],
    typography: { display: 'Playfair Display', body: 'Source Serif 4', mono: 'IBM Plex Mono' },
    defaultMode: 'light',
  },
  'ds-14': {
    name: 'Aurora',
    status: 'preview-ready',
    experience: 'Glassy night surfaces lit by teal and violet aurora light.',
    audience: 'Launch pages, AI products, music and immersive experiences.',
    keywords: ['glassy', 'luminous', 'nocturnal', 'gradient'],
    typography: { display: 'Unbounded', body: 'Albert Sans', mono: 'DM Mono' },
    defaultMode: 'dark',
  },
  'ds-15': {
    name: 'Grove',
    status: 'preview-ready',
    experience: 'Moss, sand and clay in an organic, grounded outdoor palette.',
    audience: 'Sustainability, outdoor, food and wellness brands.',
    keywords: ['organic', 'earthy', 'grounded', 'natural'],
    typography: { display: 'Lora', body: 'Source Sans 3', mono: 'Source Code Pro' },
    defaultMode: 'light',
  },
  'ds-16': {
    name: 'Arcade',
    status: 'preview-ready',
    experience: 'A playful pastel consumer app with pillowy shapes and springy motion.',
    audience: 'Consumer social, games, kids-adjacent and lifestyle apps.',
    keywords: ['playful', 'pastel', 'bouncy', 'rounded'],
    typography: { display: 'Fredoka', body: 'Quicksand', mono: 'Fira Code' },
    defaultMode: 'light',
  },
  'ds-17': {
    name: 'Noir',
    status: 'preview-ready',
    experience: 'A hushed luxury palette of near-black, ivory and brushed gold.',
    audience: 'Luxury retail, hospitality, private banking and premium tiers.',
    keywords: ['luxurious', 'hushed', 'gold', 'elegant'],
    typography: { display: 'Cormorant', body: 'Jost', mono: 'DM Mono' },
    defaultMode: 'dark',
  },
  'ds-18': {
    name: 'Riso',
    status: 'preview-ready',
    experience: 'Risograph print: blue and fluorescent pink inks on warm newsprint.',
    audience: 'Zines, events, indie publishing and creative agencies.',
    keywords: ['print', 'two-ink', 'fluorescent', 'indie'],
    typography: { display: 'Bricolage Grotesque', body: 'Work Sans', mono: 'Space Mono' },
    defaultMode: 'light',
  },
  'ds-19': {
    name: 'Blueprint',
    status: 'preview-ready',
    experience:
      'Technical drawing: drafting paper by day, white linework on blueprint blue by night.',
    audience: 'Engineering, hardware, architecture and technical documentation.',
    keywords: ['technical', 'linework', 'drafted', 'precise'],
    typography: { display: 'Azeret Mono', body: 'Archivo', mono: 'Azeret Mono' },
    defaultMode: 'light',
  },
  'ds-20': {
    name: 'Brutal',
    status: 'preview-ready',
    experience: 'Loud neo-brutalism: highlighter yellow, black ink and chunky offset shadows.',
    audience: 'Bold marketing sites, creator tools and attention-grabbing launches.',
    keywords: ['loud', 'raw', 'chunky', 'yellow'],
    typography: { display: 'Rubik', body: 'Rubik', mono: 'Space Mono' },
    defaultMode: 'light',
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
    defaultMode: 'light',
  };
});

export const defaultDesignSystemPreference: DesignSystemPreference = {
  preset: 'ds-01',
  mode: 'light',
  explicitMode: false,
};

export function isSelectable(brief: DesignSystemBrief): boolean {
  return brief.status !== 'open';
}

export function selectableIds(): readonly DesignSystemId[] {
  return designSystems.filter(isSelectable).map((brief) => brief.id);
}
