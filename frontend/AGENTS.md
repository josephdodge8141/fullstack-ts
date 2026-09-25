# frontend instructions

## Purpose

The React application, top-level pages and browser acceptance support.

## Required boundaries

Keep most feature behavior in pages and validate every API response in services.

Use `components/ui` only for the pinned shadcn/ui base set. It is fixed, closed to additions and exempt from the three-caller rule. Build curated general design-system extensions in `design-system`, also exempt from caller counting. Put application-created reusable compositions in `components/app` only after three distinct compatible production callers need the full contract; otherwise keep them local to callers.

Keep the default starter public and auth-free. Add authentication only with new canonical behaviors and a real acceptance path.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
