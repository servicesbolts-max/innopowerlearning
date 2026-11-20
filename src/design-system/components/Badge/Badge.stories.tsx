import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircleCheck } from "lucide-react";
import { Badge, Chip, type BadgeTone } from "./Badge";

const meta = {
  title: "Display/Badge and chip",
  component: Badge,
  args: { children: "Active" },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

const tones: BadgeTone[] = [
  "accent",
  "gray",
  "green",
  "red",
  "orange",
  "yellow",
  "indigo",
  "purple",
];

export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {tones.map((tone) => (
        <Badge key={tone} tone={tone}>
          {tone}
        </Badge>
      ))}
      <Badge tone="green" icon={CircleCheck}>
        Passed
      </Badge>
    </div>
  ),
};

export const Chips: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Chip defaultSelected>All levels</Chip>
      <Chip>Beginner</Chip>
      <Chip>Intermediate</Chip>
      <Chip isDisabled>Advanced</Chip>
    </div>
  ),
};
