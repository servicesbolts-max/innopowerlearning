import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Bold,
  BookOpen,
  Home,
  Italic,
  Link2,
  MessageCircle,
  Settings,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Breadcrumbs } from "../Breadcrumbs/Breadcrumbs";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import { ListRow, ListSection } from "../List/List";
import { NavigationBar } from "../NavigationBar/NavigationBar";
import { SearchField } from "../SearchField/SearchField";
import { Sidebar } from "../Sidebar/Sidebar";
import { SplitView } from "../SplitView/SplitView";
import { Text } from "../Text/Text";
import { Toolbar, ToolbarDivider } from "../Toolbar/Toolbar";
import { WizardStepper } from "../WizardStepper/WizardStepper";
import { Tab, TabBar, TabList, TabPanel, Tabs } from "./Tabs";

const meta = {
  title: "Navigation/Navigation",
  component: Tabs,
} satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/community", label: "Community", icon: MessageCircle },
  { href: "/me", label: "Profile", icon: User },
];

export const InPageTabs: Story = {
  render: () => (
    <Tabs>
      <TabList aria-label="Course sections">
        <Tab id="overview">Overview</Tab>
        <Tab id="lessons">Lessons</Tab>
        <Tab id="reviews">Reviews</Tab>
      </TabList>
      <TabPanel id="overview">What you will learn and who it is for.</TabPanel>
      <TabPanel id="lessons">12 lessons in 3 sections.</TabPanel>
      <TabPanel id="reviews">4.8 from 230 learners.</TabPanel>
    </Tabs>
  ),
};

export const PhoneTabBar: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => (
    <div className="relative min-h-80">
      <Text tone="secondary">The tab bar sits at the bottom on phones and hides from 768 px.</Text>
      <TabBar aria-label="Main" items={nav} current="/courses" />
    </div>
  ),
};

export const CollapsibleSidebar: Story = {
  render: function Render() {
    const [collapsed, setCollapsed] = useState(false);
    return (
      <div className="flex h-96 overflow-hidden rounded-card border border-separator">
        <Sidebar
          aria-label="Admin"
          header="LSETF Admin"
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          current="/admin/learners"
          className="h-auto"
          sections={[
            { items: [{ href: "/admin", label: "Dashboard", icon: Home }] },
            {
              title: "People",
              items: [
                { href: "/admin/learners", label: "Learners", icon: Users, badge: "1,204" },
                { href: "/admin/courses", label: "Courses", icon: BookOpen },
              ],
            },
            {
              title: "Space",
              items: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
            },
          ]}
        />
        <div className="flex-1 p-6 text-label-secondary">Content</div>
      </div>
    );
  },
};

export const LargeTitle: Story = {
  render: () => (
    <div className="h-96 overflow-y-auto rounded-card border border-separator">
      <NavigationBar
        title="Courses"
        back={{ href: "#home", label: "Home" }}
        actions={<Button size="small">New</Button>}
        accessory={<SearchField aria-label="Search courses" />}
      />
      <div className="mx-auto flex max-w-app flex-col gap-3 px-4 pb-8">
        {Array.from({ length: 12 }, (_, i) => (
          <p key={i} className="rounded-card bg-bg-secondary p-4">
            Course {i + 1}
          </p>
        ))}
      </div>
    </div>
  ),
};

export const TrailAndSteps: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/courses", label: "Courses" },
          { href: "/courses/ai", label: "AI for small businesses" },
        ]}
      />
      <WizardStepper steps={["Partner", "Branding", "Admins", "Review"]} current={1} />
      <Toolbar aria-label="Formatting">
        <Button variant="plain" size="small" aria-label="Bold">
          <Icon icon={Bold} size={16} />
        </Button>
        <Button variant="plain" size="small" aria-label="Italic">
          <Icon icon={Italic} size={16} />
        </Button>
        <ToolbarDivider />
        <Button variant="plain" size="small" aria-label="Link">
          <Icon icon={Link2} size={16} />
        </Button>
      </Toolbar>
    </div>
  ),
};

export const ListAndDetail: Story = {
  render: function Render() {
    const [open, setOpen] = useState<string | null>(null);
    return (
      <SplitView
        listLabel="Submissions"
        detailLabel="Submission"
        showDetail={open !== null}
        onBack={() => setOpen(null)}
        list={
          <ListSection>
            {["Ada Okafor", "Kwame Mensah", "Fatu Kollie"].map((n) => (
              <ListRow key={n} title={n} subtitle="Assignment 2" onPress={() => setOpen(n)} />
            ))}
          </ListSection>
        }
        detail={
          <div className="p-5">
            <Text variant="title3" as="h2">
              {open ?? "Select a submission"}
            </Text>
          </div>
        }
      />
    );
  },
};
