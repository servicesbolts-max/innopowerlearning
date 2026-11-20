import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button";
import { Banner, ToastRegion, toast } from "./Toast";

const meta = {
  title: "Overlays/Toast and banner",
  component: Banner,
  args: { title: "Your progress is saved." },
} satisfies Meta<typeof Banner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const UndoToast: Story = {
  render: () => (
    <>
      <ToastRegion />
      <Button
        onPress={() =>
          toast.add(
            {
              title: "Lesson archived",
              description: "It is hidden from learners.",
              action: { label: "Undo", onAction: () => {} },
            },
            { timeout: 6000 },
          )
        }
      >
        Archive lesson
      </Button>
    </>
  ),
};

export const Banners: Story = {
  render: () => (
    <div className="flex max-w-reading flex-col gap-3">
      <Banner tone="info" title="New cohort opens on 1 December." />
      <Banner tone="success" title="Certificate issued">
        Share it from your profile.
      </Banner>
      <Banner
        tone="warning"
        title="Your session ends in 5 minutes"
        action={
          <Button size="small" variant="tinted">
            Stay signed in
          </Button>
        }
      />
      <Banner tone="danger" title="Payment failed" onDismiss={() => {}}>
        Check your card details and try again.
      </Banner>
    </div>
  ),
};
