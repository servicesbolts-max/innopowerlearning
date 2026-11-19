---
paths:
  - "src/design-system/**"
  - "src/app/**"
---

# Design-system rules (spec Section 7)

- **Tokens only.** Colors, radii, spacing, shadows, and type come from CSS variables and Tailwind theme tokens. No hex or rgb values in components, and no arbitrary spacing outside the 4 px grid.
- **Apple HIG patterns:**
  - Large titles that collapse on scroll.
  - Inset grouped lists for settings.
  - Sheets for create and edit (bottom sheet with grabber on mobile, centered on desktop).
  - Skeleton loading.
  - Undo toasts for reversible actions; clear confirmation for destructive ones.
  - One clear action per empty state.
- **Materials:** translucent nav, tab bars, sidebars, and sheets use `color-mix(in srgb, var(--bg) 72%, transparent)` with `backdrop-filter: saturate(180%) blur(20px)`. Fall back to opaque under `prefers-reduced-transparency: reduce` or when unsupported. Check text contrast on blur.
- **Motion:** springs (stiffness 300 to 400, damping about 30), 200 to 350 ms transitions. Under `prefers-reduced-motion`, replace them with fades or instant changes.
- **Accessibility:**
  - Touch targets at least 44 px (dense admin controls at least 32 px).
  - Visible focus ring: 2 px accent outline with 2 px offset.
  - WCAG 2.2 AA contrast, and status is never shown by color alone.
  - Full keyboard support, forced-colors support, and no breakage at 200% zoom.
- **Typography:** use the system stack with self-hosted Inter as the fallback. Use the HIG type scale (Large Title 34/41 down to Caption 2 11/13).
- **Icons:** Lucide at 1.75 stroke, sizes 16, 20, and 24. Never use Apple logos, SF Symbols, or SF Pro files.
- **Every component:** story in light, dark, and three tenant themes, plus an axe test.
- **Strings:** never hard-code user-facing strings; use next-intl messages.
