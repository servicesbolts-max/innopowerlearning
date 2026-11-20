import type { Meta, StoryObj } from "@storybook/react-vite";
import { BookOpen, Clock } from "lucide-react";
import { AvatarStack } from "../Avatar/Avatar";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import { ProgressBar } from "../Progress/Progress";
import { Text } from "../Text/Text";
import { Card, CardHeader } from "./Card";

const meta = {
  title: "Display/Card",
  component: Card,
  args: { children: null },
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const CourseCard: Story = {
  render: () => (
    <Card as="article" aria-labelledby="course-1" className="max-w-sm">
      <CardHeader
        titleId="course-1"
        title="AI for small businesses"
        subtitle="Innopower AI · 12 lessons"
        action={<Badge tone="green">New</Badge>}
      />
      <Text variant="subheadline" tone="secondary" className="mb-4">
        Use AI tools to price, market and plan, with examples from Lagos and Monrovia.
      </Text>
      <div className="mb-4 flex items-center gap-4 text-footnote text-label-secondary">
        <span className="inline-flex items-center gap-1">
          <Icon icon={Clock} size={16} />4 h
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon icon={BookOpen} size={16} />
          Beginner
        </span>
      </div>
      <ProgressBar label="Your progress" value={40} className="mb-4" />
      <div className="flex items-center justify-between">
        <AvatarStack
          people={[
            { name: "Ada Okafor" },
            { name: "Kwame Mensah" },
            { name: "Fatu Kollie" },
            { name: "Chidi Eze" },
            { name: "Musa Bah" },
          ]}
          max={3}
          size={24}
        />
        <Button size="small">Continue</Button>
      </div>
    </Card>
  ),
};
