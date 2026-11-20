import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { SearchField, type SearchToken } from "./SearchField";

const meta = {
  title: "Inputs/Search field",
  component: SearchField,
  args: { "aria-label": "Search courses" },
} satisfies Meta<typeof SearchField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTokens: Story = {
  render: function Render(args) {
    const [tokens, setTokens] = useState<SearchToken[]>([
      { id: "cat", label: "Design" },
      { id: "level", label: "Beginner" },
    ]);
    return (
      <SearchField
        {...args}
        tokens={tokens}
        onRemoveToken={(id) => setTokens((ts) => ts.filter((t) => t.id !== id))}
      />
    );
  },
};
