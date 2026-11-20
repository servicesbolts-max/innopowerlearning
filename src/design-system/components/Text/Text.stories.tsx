import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text, TEXT_VARIANTS, type TextVariant } from "./Text";

const meta = {
  title: "Foundations/Typography",
  component: Text,
  args: { children: "Learn at your own pace" },
} satisfies Meta<typeof Text>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Body: Story = {};
export const Secondary: Story = { args: { tone: "secondary", variant: "subheadline" } };

/** The HIG type scale from Large Title (34/41) to Caption 2 (11/13), plus display sizes. */
export const Scale: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {(Object.keys(TEXT_VARIANTS) as TextVariant[]).map((v) => (
        <div key={v} className="flex items-baseline gap-4">
          <Text as="span" variant="caption1" tone="secondary" className="w-24 shrink-0">
            {v}
          </Text>
          <Text as="span" variant={v}>
            Learn at your own pace
          </Text>
        </div>
      ))}
    </div>
  ),
};
