import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar, AvatarStack } from "./Avatar";

const meta = {
  title: "Display/Avatar",
  component: Avatar,
  args: { name: "Ada Okafor", size: 56 },
} satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      {([24, 32, 40, 56, 80] as const).map((s) => (
        <Avatar key={s} name="Kwame Mensah" size={s} />
      ))}
    </div>
  ),
};

export const Stack: Story = {
  render: () => (
    <AvatarStack
      people={[
        { name: "Ada Okafor" },
        { name: "Kwame Mensah" },
        { name: "Fatu Kollie" },
        { name: "Chidi Eze" },
        { name: "Aminata Sesay" },
        { name: "Musa Bah" },
      ]}
    />
  ),
};
