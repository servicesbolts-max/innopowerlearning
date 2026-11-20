// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations, renderDs } from "../../testing";
import { TextArea, TextField } from "./TextField";

describe("TextField and TextArea", () => {
  it("labels the input, links help text and passes axe", async () => {
    renderDs(
      <form>
        <TextField label="Full name" description="As it should appear on certificates" />
        <TextArea label="About you" />
      </form>,
    );
    const input = screen.getByRole("textbox", { name: "Full name" });
    expect(input).toHaveAccessibleDescription("As it should appear on certificates");
    expect(screen.getByRole("textbox", { name: "About you" }).tagName).toBe("TEXTAREA");
    await expectNoAxeViolations();
  });

  it("shows a validation message for invalid input", async () => {
    renderDs(
      <TextField label="Email" isInvalid errorMessage="Enter an email such as ada@example.com." />,
    );
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter an email such as ada@example.com.")).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it("accepts typing", async () => {
    renderDs(<TextField label="City" />);
    await userEvent.type(screen.getByRole("textbox"), "Monrovia");
    expect(screen.getByRole("textbox")).toHaveValue("Monrovia");
  });
});
