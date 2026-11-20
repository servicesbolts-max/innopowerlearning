import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stepper } from "./Stepper";

const meta = {
  title: "Inputs/Stepper",
  component: Stepper,
  args: { label: "Seats", defaultValue: 25, minValue: 1, maxValue: 500 },
} satisfies Meta<typeof Stepper>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Currency: Story = {
  args: {
    label: "Price",
    defaultValue: 15000,
    formatOptions: { style: "currency", currency: "NGN" },
  },
};
