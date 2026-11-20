import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus } from "lucide-react";
import { Icon } from "../Icon/Icon";
import { Button } from "./Button";

const meta = {
  title: "Actions/Button",
  component: Button,
  args: { children: "Continue", variant: "filled", size: "medium" },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Filled: Story = {};
export const Tinted: Story = { args: { variant: "tinted" } };
export const Gray: Story = { args: { variant: "gray" } };
export const Plain: Story = { args: { variant: "plain" } };
export const Destructive: Story = { args: { destructive: true, children: "Delete course" } };
export const Loading: Story = { args: { isPending: true } };
export const Disabled: Story = { args: { isDisabled: true } };
export const PillCta: Story = { args: { pill: true, size: "large", children: "Start learning" } };
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Icon icon={Plus} size={20} />
        New course
      </>
    ),
  },
};

/** Every variant, size and the destructive tone together. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(["small", "medium", "large"] as const).map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-3">
          {(["filled", "tinted", "gray", "plain"] as const).map((variant) => (
            <Button key={variant} variant={variant} size={size}>
              {variant}
            </Button>
          ))}
          <Button size={size} destructive>
            Delete
          </Button>
        </div>
      ))}
    </div>
  ),
};
