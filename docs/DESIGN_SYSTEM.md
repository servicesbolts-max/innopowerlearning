# Design system

An Apple HIG-inspired visual language (`docs/MASTER_PROMPT.md` Section 7). It is not affiliated with Apple and uses no Apple logos, SF Symbols or SF Pro files.

- **Code:** `src/design-system` (components) and `src/lib/theme` (tokens and theme engine).
- **Docs:** Storybook (`pnpm storybook`) and the live showcase at `/design/{innopower|emerald|sunset}`.
- **Adding a component:** `/add-ds-component <Name>` (`.claude/skills/add-ds-component`).
- **Decisions:** ADR 0003 (React Aria, CSS springs, theme engine).

## How theming works

1. `src/lib/theme/tokens.ts` holds the base tokens. They are the Section 7.2 surfaces and labels, plus a few that the spec implies: `control-border`, `thumb`, `scrim` and `segment-selected`. It also holds the status colors, radius scales, font stacks, shadows and `springEasing()`.
2. `buildTheme(input)` (`engine.ts`) validates a `TenantTheme`:
   - `accent` (required)
   - `accentSecondary`
   - `onAccent`: `auto`, `white` or `black`
   - `radius`: `compact`, `standard` or `rounded`
   - `scheme`: `system`, `light` or `dark`
   - `font`: `system` or `inter`

   For each scheme it derives the accent fill and on-accent color, accent text, tint, text-on-tint and an OKLCH scale from 50 to 950. It does the same for the secondary accent and for the six status colors. It moves OKLCH lightness until every text pair reaches **4.5:1** on every surface, and control borders reach **3:1**. The checks run on the quantized 8-bit values the CSS actually contains. It returns a `report` of every pair.

3. `themeToCss(built, root)` emits only `--name:value;` declarations that match strict patterns, under:
   - the root selector
   - `prefers-color-scheme: dark`, when the scheme is `system`
   - `[data-scheme="light|dark"]` overrides

   The root layout renders the default theme on the server, so there is no flash of the wrong theme. P2 swaps in the resolved tenant's theme, cached by tenant tag.

4. `src/app/globals.css` maps the variables to Tailwind utilities (`bg-accent-fill`, `text-label-secondary`, `rounded-card`, `shadow-elevated`, `ease-spring`, …). It holds the static scales:
   - the type scale, `text-large-title` (34/41) to `text-caption2` (11/13), plus `text-display-sm`, `text-display` and `text-display-lg`
   - widths `max-w-reading` (680), `max-w-app` (1200) and `max-w-marketing` (1280)
   - `min-h-touch` (44) and `min-h-touch-dense` (32)
   - keyframes

   It also holds the utilities `material`, `focus-ring` and `hairline-t` / `hairline-b`, plus the reduced-motion fallbacks.

Rules that the tests enforce:

- `tests/tokens-only.test.ts` rejects hex, rgb, hsl and oklch values, named Tailwind colors and `[…px]` values in `src/app` and `src/design-system`.
- The engine tests run 200 sampled accents (including yellow, white and black) through every pair.
- Playwright runs axe on `/design/*` in light and dark.

### Deviations from the spec table (see ASSUMPTIONS, P1)

| Token                          | Spec                      | Shipped                                                                         | Why                                                                |
| ------------------------------ | ------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `--label-secondary` (light)    | rgba(60,60,67,.60), 3.4:1 | rgba(60,60,67,.73), at least 4.5:1                                              | The lowest alpha that passes on every light surface                |
| `--label-tertiary`             | as spec                   | as spec                                                                         | Disabled and decorative text only (WCAG exempts inactive controls) |
| Destructive and status fills   | raw #FF3B30 etc.          | `--red-fill` etc. from the engine (#E91C18 in light)                            | White text on #FF3B30 is 3.6:1                                     |
| Material                       | 72%                       | `--material-alpha` = 72% or higher (95% light and 83% dark for the demo themes) | Bar text must pass 4.5:1 even over the darkest or lightest content |
| Tint                           | —                         | 15% light, 24% dark                                                             | 15% is too faint on black                                          |
| Sheet, toast, popover surfaces | Sheets translucent        | Opaque                                                                          | Text never sits on blur; the scrim already separates the layer     |
| Sheet grabber                  | (implies swipe)           | Visual only                                                                     | Swipe-to-dismiss not built; Escape, close button and scrim dismiss |

## Components (68 exports, covering 41 of the 45 Section 7.4 items)

| Group          | Components                                                                                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundations    | Text (type scale), Icon (Lucide, 1.75 stroke, 16/20/24), Spinner                                                                                                                                    |
| Actions        | Button (filled, tinted, gray, plain; small, medium, large; destructive; pending; pill), Link (inline is always underlined; standalone), Toolbar                                                     |
| Inputs         | TextField, TextArea, SearchField (with filter tokens), Select, Switch (iOS proportions), SegmentedControl, Checkbox and CheckboxGroup, RadioGroup, Slider, Stepper, DatePicker, TimeField, Calendar |
| Display        | Badge, Chip, Avatar and AvatarStack, Monogram (organization initials on the accent fill), Card, ProgressBar, ProgressRing, Skeleton and SkeletonGroup, EmptyState                                   |
| Lists and data | ListSection and ListRow (inset grouped, with chevrons), DataTable (sort, filter, column visibility, selection with bulk actions, sticky header, dense), Pagination, Disclosure and DisclosureGroup  |
| Overlays       | Sheet (bottom sheet with a grabber under 768 px, centered above), AlertDialog (stacked buttons), ActionSheet, Popover, Menu, ContextMenu, Tooltip, Toast (with undo) and Banner                     |
| Navigation     | Tabs, TabBar (phones), Sidebar (collapsible), NavigationBar (collapsing large title), Breadcrumbs, WizardStepper, SplitView                                                                         |

**Deferred to the packages that use them:**

- Command palette: P10a.
- Rich-text editor skin: P4a, with TipTap.
- Video player skin: P4b.
- Certificate preview: P6.

## Conventions

- Interactive components wrap React Aria Components. Style them through RAC data attributes and merge caller classes with `withClass`. `className` extends the base classes and is not merged with tailwind-merge, so use it for layout, not to restyle.
- Internal strings live in the `ds` message namespace, and content arrives as props. `DsProvider` pins React Aria's locale so the server and client agree.
- Date and time components read the clock. They render after hydration (`useIsClient`) and show a skeleton until then, so prerendered HTML has no stale "today".
- Toasts: wrap the tenant-scoped shell in `<ToastProvider>` (key it by tenant id), place one `<ToastRegion />`, and call `useToast().add(...)` from event handlers. There is no global queue, so nothing is shared across requests or tenants. A toast with an action never auto-dismisses. React Aria's `UNSTABLE_Toast*` API is wrapped in `Toast.tsx`, so a rename touches one file.
- Touch targets: controls are 44 px (`min-h-touch`). Visually compact ones (chips, segments, toast buttons, token remove, stepper) use the `touch-target` utility, which extends the hit area to 44 px. 32 px (`size="small"`, `dense`) is for admin-only controls.
- Forced colors: any state shown by an accent fill also uses `forced-selected` (Highlight/HighlightText). Keyboard focus on list items is a 2 px inset accent outline, not only a fill.
- NavigationBar renders a `<header>` landmark and the page's only h1; its collapse follows window scrolling (not nested scroll containers).
- SplitView: mark the open row with `ListRow isSelected` (aria-current). On phones, focus moves to the detail pane on open and back to that row on Back.
- Component tests run axe in jsdom. jsdom cannot measure color, so the engine tests and Playwright cover contrast.
