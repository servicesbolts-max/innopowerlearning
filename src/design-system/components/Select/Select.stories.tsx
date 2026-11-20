import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select, SelectItem } from "./Select";

const meta = {
  title: "Inputs/Select",
  component: Select,
  args: { label: "Language", children: null },
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

const options = (
  <>
    <SelectItem id="en">English</SelectItem>
    <SelectItem id="fr">French</SelectItem>
    <SelectItem id="yo">Yoruba</SelectItem>
    <SelectItem id="ha">Hausa</SelectItem>
  </>
);

export const Default: Story = { args: { children: options } };
export const Selected: Story = { args: { children: options, defaultSelectedKey: "fr" } };
export const Invalid: Story = {
  args: {
    children: options,
    isInvalid: true,
    errorMessage: "Choose the language you will study in.",
  },
};
