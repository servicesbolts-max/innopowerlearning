---
name: add-ds-component
description: Add a component to the design system (src/design-system) with tokens, React Aria, i18n, a story in every theme and scheme, an axe test, and a showcase entry.
argument-hint: <ComponentName, e.g. RatingStars>
---

Add **$ARGUMENTS** to the design system. Read `docs/DESIGN_SYSTEM.md` and `.claude/rules/design-system.md` first.

1. **Check it does not exist.** Look in `src/design-system/index.ts`. Extend an existing component (a new variant or prop) before adding a new one.
2. **Files.** Create `src/design-system/components/$ARGUMENTS/`:
   - `$ARGUMENTS.tsx`: start with `"use client"` only if it uses state, effects, or React Aria.
   - `$ARGUMENTS.stories.tsx`
   - `$ARGUMENTS.test.tsx`, or add cases to the group test file next to it.
3. **Build on React Aria Components** for anything interactive (ADR 0003). Wrap the RAC primitive and merge classes with `withClass(className, base)` from `utils/cx`. Style states with RAC data attributes (`data-hovered`, `data-pressed`, `data-selected`, `data-focus-visible`, `data-disabled`, `data-entering`).
4. **Tokens only.** Use Tailwind classes mapped in `src/app/globals.css`:
   - Text: `text-label`, `text-label-secondary`, `text-accent-text`, `text-{status}-text`.
   - Fills: `bg-accent-fill` with `text-on-accent`; `bg-*-tint` with `text-*-text-on-tint`.
   - Control borders: `border-control-border` (3:1).
   - Radii: `rounded-control`, `rounded-card`, `rounded-sheet`.
   - Type: the type scale (`text-body`, `text-headline`, and so on).
   - Spacing: the 4 px step.

   Never use hex, rgb, named Tailwind colors, or `[…px]` values. `tests/tokens-only.test.ts` fails the build if you do. If you need a new token, add it to `src/lib/theme/tokens.ts` (and to the engine report when it carries text), map it in `globals.css`, and document it.

5. **Accessibility.**
   - Touch targets: `min-h-touch` (44 px), or `min-h-touch-dense` for admin.
   - Focus: the `focus-ring` utility on the focusable element.
   - Status is never shown by color alone: add text, an icon, or a shape.
   - Icons: `<Icon icon={…} size={16|20|24} />`, decorative unless given a `label`.
   - Motion: use `animate-pop-in`, `animate-sheet-up`, or `ease-spring`. The globals turn them into fades under reduced motion.
   - Do not put text on `material` unless the bar uses the engine's `--material-alpha`.
   - Anything that reads the clock renders after hydration (`useIsClient`).
6. **Strings.** Add internal labels ("Close", "Next page") to the `ds` namespace in `src/i18n/messages/en.json` and read them with `useTranslations("ds")`. Content strings come in as props.
7. **Story.** Use `title: "<Group>/<Name>"` and one story per meaningful state. The toolbar's "All themes and schemes" option renders it in 3 themes × light and dark. The a11y addon must show no violations.
8. **Test.** Start the file with `// @vitest-environment jsdom`, then render with `renderDs` from `../../testing`:
   - `await expectNoAxeViolations()`
   - keyboard behavior with `userEvent`
   - roles and names
9. **Export and showcase.** Export it from `src/design-system/index.ts` and add a demo to `src/app/(hub)/design/[theme]/showcase.tsx`, with strings in the `design` namespace.
10. **Verify.**
    - Run `pnpm gate` and `pnpm build-storybook`.
    - Build, then serve with `pnpm start --port 3100`.
    - Run `E2E_BASE_URL=http://localhost:3100 pnpm e2e`. This is axe on `/design/*` in light and dark, and it is the real contrast check.
    - Run `BASE_URL=http://localhost:3100 pnpm screenshots:design <dir>` and look at 390 and 1280 px.
11. **Docs.** Add a row to the catalogue in `docs/DESIGN_SYSTEM.md`.
