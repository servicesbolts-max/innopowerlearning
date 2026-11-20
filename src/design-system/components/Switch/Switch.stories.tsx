import type { Meta, StoryObj } from "@storybook/react-vite";
import { Switch } from "./Switch";

const meta = {
  title: "Inputs/Switch",
  component: Switch,
  args: { children: "Email reminders" },
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};
export const On: Story = { args: { defaultSelected: true } };
export const Disabled: Story = { args: { isDisabled: true, defaultSelected: true } };
