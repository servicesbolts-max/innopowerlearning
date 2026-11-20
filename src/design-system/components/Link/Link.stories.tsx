import type { Meta, StoryObj } from "@storybook/react-vite";
import { Link } from "./Link";

const meta = {
  title: "Actions/Link",
  component: Link,
  args: { href: "#", children: "Read the course outline" },
} satisfies Meta<typeof Link>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Inline: Story = {
  render: (args) => (
    <p className="max-w-reading text-body">
      Before you start, <Link {...args} /> and check the time each lesson takes.
    </p>
  ),
};
export const Standalone: Story = { args: { variant: "standalone" } };
export const Disabled: Story = { args: { isDisabled: true } };
