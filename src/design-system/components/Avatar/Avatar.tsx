"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { cx } from "../../utils/cx";

export type AvatarSize = 24 | 32 | 40 | 56 | 80;

const SIZES: Record<AvatarSize, string> = {
  24: "size-6 text-caption2",
  32: "size-8 text-caption1",
  40: "size-10 text-subheadline",
  56: "size-14 text-title3",
  80: "size-20 text-title1",
};

export interface AvatarProps {
  /** Person's display name: used for the accessible name and the initials fallback. */
  name: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
  /** Hide from assistive technology when the name is already printed next to it. */
  decorative?: boolean;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Photo with an initials fallback on a tonal circle. */
export function Avatar({ name, src, size = 40, className, decorative }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const a11y = decorative ? { "aria-hidden": true as const } : { role: "img", "aria-label": name };
  return (
    <span
      {...a11y}
      className={cx(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-tint font-semibold text-accent-text-on-tint select-none",
        SIZES[size],
        className,
      )}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary storage URLs; next/image is wired up with the files module in P4b.
        <img src={src} alt="" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}

export interface AvatarStackProps {
  people: Array<{ name: string; src?: string }>;
  /** Maximum avatars shown before "+n". */
  max?: number;
  size?: Exclude<AvatarSize, 80>;
  className?: string;
}

/** Overlapping avatars with a "+n" counter. Read as one list by screen readers. */
export function AvatarStack({ people, max = 4, size = 32, className }: AvatarStackProps) {
  const t = useTranslations("ds");
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <ul className={cx("flex items-center", className)}>
      {shown.map((p, i) => (
        <li key={`${p.name}-${i}`} className="-ms-2 rounded-full ring-2 ring-bg first:ms-0">
          <Avatar name={p.name} src={p.src} size={size} />
        </li>
      ))}
      {rest > 0 && (
        <li className="-ms-2 rounded-full ring-2 ring-bg">
          <span
            role="img"
            aria-label={t("moreAvatars", { count: rest })}
            className={cx(
              "inline-flex items-center justify-center rounded-full bg-fill font-semibold text-label",
              SIZES[size],
            )}
          >
            <span aria-hidden>+{rest}</span>
          </span>
        </li>
      )}
    </ul>
  );
}
