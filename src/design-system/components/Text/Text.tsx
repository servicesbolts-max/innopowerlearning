import type { ElementType, ReactNode } from "react";
import { cx } from "../../utils/cx";

export const TEXT_VARIANTS = {
  "large-title": "text-large-title tracking-tight",
  title1: "text-title1 tracking-tight",
  title2: "text-title2",
  title3: "text-title3",
  headline: "text-headline",
  body: "text-body",
  callout: "text-callout",
  subheadline: "text-subheadline",
  footnote: "text-footnote",
  caption1: "text-caption1",
  caption2: "text-caption2",
  "display-sm": "text-display-sm",
  display: "text-display",
  "display-lg": "text-display-lg",
} as const;
export type TextVariant = keyof typeof TEXT_VARIANTS;

const TONES = {
  primary: "text-label",
  secondary: "text-label-secondary",
  accent: "text-accent-text",
  danger: "text-red-text",
  success: "text-green-text",
} as const;
export type TextTone = keyof typeof TONES;

const DEFAULT_ELEMENT: Partial<Record<TextVariant, ElementType>> = {
  "large-title": "h1",
  title1: "h1",
  title2: "h2",
  title3: "h3",
  display: "h1",
  "display-lg": "h1",
  "display-sm": "h2",
};

export interface TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Element to render. Headings default to h1-h3; pick the level that fits the page outline. */
  as?: ElementType;
  weight?: "regular" | "medium" | "semibold" | "bold";
  className?: string;
  id?: string;
  children: ReactNode;
}

const WEIGHTS = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

/** Type-scale primitive (Section 7.1). Sizes are rem, so user text-size settings apply. */
export function Text({
  variant = "body",
  tone = "primary",
  as,
  weight,
  className,
  id,
  children,
}: TextProps) {
  const Element = as ?? DEFAULT_ELEMENT[variant] ?? "p";
  return (
    <Element
      id={id}
      className={cx(TEXT_VARIANTS[variant], TONES[tone], weight && WEIGHTS[weight], className)}
    >
      {children}
    </Element>
  );
}
