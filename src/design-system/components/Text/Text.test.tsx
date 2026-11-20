// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations, renderDs } from "../../testing";
import { Icon } from "../Icon/Icon";
import { Spinner } from "../Spinner/Spinner";
import { Text, TEXT_VARIANTS, type TextVariant } from "./Text";
import { Check } from "lucide-react";

describe("Text, Icon and Spinner", () => {
  it("maps headings to heading elements and body to paragraphs", async () => {
    renderDs(
      <div>
        <Text variant="large-title">Courses</Text>
        <Text variant="title2">Popular</Text>
        <Text>Body copy</Text>
        <Text variant="footnote" tone="secondary">
          Updated today
        </Text>
      </div>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Courses" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Popular" })).toBeInTheDocument();
    expect(screen.getByText("Body copy").tagName).toBe("P");
    expect(screen.getByText("Updated today").className).toContain("text-label-secondary");
    await expectNoAxeViolations();
  });

  it("renders every variant with its type-scale class", () => {
    for (const variant of Object.keys(TEXT_VARIANTS) as TextVariant[]) {
      const { unmount } = renderDs(
        <Text variant={variant} as="span">
          {variant}
        </Text>,
      );
      expect(screen.getByText(variant).className).toContain(TEXT_VARIANTS[variant].split(" ")[0]);
      unmount();
    }
  });

  it("hides decorative icons and names meaningful ones", async () => {
    renderDs(
      <div>
        <Icon icon={Check} />
        <Icon icon={Check} label="Completed" />
        <Spinner />
      </div>,
    );
    expect(screen.getByRole("img", { name: "Completed" })).toHaveAttribute("stroke-width", "1.75");
    expect(screen.getByRole("img", { name: "Loading" })).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(2);
    await expectNoAxeViolations();
  });
});
