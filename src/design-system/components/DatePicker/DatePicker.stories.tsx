import { CalendarDate, Time } from "@internationalized/date";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DatePicker, TimeField } from "./DatePicker";

const meta = {
  title: "Inputs/Date and time",
  component: DatePicker,
  args: { label: "Start date", defaultValue: new CalendarDate(2026, 11, 20) },
} satisfies Meta<typeof DatePicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const DateOnly: Story = {};
export const TimeOfDay: Story = {
  render: () => <TimeField label="Start time" defaultValue={new Time(9, 30)} />,
};
