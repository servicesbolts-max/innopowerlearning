import type { Meta, StoryObj } from "@storybook/react-vite";
import { Monogram } from "./Monogram";

const meta = {
  title: "Display/Monogram",
  component: Monogram,
  args: { text: "LS", label: "LSETF" },
} satisfies Meta<typeof Monogram>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Monogram {...args} size={32} />
      <Monogram {...args} size={40} />
      <Monogram {...args} size={56} />
    </div>
  ),
};

export const BesideName: Story = {
  render: () => (
    <span className="inline-flex items-center gap-2 text-headline">
      <Monogram text="TU" size={32} />
      William V. S. Tubman University
    </span>
  ),
};
