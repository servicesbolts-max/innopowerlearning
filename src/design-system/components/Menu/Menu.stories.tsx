import type { Meta, StoryObj } from "@storybook/react-vite";
import { Archive, Copy, Ellipsis, Pencil, Trash2 } from "lucide-react";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import { PopoverDialog } from "../Popover/Popover";
import { Tooltip, TooltipTrigger } from "../Tooltip/Tooltip";
import { ContextMenu, Menu, MenuItem, MenuSection, MenuSeparator, MenuTrigger } from "./Menu";
import { DialogTrigger } from "react-aria-components";

const meta = {
  title: "Overlays/Menu, popover and tooltip",
  component: Menu,
} satisfies Meta<typeof Menu>;
export default meta;
type Story = StoryObj<typeof meta>;

const items = (
  <>
    <MenuSection title="Lesson">
      <MenuItem id="edit" icon={Pencil}>
        Edit
      </MenuItem>
      <MenuItem id="dup" icon={Copy} shortcut="Ctrl D">
        Duplicate
      </MenuItem>
      <MenuItem id="archive" icon={Archive}>
        Archive
      </MenuItem>
    </MenuSection>
    <MenuSeparator />
    <MenuItem id="delete" icon={Trash2} destructive>
      Delete
    </MenuItem>
  </>
);

export const DropdownMenu: Story = {
  render: () => (
    <MenuTrigger>
      <Button variant="gray" aria-label="Lesson actions">
        <Icon icon={Ellipsis} />
      </Button>
      <Menu>{items}</Menu>
    </MenuTrigger>
  ),
};

export const RightClickMenu: Story = {
  render: () => (
    <ContextMenu
      aria-label="Lesson 3: Pricing"
      menu={items}
      className="rounded-card bg-bg-secondary p-6"
    >
      Lesson 3: Pricing (right click, Shift+F10 or the Menu key)
    </ContextMenu>
  ),
};

export const PopoverAndTooltip: Story = {
  render: () => (
    <div className="flex gap-3">
      <DialogTrigger>
        <Button variant="tinted">Details</Button>
        <PopoverDialog aria-label="Course details" showArrow>
          <p className="max-w-60 text-subheadline">
            12 lessons, about 4 hours. Certificate on completion.
          </p>
        </PopoverDialog>
      </DialogTrigger>
      <TooltipTrigger>
        <Button variant="gray" aria-label="Copy link">
          <Icon icon={Copy} />
        </Button>
        <Tooltip>Copy link</Tooltip>
      </TooltipTrigger>
    </div>
  ),
};
