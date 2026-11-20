import type { Meta, StoryObj } from "@storybook/react-vite";
import { Radio, RadioGroup } from "./Radio";

const meta = {
  title: "Inputs/Radio",
  component: RadioGroup,
  args: { label: "How will you attend?", defaultValue: "online", children: null },
} satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <Radio value="online">Online</Radio>
        <Radio value="campus">On campus</Radio>
        <Radio value="hybrid">Hybrid</Radio>
      </>
    ),
  },
};
