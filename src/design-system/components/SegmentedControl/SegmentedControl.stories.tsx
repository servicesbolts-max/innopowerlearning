import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { Key } from "react-aria-components";
import { SegmentedControl } from "./SegmentedControl";

const meta = {
  title: "Inputs/Segmented control",
  component: SegmentedControl,
  args: {
    "aria-label": "Course view",
    segments: [
      { id: "all", label: "All" },
      { id: "progress", label: "In progress" },
      { id: "done", label: "Completed" },
    ],
    selectedKey: "all",
    onSelectionChange: () => {},
  },
} satisfies Meta<typeof SegmentedControl>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function Render(args) {
    const [key, setKey] = useState<Key>(args.selectedKey);
    return <SegmentedControl {...args} selectedKey={key} onSelectionChange={setKey} />;
  },
};
