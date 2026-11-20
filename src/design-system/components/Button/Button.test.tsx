// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations, renderDs } from "../../testing";
import { Button } from "./Button";

describe("Button", () => {
  it("has no axe violations in every variant", async () => {
    renderDs(
      <div>
        {(["filled", "tinted", "gray", "plain"] as const).map((v) => (
          <Button key={v} variant={v}>
            {v}
          </Button>
        ))}
        <Button destructive>Delete</Button>
        <Button isPending>Save</Button>
        <Button isDisabled>Disabled</Button>
      </div>,
    );
    await expectNoAxeViolations();
  });

  it("activates with the keyboard", async () => {
    const onPress = vi.fn();
    renderDs(<Button onPress={onPress}>Save</Button>);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it("ignores presses and announces loading while pending", async () => {
    const onPress = vi.fn();
    renderDs(
      <Button isPending onPress={onPress}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button");
    await userEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole("img", { name: "Loading" })).toBeInTheDocument();
  });

  it("uses the destructive tokens", () => {
    renderDs(<Button destructive>Delete</Button>);
    expect(screen.getByRole("button").className).toContain("bg-red-fill");
  });
});
