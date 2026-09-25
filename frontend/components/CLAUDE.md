# frontend/components instructions

## Purpose

The fixed shadcn/ui foundation and application-created shared visual UI have separate homes.

## Required boundaries

Keep the pinned shadcn/ui base set in `ui/`. It is exempt from the three-caller rule and closed to additions, including new upstream catalog entries. A reviewed upgrade may update existing base files; adding a new base entry requires the owner to redefine the pinned set explicitly. Put new design-system work on top in `frontend/design-system`.

Put application-created reusable compositions in `app/` only after three distinct production callers can exercise the same complete input/output contract. Keep one-use behavior local and two-use fragments duplicated. Never place application compositions in `ui/`.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
