type ClassValue = string | false | null | undefined;

/** Join class names, skipping falsy values. */
export function cx(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

type RenderValues<T> = T & { defaultClassName: string | undefined };

/**
 * Merge our classes with a React Aria `className` prop, which may be a string or a function of
 * render props (for example `({ isSelected }) => ...`). Caller classes come last.
 */
export function withClass<T>(
  className: string | ((values: RenderValues<T>) => string) | undefined,
  base: string | ((values: RenderValues<T>) => string),
): (values: RenderValues<T>) => string {
  return (values) =>
    cx(
      typeof base === "function" ? base(values) : base,
      typeof className === "function" ? className(values) : className,
    );
}
