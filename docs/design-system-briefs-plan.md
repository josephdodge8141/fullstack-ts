# Twenty design-system briefs: conversation and delivery plan

Status: **all twenty presets preview-ready**, 2026-09-25. DS-01 to DS-04 are introductory baselines; DS-05 to DS-12 target SaaS products and DS-13 to DS-20 are exploratory. Five presets are dark-first. Executable tokens live in `frontend/design-system/themes/presets`, brief metadata in `frontend/design-system/themes/registry.ts`, and the live preview at `/design-systems`. None is approved until the owner reviews it.

## Purpose and boundaries

Each brief describes one original visual experience applied to the same [component system](./frontend-component-system-plan.md). The twenty experiences should differ meaningfully while keeping the same component APIs, behavior, keyboard handling, semantic states, page layouts, and accessibility baseline. Typography and color are the main differentiation. Radius, borders, elevation, density and motion accents may vary within the shared contracts. A preset must not require copying or editing the component tree.

Deliver **twenty individual Tailwind v4 compatible CSS preset files**, each with light and dark token sets, plus a typed preset registry and a short human-readable brief for each. “Tailwind file” here means a CSS token file consumed by Tailwind's `@theme` mapping, not a standalone Tailwind configuration or a duplicated component implementation. The shadcn semantic tokens are the minimum baseline; the component plan extends them for typography, status, organization layouts, and motion.

## How we will create the briefs together

Work in short rounds so the user can describe the desired experiences in their own words:

1. **Collect raw directions.** Ask for as many experiences as the user has in mind, in any order. A few words, references, use cases, or contrasts are enough. Keep unfilled slots open.
2. **Name and distinguish.** For each direction, propose a working name, audience/use case, three to five visual traits, and what must distinguish it from the other nineteen. The user edits or replaces these.
3. **Translate to tokens.** Propose display/body/mono font roles; light and dark palettes; brand, action, status, chart and sidebar relationships; surfaces, borders, focus; and restrained shape/elevation/motion accents. Explain only choices that affect the look.
4. **Show representative screens.** Apply candidate tokens to the same fixture set: marketing landing, dashboard, data table, form, detail page and mobile navigation, with overlays and adverse states. Compare at least two plausible directions when a brief is ambiguous.
5. **Resolve collisions.** Check visual distance among presets, readability, licensing of fonts/references, light/dark parity, and whether a signature look can be expressed by tokens. Ask for a decision only where the user's taste is necessary.
6. **Freeze one brief at a time.** Mark the brief approved for implementation only after its preview, tokens, accessibility results, and source notices are reviewable. Approval of one does not freeze the other nineteen.

References can guide a mood, but do not copy a brand's protected assets, names, or distinctive trade dress into a public factory preset. Existing theme packs such as [tweakcn-theme-picker](https://github.com/BankkRoll/tweakcn-theme-picker) can seed mechanics and color exploration under their licenses; the final twenty should be original, owner-chosen experiences.

## Brief template (repeat once per slot)

```text
ID: DS-01 through DS-20
Working name: [open]
Status: open | exploring | preview-ready | approved
One-sentence experience: [open]
Audience and likely product contexts: [open]
Visual keywords (3–5): [open]
Reference links/images and what to borrow conceptually: [open]
What should make it distinct from the other presets: [open]

Typography
  Display family, weights, fallback and usage: [open]
  Body family, weights, fallback and usage: [open]
  Mono/numeric family, weights, fallback and usage: [open]
  Font files/source, script coverage and redistribution license: [open]
  Type scale, line height, tracking and numeric style: [open]

Color (both light and dark, including hover/pressed/disabled)
  Canvas and surface hierarchy: [open]
  Text and muted text: [open]
  Primary, secondary, accent and links: [open]
  Destructive, success, warning and information: [open]
  Border, input, focus ring and text selection: [open]
  Navigation/sidebar, card, popover and overlay: [open]
  Chart/data series and data-density legibility: [open]

Supporting visual tokens
  Radius and shape language: [open]
  Border weight/treatment and shadow/elevation: [open]
  Density or spacing override, if truly needed: [open]
  Icon treatment, if it can stay within the shared icon system: [open]
  Motion accent (token values only) and reduced-motion result: [open]

Preview and acceptance
  Fixture screens and key component states: [open]
  Contrast and accessibility findings: [open]
  Similarities/collisions with other presets: [open]
  User decisions and revision notes: [open]
  Source/provenance and license notices: [open]
```

Only the **brief** carries subjective intent; CSS files carry executable values. The implementation should validate that every approved brief has a corresponding CSS file and that every file has one approved brief. Keep the slot IDs stable if working names change.

## Slot ledger

| ID    | Working name | Experience description                                                                      | Status        |
| ----- | ------------ | ------------------------------------------------------------------------------------------- | ------------- |
| DS-01 | Foundation   | Quiet neutral baseline; Geist; standard motion                                              | Preview-ready |
| DS-02 | Harbor       | Crisp blue product workspace; IBM Plex; dense, tight radius                                 | Preview-ready |
| DS-03 | Hearth       | Warm editorial cream and terracotta; Fraunces and DM Sans; soft, slow                       | Preview-ready |
| DS-04 | Signal       | High-contrast technical console; JetBrains Mono; square, hard shadows, fast                 | Preview-ready |
| DS-05 | Ledger       | SaaS fintech: navy and emerald, navy sidebar, tabular numbers; Manrope, Roboto Mono         | Preview-ready |
| DS-06 | Clinic       | SaaS healthcare: calm teal, larger type and targets; Atkinson Hyperlegible                  | Preview-ready |
| DS-07 | Atlas        | SaaS enterprise data: steel slate, tightest density; Inter Tight, Inter, Fira Code          | Preview-ready |
| DS-08 | Pulse        | Dark-first SaaS analytics: violet and cyan glow on indigo; Sora, Martian Mono               | Preview-ready |
| DS-09 | Relay        | Dark-first developer platform: graphite and safety orange, line elevation; Chivo            | Preview-ready |
| DS-10 | Studio       | Dark-first creative tools: neutral charcoal, magenta; Outfit, Figtree                       | Preview-ready |
| DS-11 | Commons      | SaaS collaboration: warm off-white, blue-violet, rounded; Nunito                            | Preview-ready |
| DS-12 | Merchant     | SaaS commerce admin: crisp white, bold green; Plus Jakarta Sans, DM Mono                    | Preview-ready |
| DS-13 | Folio        | Exploratory editorial: ink on paper, hairline rules; Playfair Display, Source Serif 4       | Preview-ready |
| DS-14 | Aurora       | Dark-first exploratory: glassy night, teal and violet glow; Unbounded, Albert Sans          | Preview-ready |
| DS-15 | Grove        | Exploratory nature: moss, sand and clay; Lora, Source Sans 3                                | Preview-ready |
| DS-16 | Arcade       | Exploratory playful: pastels, pill shapes, springy motion; Fredoka, Quicksand               | Preview-ready |
| DS-17 | Noir         | Dark-first luxury: near-black, ivory and gold, slow motion; Cormorant, Jost                 | Preview-ready |
| DS-18 | Riso         | Exploratory print: blue and fluorescent pink inks, pink offset shadows; Bricolage Grotesque | Preview-ready |
| DS-19 | Blueprint    | Exploratory technical: drafting paper, white-on-blueprint dark mode; Azeret Mono, Archivo   | Preview-ready |
| DS-20 | Brutal       | Exploratory neo-brutalist: yellow canvas, black ink, chunky shadows; Rubik                  | Preview-ready |

## Implementation notes

- `frontend/design-system/themes/main.css` is the single Tailwind entry. It maps every contract token into `@theme inline`, remaps the fixed base set's hard-coded durations, zoom, backdrops and slider thumb onto tokens, and imports each preset file.
- Preset colors for all selectable presets ship in the main stylesheet (small, and needed for flash-free restore). Non-default font families load lazily from `presets/*.fonts.css` only when their preset is active.
- `frontend/design-system/themes/presets.test.ts` enforces brief/file parity, `main.css` imports and full token coverage. The `design-systems` Cucumber feature verifies selection, dark mode, persistence, corrupt and open-slot fallback, overlay inheritance, token resolution and motion in the browser.
- `frontend/design-system/themes/contrast.test.ts` gates WCAG 2.2 contrast for every preset in light and dark: 4.5:1 for text pairs (foreground, card, popover, primary, secondary, muted, accent, status, link, selection and sidebar pairs) and 3:1 for the focus ring and chart series. `--border` and `--input` hairlines are a documented exception. All twenty pass. Large text, disabled states and screen-reader review are still manual.
- Dark-first presets declare `defaultMode: 'dark'` in the registry. Choosing one switches to dark until the person picks a mode; an explicit choice is remembered (`explicitMode`).

## Cross-preset quality bar

- Each preset must completely implement the required semantic token schema in light and dark mode. Unknown preset IDs and missing tokens fall back predictably; a partial skin is not selectable.
- Test normal and large text contrast, non-text boundaries, focus rings, status colors, chart legends and selection in both modes against [WCAG 2.2](https://www.w3.org/TR/wcag/). Record any exception with a concrete remediation plan before approval.
- Use the same fixture content and screen sizes for all twenty. Include long labels, dense tables, empty/error/loading states, dialogs, menus, validation, disabled and destructive actions, and reduced motion.
- Keep font files and notices with the factory export. Verify glyph coverage, fallbacks, loading behavior and layout shift. Prefer licensed local assets; do not require a third-party font request for the default starter.
- The common motion ledger remains authoritative. A preset may override documented duration/ease/distance tokens within agreed limits, but it cannot remove a required state, delay focus, or introduce unsolicited looping. Every resulting component instance still needs normal and reduced-motion evidence.
- Measure stylesheet/font weight and prove one selected preset does not require downloading all twenty font families. The CSS packaging strategy should allow all preset choices without a large initial payload.
- Preserve identifiable differences among the twenty: use side-by-side fixture review to detect near duplicates. A different primary hex value alone does not make a separate experience.

## Future implementation sequence

The implementation chat should first settle the shared token contract and a two-preset pilot, then author canonical Cucumber behavior with adverse cases and observe failing adapters/tests before adding runtime code. After the pilot, fill the remaining slots in conversation, generate CSS and previews from each approved brief, verify contrast and interaction states, and run the factory clean-clone and Compose proofs. The present document is a planning artifact and has no behavioral test result to report.

To resume the creative conversation, start with any slot or describe a handful of desired experiences. No need to provide all twenty at once.
