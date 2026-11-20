// @vitest-environment jsdom
import { CalendarDate, Time } from "@internationalized/date";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations, renderDs } from "../../testing";
import { Calendar } from "../Calendar/Calendar";
import { DatePicker, TimeField } from "../DatePicker/DatePicker";
import { SearchField } from "../SearchField/SearchField";
import { Slider } from "../Slider/Slider";
import { Stepper } from "../Stepper/Stepper";
import { Select, SelectItem } from "./Select";

describe("pickers and fields", () => {
  it("Select opens with the keyboard and picks an option", async () => {
    const onSelectionChange = vi.fn();
    renderDs(
      <Select label="Language" onSelectionChange={onSelectionChange}>
        <SelectItem id="en">English</SelectItem>
        <SelectItem id="fr">French</SelectItem>
      </Select>,
    );
    await expectNoAxeViolations();
    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}");
    const listbox = await screen.findByRole("listbox");
    await userEvent.click(within(listbox).getByRole("option", { name: "French" }));
    expect(onSelectionChange).toHaveBeenCalledWith("fr");
  });

  it("SearchField clears with Escape and removes tokens", async () => {
    const onRemoveToken = vi.fn();
    renderDs(
      <SearchField
        label="Search courses"
        tokens={[{ id: "cat", label: "Category: Design" }]}
        onRemoveToken={onRemoveToken}
      />,
    );
    await expectNoAxeViolations();
    const box = screen.getByRole("searchbox", { name: "Search courses" });
    await userEvent.type(box, "ux");
    await userEvent.keyboard("{Escape}");
    expect(box).toHaveValue("");
    await userEvent.keyboard("{Backspace}");
    expect(onRemoveToken).toHaveBeenCalledWith("cat");
    await userEvent.click(screen.getByRole("button", { name: "Remove Category: Design" }));
    expect(onRemoveToken).toHaveBeenCalledTimes(2);
  });

  it("Stepper increments with buttons and arrows", async () => {
    renderDs(<Stepper label="Seats" defaultValue={2} minValue={0} />);
    const input = screen.getByRole("textbox", { name: "Seats" });
    await userEvent.click(screen.getByRole("button", { name: "Increase Seats" }));
    expect(input).toHaveValue("3");
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}");
    expect(input).toHaveValue("2");
    await expectNoAxeViolations();
  });

  it("Slider exposes its value and moves with arrows", async () => {
    renderDs(<Slider label="Playback speed" defaultValue={50} />);
    const slider = screen.getByRole("slider");
    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}");
    expect(slider).toHaveValue("51");
    await expectNoAxeViolations();
  });

  it("DatePicker, TimeField and Calendar are labelled", async () => {
    renderDs(
      <div>
        <DatePicker label="Start date" defaultValue={new CalendarDate(2026, 11, 20)} />
        <TimeField label="Start time" defaultValue={new Time(9, 30)} />
        <Calendar aria-label="Cohort calendar" defaultValue={new CalendarDate(2026, 11, 20)} />
      </div>,
    );
    expect(screen.getByRole("group", { name: "Start date" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open calendar/ })).toBeInTheDocument();
    expect(screen.getByRole("application", { name: /Cohort calendar/ })).toBeInTheDocument();
    await expectNoAxeViolations();
  });
});
