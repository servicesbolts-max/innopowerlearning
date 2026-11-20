import { CalendarDate } from "@internationalized/date";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Calendar } from "./Calendar";

const meta = {
  title: "Inputs/Calendar",
  component: Calendar,
  args: { "aria-label": "Cohort start", defaultValue: new CalendarDate(2026, 11, 20) },
} satisfies Meta<typeof Calendar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
