import type { Meta, StoryObj } from "@storybook/react-vite";
import { DialogTrigger } from "react-aria-components";
import { Button } from "../Button/Button";
import { Select, SelectItem } from "../Select/Select";
import { TextArea, TextField } from "../TextField/TextField";
import { ActionSheet, AlertDialog, Sheet } from "./Sheet";

const meta = {
  title: "Overlays/Sheet and dialogs",
  component: Sheet,
  args: { title: "New course", children: null },
} satisfies Meta<typeof Sheet>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Bottom sheet with a grabber under 768 px; centered dialog above. */
export const CreateSheet: Story = {
  render: (args) => (
    <DialogTrigger>
      <Button>New course</Button>
      <Sheet
        {...args}
        footer={
          <>
            <Button variant="gray" slot="close">
              Cancel
            </Button>
            <Button>Create course</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField label="Title" placeholder="AI for small businesses" />
          <Select label="Category">
            <SelectItem id="ai">Artificial intelligence</SelectItem>
            <SelectItem id="biz">Business</SelectItem>
          </Select>
          <TextArea
            label="Summary"
            description="One or two sentences learners see in the catalog."
          />
        </div>
      </Sheet>
    </DialogTrigger>
  ),
};

export const DestructiveConfirm: Story = {
  render: () => (
    <DialogTrigger>
      <Button destructive variant="tinted">
        Delete course
      </Button>
      <AlertDialog
        title="Delete this course?"
        actionLabel="Delete course"
        destructive
        onAction={() => {}}
      >
        Learners lose access to its lessons and certificates. This cannot be undone.
      </AlertDialog>
    </DialogTrigger>
  ),
};

export const Actions: Story = {
  render: () => (
    <DialogTrigger>
      <Button variant="gray">Lesson options</Button>
      <ActionSheet
        title="Lesson 3: Pricing"
        actions={[
          { label: "Duplicate", onAction: () => {} },
          { label: "Move to section", onAction: () => {} },
          { label: "Delete lesson", onAction: () => {}, destructive: true },
        ]}
      />
    </DialogTrigger>
  ),
};
