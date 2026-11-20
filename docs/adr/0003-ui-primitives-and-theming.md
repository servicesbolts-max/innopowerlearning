# ADR 0003: React Aria Components, CSS springs, and a server-emitted theme engine

- Status: accepted
- Date: 2026-11-20

## Context

Section 2 allows Radix UI or React Aria primitives, and names Motion for spring animation. Section 7 needs 40-odd components with full keyboard support, screen-reader semantics, RTL readiness, and tenant themes that never fail WCAG AA and never flash the default theme.

## Decision

1. **Primitives: React Aria Components** (`react-aria-components`). It covers more of Section 7.4 without extra packages: DatePicker, Calendar, TimeField, NumberField (stepper), Slider, Table with sorting and selection, TagGroup (search tokens), Toast, Disclosure, Tabs, Menu, Popover, Modal. It also ships locale-aware date and number handling, which next-intl alone does not. Our components wrap it in `src/design-system` and style it only with token-based Tailwind classes.
2. **Motion: CSS springs for now.** `springEasing()` in `src/lib/theme/tokens.ts` samples a damped spring (stiffness 350, damping 30, mass 1) into a CSS `linear()` easing, emitted as `--ease-spring` and `--duration-spring` (about 220 ms). Sheets, switches and popovers use it through React Aria's `data-entering` and `data-exiting` states. Under `prefers-reduced-motion` the CSS replaces movement with fades. The Motion library joins in P4a, when drag-to-reorder needs physics that CSS cannot express.
3. **Theme engine in `src/lib/theme`.** It is pure TypeScript with in-house OKLCH and WCAG math and no dependencies. `buildTheme()` validates a `TenantTheme` with Zod. It derives the accent fill, on-accent text, accent text, tint, text-on-tint and an 11-step OKLCH scale for each scheme. It moves OKLCH lightness (hue kept, chroma clamped to the gamut) until every text pair reaches 4.5:1 on every surface, then checks the quantised 8-bit values. `themeToCss()` emits only `--name:value;` declarations that match a strict allow-pattern, so tenant input cannot inject CSS. It lives in `src/lib` because both the design system and P2's tenancy module (which caches per-tenant CSS by tag) must import it.
4. **Status colors** stay as raw spec values for non-text marks. The engine derives `--{status}-fill`, `--on-{status}` and `--{status}-text` so destructive buttons and status text also pass AA (for example, the light destructive fill is #E91C18, not #FF3B30).

## Consequences

- Fewer packages to audit. React Aria is one coherent library instead of about 20 Radix packages plus date and number pickers.
- Without Motion there is no layout or shared-element animation until P4a. The View Transitions API covers navigation where supported.
- Tenants cannot pick an inaccessible accent: the engine always shifts it until it passes. The showcase and the P10b theme editor display the contrast report.
