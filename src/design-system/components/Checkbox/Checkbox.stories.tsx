import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox, CheckboxGroup } from "./Checkbox";

const meta = {
  title: "Inputs/Checkbox",
  component: Checkbox,
  args: { children: "I agree to the course code of conduct" },
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Checked: Story = { args: { defaultSelected: true } };
export const Indeterminate: Story = { args: { isIndeterminate: true, children: "Select all" } };
export const Group: Story = {
  render: () => (
    <CheckboxGroup label="Interests" defaultValue={["ai"]}>
      <Checkbox value="ai">Artificial intelligence</Checkbox>
      <Checkbox value="biz">Business</Checkbox>
      <Checkbox value="agri">Agriculture</Checkbox>
    </CheckboxGroup>
  ),
};
