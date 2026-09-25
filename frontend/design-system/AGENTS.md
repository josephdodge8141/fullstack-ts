# frontend/design-system instructions

## Purpose

Curated, preloaded component-system extensions built on the fixed shadcn/ui base.

## Required boundaries

Keep the pinned base in `frontend/components/ui` unchanged. Extensions here are part of the reusable system and exempt from the application three-caller rule. Use semantic Tailwind tokens, typed APIs, accessible states, and reduced-motion behavior. Keep application data access and app-specific composition outside this directory.

`themes/main.css` is the single Tailwind entry that maps the semantic token contract in `themes/registry.ts` onto every utility. Each file in `themes/presets` is the editable master form of one design system and must define every required token in light mode and every color token in dark mode. Components reference semantic tokens, never preset names. Adding a preset means a brief in `registry.ts`, a preset file imported by `main.css`, an optional lazily loaded `.fonts.css` file, and passing `presets.test.ts` plus the `design-systems` behaviors.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run focused checks and the relevant root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives.
