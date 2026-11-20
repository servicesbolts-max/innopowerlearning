// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations, renderDs } from "../../testing";
import { Link } from "./Link";

describe("Link", () => {
  it("renders an accessible, underlined inline link", async () => {
    renderDs(
      <p>
        Read the <Link href="/outline">course outline</Link>.
      </p>,
    );
    const link = screen.getByRole("link", { name: "course outline" });
    expect(link).toHaveAttribute("href", "/outline");
    expect(link.className).toContain("underline");
    await expectNoAxeViolations();
  });

  it("underlines standalone links only on hover", () => {
    renderDs(
      <Link href="/" variant="standalone">
        Home
      </Link>,
    );
    expect(screen.getByRole("link").className).toContain("data-hovered:underline");
  });
});
