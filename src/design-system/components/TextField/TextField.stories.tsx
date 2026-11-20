import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextArea, TextField } from "./TextField";

const meta = {
  title: "Inputs/Text field",
  component: TextField,
  args: { label: "Full name", placeholder: "Ada Okafor" },
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithHelp: Story = {
  args: { description: "As it should appear on your certificate." },
};
export const Invalid: Story = {
  args: {
    label: "Email",
    isInvalid: true,
    errorMessage: "Enter an email such as ada@example.com.",
  },
};
export const Disabled: Story = { args: { isDisabled: true, defaultValue: "Ada Okafor" } };
export const MultiLine: Story = {
  render: () => <TextArea label="About you" description="Two or three sentences are enough." />,
};
