import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bell, Globe, Lock, LogOut, Moon } from "lucide-react";
import { Badge } from "../Badge/Badge";
import { Disclosure, DisclosureGroup } from "../Disclosure/Disclosure";
import { Switch } from "../Switch/Switch";
import { ListRow, ListSection } from "./List";

const meta = {
  title: "Lists/Inset grouped list",
  component: ListSection,
  args: { children: null },
} satisfies Meta<typeof ListSection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Settings: Story = {
  render: () => (
    <div className="flex max-w-reading flex-col gap-8 rounded-card bg-bg-grouped p-4">
      <ListSection header="Preferences" footer="Reminders arrive by email and in the app.">
        <ListRow icon={Globe} title="Language" trailing="English" href="#language" />
        <ListRow
          icon={Moon}
          iconTone="indigo"
          title="Appearance"
          trailing="System"
          href="#appearance"
        />
        <ListRow
          icon={Bell}
          iconTone="red"
          title="Reminders"
          trailing={<Switch aria-label="Reminders" defaultSelected />}
        />
      </ListSection>
      <ListSection header="Account">
        <ListRow
          icon={Lock}
          iconTone="gray"
          title="Two-step verification"
          subtitle="Required for admins"
          trailing={<Badge tone="green">On</Badge>}
          href="#two-step"
        />
        <ListRow icon={LogOut} iconTone="gray" title="Sign out" onPress={() => {}} />
      </ListSection>
    </div>
  ),
};

export const Disclosures: Story = {
  render: () => (
    <DisclosureGroup className="max-w-reading">
      <Disclosure title="What do I need to start?">
        A phone or computer and an internet connection.
      </Disclosure>
      <Disclosure title="Can I learn offline?">
        Yes. Downloaded lessons work without data.
      </Disclosure>
      <Disclosure title="Do I get a certificate?">
        Yes, when you complete every lesson and pass the quiz.
      </Disclosure>
    </DisclosureGroup>
  ),
};
