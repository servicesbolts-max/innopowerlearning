import type { Meta, StoryObj } from "@storybook/react-vite";
import { Slider } from "./Slider";

const meta = {
  title: "Inputs/Slider",
  component: Slider,
  args: { label: "Daily goal (minutes)", defaultValue: 30, minValue: 5, maxValue: 120, step: 5 },
} satisfies Meta<typeof Slider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { isDisabled: true } };
