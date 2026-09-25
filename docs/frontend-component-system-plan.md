# Frontend component system: implementation plan

Status: **component breadth installed; full-depth audit and visual presets open**, 2026-09-25. Tailwind CSS v4 and the pinned shadcn/ui Base UI catalog from CLI 4.21.0 provide 61 component source files plus its local hook and utility. The fixed inventory is `frontend/ui-foundation.json`; the upstream MIT notice is in `frontend/components/ui/UPSTREAM-LICENSE.md`. `frontend/design-system/catalog.json` inventories curated additions: a searchable, sortable, selectable data grid; date/time controls; tree and transfer lists; rating, chip, floating action and speed dial controls; navigation; layout primitives; a workspace shell; and nine reusable page layouts. `/components` links to live examples. The per-instance motion ledger, exhaustive variant/accessibility audit, advanced data grid features, and twenty visual presets are still open. A passing example covers its tested interaction only.

## Product contract

The generated starter should contain a usable, editable application UI system on day one: accessible primitives, composed components, page layouts, navigation and content organization patterns, documentation, examples, and a deterministic motion contract. Twenty separate visual presets should reskin that same system, predominantly through color and type. A developer should be able to choose a preset and light, dark, or system mode without changing component markup.

“Full depth” means every catalog item has an explicit API and coverage for its applicable sizes, variants, states, keyboard behavior, responsive behavior, empty/loading/error cases, and motion. It does **not** mean forcing every possible feature into the default public landing page or treating a collection of screenshots as the library.

## Research and port decision

| Source                                                                                                                                                               | What it contributes                                                                                                                       | Decision                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [shadcn/ui](https://ui.shadcn.com/docs/components), [MIT source](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md)                                               | Editable React source, accessible primitive integrations, Tailwind v4 tokens, a broad component catalog, blocks and registry distribution | Preload the entire pinned official component catalog, including documented compositions, retain attribution, then own and test the copies. This is the foundation.                      |
| [coss ui](https://coss.com/ui/docs/get-started), [particles](https://coss.com/ui/particles), [licensing map](https://github.com/cosscom/coss/blob/main/LICENSING.md) | Broad Base UI/Tailwind system and many composition examples                                                                               | Evaluate in a small compatibility spike. Its repository has mixed licenses; copy only files whose paths and dependency chains are verified redistributable.                             |
| [Origin UI legacy](https://github.com/cosscom/coss/blob/main/apps/origin/README.md)                                                                                  | Many application patterns                                                                                                                 | Selectively adapt MIT patterns after checking each file's provenance.                                                                                                                   |
| [tweakcn-theme-picker](https://github.com/BankkRoll/tweakcn-theme-picker)                                                                                            | 43+ token themes, Vite adapter, light/dark selection                                                                                      | Candidate source for theme mechanics and initial token data. Create 20 original named presets and audit every copied token, font, and license. It is not a component or layout library. |
| [Magic UI](https://github.com/magicuidesign/magicui), [Motion Primitives](https://github.com/ibelick/motion-primitives/blob/main/LICENCE.md)                         | Optional motion recipes                                                                                                                   | Adapt only effects that serve a documented interaction, with reduced-motion behavior and license notices.                                                                               |
| [Shadcnblocks](https://www.shadcnblocks.com/license), [Animate UI license](https://github.com/imskyleen/animate-ui/blob/main/LICENSE.md)                             | Large catalogs or animated components                                                                                                     | Research references only. Their terms do not permit the planned public starter redistribution of copied bundles.                                                                        |

No researched project supplies the entire requested combination of redistributable primitives, application layouts, per-instance motion, and 20 complete skins. The direct-port strategy is therefore **the complete pinned shadcn/ui catalog plus a token-theme seed**, followed by owned composition and motion work. Lock exact upstream commits and record path, license, modifications, and update policy in a provenance manifest before copying source. Do not assume a repository-level license covers every nested package.

The [Material UI catalog](https://mui.com/material-ui/all-components/) is the breadth reference, not a dependency or a promise of identical APIs. Its input, data display, feedback, surface, and navigation families mostly map to the fixed shadcn set. The curated extension inventory fills visible gaps: rating, transfer list, chip, floating action, speed dial, bottom navigation, stepper, typography, autosizing textarea, app bar, paper, and the Box/Container/Grid/Stack/Image List layout set. It also supplies Masonry and Timeline from the MUI Lab category, plus local data grid, picker, and tree components analogous to MUI X categories. These extensions do not claim MUI X Pro/Premium capabilities. MUI's Number Field and some utilities (click-away, portal, No SSR, media query, and general transition helpers) do not yet have named counterparts here; existing native and Base UI internals cover some usage, but those names remain explicit audit gaps.

## Stack decision to make in the implementation chat

1. Use **shadcn/ui** as the component foundation. Choose one of its supported primitive engines for the pinned base install; the current default, Base UI, is the leading candidate. Validate Dialog, Menu, Select, Tooltip, Combobox, and focus behavior in this Vite app before committing. Avoid mixing engines for equivalent primitives.
2. Use Tailwind CSS v4, the official shadcn Vite setup, semantic CSS variables, `@theme inline`, and `components.json` with CSS variables enabled. Use `clsx`/`tailwind-merge` and variant tooling only where the installed components need them. Pin all versions in the root lockfile.
3. Keep `frontend/pages` responsible for page behavior and top-level layouts. Preload the pinned official shadcn/ui base set in `frontend/components/ui`. That directory is **closed to additions**, including future upstream catalog entries, and expressly exempt from the three-production-caller rule. A reviewed upgrade may update its existing files; adding to the set requires an explicit owner policy change. Put curated general component-system extensions and patterns in `frontend/design-system`, also exempt from caller counting. Put application-created reusable compositions in `frontend/components/app` only after three compatible production callers need the same full contract. One- and two-use app compositions stay local. The owner has adopted this distinction in the root and frontend instructions.
4. Preserve the default auth-free starter. Authentication, billing, real CRUD, and provider-specific workflows are not inferred from visual patterns.

## Package and source architecture

```text
frontend/
  components/
    ui/                 # pinned shadcn/ui catalog; fixed set, no additions
    app/                # app-specific compositions after three callers
  design-system/        # general extensions and organization patterns
  layouts/              # app shells and page templates, no service logic
  themes/
    contract.css        # canonical semantic tokens + Tailwind mapping
    presets/            # exactly 20 individual CSS preset files
    index.ts            # typed ids and lazy or static import map
    ThemeProvider.tsx   # preset × light/dark/system preference
  examples/             # catalog fixtures and documented usage
  pages/                # top-level behavior; starter remains public
```

The directories outside `components/ui` are proposed paths and must be checked against `source:check` before code lands. `components/ui` contains only the pinned upstream set; new universal capabilities belong in `design-system/`, and app-specific extracted compositions belong in `components/app`. The twenty files are **CSS token overrides consumed by Tailwind v4**, not twenty divergent Tailwind JavaScript configurations. The preset changes variables on a root selector such as `data-theme`; color mode is a separate selector. Component styles refer to semantic tokens, never preset names. Theme selection has a valid fallback for unknown, deleted, or corrupt persisted values and does not flash the wrong mode before hydration.

### Token contract

Define a typed, documented token inventory for: canvas and surface levels; foreground and muted text; primary/secondary/accent/destructive/success/warning/info; border, input, focus ring and selection; card/popover/menu/overlay; sidebar and navigation; charts and data series; link and visited link; disabled and skeleton; display/body/mono font stacks and type scale; line height and tracking; spacing and density; radius; borders and elevation; z-index; breakpoints/container widths; and motion duration, easing, displacement, stagger, and opacity. Every preset supplies both light and dark values for mandatory tokens. Optional tokens have a documented semantic fallback. Component classes consume these tokens through the [shadcn theme mapping](https://ui.shadcn.com/docs/theming) and [Tailwind `@theme`](https://tailwindcss.com/docs/theme).

Fonts must be locally bundled or loaded under an explicit policy, with weights, scripts, fallback metrics, and redistribution notices. The default should work offline in Compose and in a deployed preview. Presets must not import remote fonts implicitly.

## Component inventory and depth

The following is the implementation inventory, not a claim about a single upstream package. Each family needs a source/provenance decision, public API, example, keyboard and screen-reader contract, responsive story, and state/motion record.

The [official catalog snapshot reviewed on 2026-09-25](https://ui.shadcn.com/docs/components) includes: Accordion, Alert, Alert Dialog, Aspect Ratio, Attachment, Avatar, Badge, Breadcrumb, Bubble, Button, Button Group, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Combobox, Command, Context Menu, Data Table, Date Picker, Dialog, Direction, Drawer, Dropdown Menu, Empty, Field, Hover Card, Input, Input Group, Input OTP, Item, Kbd, Label, Marker, Menubar, Message, Message Scroller, Native Select, Navigation Menu, Pagination, Popover, Progress, Questionnaire, Radio Group, Resizable, Scroll Area, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Spinner, Switch, Table, Tabs, Textarea, Toast, Toggle, Toggle Group, Tooltip, and Typography. The implementation must account for **every entry** in the pinned snapshot, including entries that are recipes or package-backed rather than standalone files. Record any replacement or intentional exclusion with a reason and equivalent capability; silent omissions fail the inventory gate. The additional families below extend that baseline.

| Family                  | Required items and variations                                                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Actions                 | Button, icon button, button group, link button, toggle, toggle group, split action, copy action, floating action; primary/secondary/outline/ghost/destructive, sizes, loading, disabled, icon-only.                                                    |
| Inputs                  | Input, textarea, input group, search, password, number, currency, URL, date/time, file upload/dropzone, checkbox, radio group, switch, slider, select, combobox, multiselect, tags, color input, rating, OTP/PIN. Use native semantics where possible. |
| Forms                   | Field, label, hint, validation message, fieldset, form grid, stepper/wizard, dependent fields, submit bar, success/error summary, dirty-state prompt. Integrate schemas through a documented adapter; do not put API calls in primitives.              |
| Navigation              | Tabs, breadcrumb, pagination, command palette, menu bar, dropdown/context menu, navigation menu, sidebar, top bar, mobile drawer, tree navigation, step navigation, anchor/table of contents, skip link.                                               |
| Overlays                | Dialog, alert dialog, drawer/sheet, popover, hover card, tooltip, toast/sonner, banner, lightbox, nested overlay examples; focus trap, return focus, escape, scroll lock and stacking.                                                                 |
| Data display            | Badge, avatar/group, card, list, description list, table, data table, sortable/filterable/virtualized list recipes, chart wrappers, metric, progress, skeleton, timeline, calendar, empty state, error state, code block, markdown/prose, image/media. |
| Disclosure and feedback | Accordion, collapsible, carousel, resizable panels, scroll area, separator, spinner, inline status, callout, alert, activity feed, notification center, upload progress, undo affordance.                                                              |
| Organization patterns   | Filter bar, search-results layout, data-grid toolbar, bulk actions, saved views, faceted filters, grouping, sort, density toggle, column visibility, detail pane, master/detail, nested folders, drag reorder where justified.                         |
| Page layouts            | Marketing page, documentation, dashboard, analytics, table/list workspace, record detail, settings, editor, feed/inbox, gallery, form workflow, blank/empty/error/loading page; desktop/tablet/mobile and print where relevant.                        |

Catalog entries should list when _not_ to use a pattern, composition slots, required aria labels, test IDs only where semantic queries cannot work, and boundaries between UI-only demo data and real services. Advanced items such as virtualization, charts, calendars, and editors require explicit dependency and bundle-size decisions; a shallow mock does not count as completion.

## Motion contract for every instance

Maintain a machine-readable **component-state-motion ledger** with one row for every rendered catalog instance and every transition it supports. A row records component/variant/size, trigger, from/to states, animated properties, tokenized duration/easing/distance, interruption/reversal, focus timing, exit/unmount timing, reduced-motion result, and automated/visual evidence. A family-level animation statement is insufficient. Dynamic instances inherit the same resolved row from their variant and state; exceptional instances declare an override. The catalog can show the resolved motion record next to each example.

Required transition coverage:

| Instance class      | Transitions to specify and verify                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Action or control   | idle → hover → pressed → release; focus-visible; checked/selected; disabled; loading → success/error.                                                             |
| Field or form       | empty/fill/clear; focus/blur; valid/invalid; hint/error appearance; submit/pending/completion; value-dependent height.                                            |
| Navigation          | current/next selection, indicator movement, submenu open/close, sidebar expand/collapse, responsive drawer entrance/exit.                                         |
| Overlay             | trigger → enter → open → exit → unmount, nested overlay, escape/outside click, focus handoff, content resize.                                                     |
| Data and disclosure | loading/skeleton → content, empty/error/retry, sort/filter/page changes, accordion open/close, item insert/remove/reorder, chart data change.                     |
| Layout or route     | breakpoint changes, panel resize, sticky state, route content replacement, scroll restoration; no animation that delays navigation or shifts focus unpredictably. |

Default policy: animate transform and opacity when they communicate state; use tokenized CSS transitions for simple states and a single motion library only for transitions that need presence/layout orchestration. Avoid perpetual decoration in core controls. Cap durations in an agreed token scale, permit interrupted and reversed transitions, and keep overlays operable before animation completes. Honor `prefers-reduced-motion` and WCAG 2.2 motion requirements; reduced motion removes spatial travel and nonessential looping while preserving clear state feedback. No hidden content may remain focusable during exit. Theme switching itself must not cause a full-page transition or readability flash.

Motion acceptance is per **instance in the catalog**, including each variant and adverse state, at normal and reduced motion. Capture deterministic screenshots/video or transition assertions with animations controlled by test settings. Document intentional `none` values in the ledger; “no motion” is a specified outcome.

## Accessibility, quality, and performance gates

- Meet WCAG 2.2 AA for applicable color contrast and interaction behavior, including text (4.5:1 normal, 3:1 large), non-text UI boundaries (3:1), visible focus, keyboard access, target size where applicable, and reduced motion. Review semantic state announcements, errors, disabled states, and overlays manually with a screen reader sample.
- Verify all 20 presets in light and dark against a common fixture page: typography, actions, inputs, overlays, navigation/sidebar, table/chart, and status colors. Also test at 320px, common tablet/desktop widths, zoom to 200%, long text, and content overflow.
- Produce a catalog route or isolated preview that exercises every inventory item and its state matrix without requiring backend data. Keep it out of the starter's public product navigation if the product does not need it.
- Track bundle and CSS size before and after the port; use route splitting for heavy editor/chart/calendar examples. Prove a clean `npm ci`, Vite build, local Compose run, and generated clean clone still work.
- Record upstream source revision, license and local changes. Add a repeatable upgrade procedure; regenerated shadcn files must not silently overwrite owned accessibility, token, or motion changes.

## BDD → TDD delivery sequence

Before implementation, extend canonical `packages/cucumber/features` for the generated starter and factory. Give every scenario/example a stable case ID and represent it once in **both** backend and frontend reports. UI-only behavior can carry a justified backend no-op; factory packaging can have justified application-layer no-ops. Run the relevant adapters and see failing outcomes before implementing. Proposed behavior groups:

1. A clean generated starter installs, builds, and renders the default preset without network fonts or cloud credentials; rejected or missing preset files fail the factory validation.
2. Switching among preset, light/dark/system and reload restores the correct accessible token set; invalid saved values recover to default without a flash.
3. Catalog controls have keyboard, focus, disabled, loading, validation, overlay and responsive behavior, including adverse cases.
4. Every documented instance resolves a motion row, including reduced-motion and interrupted transitions; unknown states fail catalog validation.
5. Every preset has required token values, light/dark contrast evidence, font provenance, and visual regression fixtures.
6. The clean factory export contains the 20 CSS files, fonts, licenses, catalog metadata and required examples exactly once, with no personal assets or credentials.

For each vertical slice: author Gherkin and failing layer steps/tests; implement the UI and any factory tooling; run focused Cucumber, unit, Playwright and catalog checks; then run the root `npm run check`, `npm run proof:clean-clone`, and `npm run proof:docker` when available. A root gate green without real browser and generated-clone evidence is not the completion claim.

## Milestones and completion criteria

1. **Foundation installation (done):** pinned shadcn/ui Base UI, Tailwind v4, source inventory, MIT notice, and a browser-tested button/field/dialog sample. `public.hello` and the auth-free behavior remain. A second test theme and broader visual audit remain pending.
2. **Token and theme engine:** freeze the semantic contract, selector/mode behavior, font policy, and validation. Add the twenty named slots from the companion brief plan; flesh them out only after their descriptions are agreed.
3. **Primitive catalog:** import, normalize and test every required primitive with state and accessibility coverage.
4. **Composition and layout catalog (breadth installed, depth open):** organization patterns, the responsive workspace shell, and marketing, documentation, dashboard, detail, editor, inbox, gallery, form, and status layouts now ship with browser examples. Expand adverse states, keyboard and screen-reader checks, and responsive fixtures before calling the full-depth catalog complete.
5. **Motion pass:** complete every instance row, reduced-motion path, interruption behavior and evidence.
6. **Factory proof:** clean clone, local Compose, canonical Cucumber accounting, Playwright, preview verification and visual/theme audits. Record measured bundle cost and remaining gaps.

Completion requires an inventory with no unowned rows, no unknown motion rows, twenty complete preset files, passing required behavior reports, and an independently generated starter that demonstrates the component system. The twenty creative briefs are intentionally open; use [the brief plan](./design-system-briefs-plan.md) to develop them in a separate conversation.
