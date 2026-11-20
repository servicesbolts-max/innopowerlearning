// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations, renderDs } from "../../testing";
import { Checkbox, CheckboxGroup } from "../Checkbox/Checkbox";
import { Radio, RadioGroup } from "../Radio/Radio";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl";
import { Switch } from "./Switch";

describe("selection controls", () => {
  it("Switch toggles with Space and passes axe", async () => {
    const onChange = vi.fn();
    renderDs(<Switch onChange={onChange}>Email reminders</Switch>);
    const sw = screen.getByRole("switch", { name: "Email reminders" });
    await userEvent.tab();
    expect(sw).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith(true);
    expect(sw).toBeChecked();
    await expectNoAxeViolations();
  });

  it("SegmentedControl is a radio group driven by arrow keys", async () => {
    const onSelectionChange = vi.fn();
    renderDs(
      <SegmentedControl
        aria-label="Course view"
        segments={[
          { id: "list", label: "List" },
          { id: "grid", label: "Grid" },
        ]}
        selectedKey="list"
        onSelectionChange={onSelectionChange}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Course view" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "List" })).toBeChecked();
    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard(" ");
    expect(onSelectionChange).toHaveBeenCalledWith("grid");
    await expectNoAxeViolations();
  });

  it("Checkbox and CheckboxGroup", async () => {
    renderDs(
      <CheckboxGroup label="Interests" defaultValue={["ai"]}>
        <Checkbox value="ai">Artificial intelligence</Checkbox>
        <Checkbox value="biz">Business</Checkbox>
      </CheckboxGroup>,
    );
    expect(screen.getByRole("checkbox", { name: "Artificial intelligence" })).toBeChecked();
    await userEvent.click(screen.getByText("Business"));
    expect(screen.getByRole("checkbox", { name: "Business" })).toBeChecked();
    await expectNoAxeViolations();
  });

  it("RadioGroup", async () => {
    renderDs(
      <RadioGroup label="Delivery" defaultValue="online">
        <Radio value="online">Online</Radio>
        <Radio value="campus">On campus</Radio>
      </RadioGroup>,
    );
    expect(screen.getByRole("radiogroup", { name: "Delivery" })).toBeInTheDocument();
    await userEvent.click(screen.getByText("On campus"));
    expect(screen.getByRole("radio", { name: "On campus" })).toBeChecked();
    await expectNoAxeViolations();
  });
});
