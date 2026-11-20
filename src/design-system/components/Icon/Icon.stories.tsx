import type { Meta, StoryObj } from "@storybook/react-vite";
import { BookOpen, Check, ChevronRight, Search } from "lucide-react";
import { Spinner } from "../Spinner/Spinner";
import { Icon } from "./Icon";

const meta = {
  title: "Foundations/Icon",
  component: Icon,
  args: { icon: BookOpen, size: 24 },
} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Lucide at 1.75 stroke in the three system sizes. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6 text-label">
      {([16, 20, 24] as const).map((size) => (
        <div key={size} className="flex items-center gap-2">
          <Icon icon={Search} size={size} />
          <Icon icon={Check} size={size} />
          <Icon icon={ChevronRight} size={size} />
        </div>
      ))}
      <Spinner />
    </div>
  ),
};
