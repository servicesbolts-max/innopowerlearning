import type { Meta, StoryObj } from "@storybook/react-vite";
import { BookOpen } from "lucide-react";
import { Button } from "../Button/Button";
import { EmptyState } from "../EmptyState/EmptyState";
import { Skeleton, SkeletonGroup, SkeletonText } from "./Skeleton";

const meta = {
  title: "Display/Skeleton and empty state",
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const LoadingCard: Story = {
  render: () => (
    <SkeletonGroup className="flex max-w-sm gap-3">
      <Skeleton circle className="size-10 shrink-0" />
      <div className="flex-1">
        <SkeletonText lines={3} />
      </div>
    </SkeletonGroup>
  ),
};

export const Empty: Story = {
  render: () => (
    <EmptyState
      icon={BookOpen}
      title="No courses yet"
      description="Create your first course. You can save it as a draft and publish later."
      action={<Button>New course</Button>}
    />
  ),
};
