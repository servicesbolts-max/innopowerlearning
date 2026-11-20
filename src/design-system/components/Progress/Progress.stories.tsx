import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProgressBar, ProgressRing } from "./Progress";

const meta = {
  title: "Display/Progress",
  component: ProgressBar,
  args: { label: "Course progress", value: 40 },
} satisfies Meta<typeof ProgressBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Bar: Story = {};
export const Indeterminate: Story = { args: { label: "Uploading video", isIndeterminate: true } };
export const Rings: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ProgressRing value={25} size={24} aria-label="Lesson 1" />
      <ProgressRing value={60} size={40} aria-label="Module 2" />
      <ProgressRing value={90} size={64} showValue aria-label="Course" />
    </div>
  ),
};
