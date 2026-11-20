// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookOpen, Home, User } from "lucide-react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations, renderDs } from "../../testing";
import { Breadcrumbs } from "../Breadcrumbs/Breadcrumbs";
import { Button } from "../Button/Button";
import { NavigationBar } from "../NavigationBar/NavigationBar";
import { Sidebar } from "../Sidebar/Sidebar";
import { SplitView } from "../SplitView/SplitView";
import { Toolbar, ToolbarDivider } from "../Toolbar/Toolbar";
import { WizardStepper } from "../WizardStepper/WizardStepper";
import { Tab, TabBar, TabList, TabPanel, Tabs } from "./Tabs";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/me", label: "Profile", icon: User },
];

describe("navigation", () => {
  it("Tabs switch with arrow keys", async () => {
    renderDs(
      <Tabs>
        <TabList aria-label="Course sections">
          <Tab id="overview">Overview</Tab>
          <Tab id="lessons">Lessons</Tab>
        </TabList>
        <TabPanel id="overview">Overview text</TabPanel>
        <TabPanel id="lessons">Lesson list</TabPanel>
      </Tabs>,
    );
    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Lessons" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Lesson list");
    await expectNoAxeViolations();
  });

  it("TabBar and Sidebar mark the current page", async () => {
    function Shell() {
      const [collapsed, setCollapsed] = useState(false);
      return (
        <div>
          <Sidebar
            aria-label="Main"
            sections={[{ title: "Learn", items }]}
            current="/courses"
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
          />
          <TabBar aria-label="Tabs" items={items} current="/courses" />
        </div>
      );
    }
    renderDs(<Shell />);
    const current = screen.getAllByRole("link", { name: "Courses" });
    current.forEach((l) => expect(l).toHaveAttribute("aria-current", "page"));
    await expectNoAxeViolations();
    const toggle = screen.getByRole("button", { name: "Toggle sidebar" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("link", { name: "Courses" })).toHaveLength(2);
    await expectNoAxeViolations();
  });

  it("NavigationBar renders one h1 and a back link", async () => {
    renderDs(
      <NavigationBar
        title="Courses"
        back={{ href: "/", label: "Home" }}
        actions={<Button size="small">New</Button>}
      />,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await expectNoAxeViolations();
  });

  it("Breadcrumbs mark the current page", async () => {
    renderDs(
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/courses", label: "Courses" },
          { href: "/courses/ai", label: "AI basics" },
        ]}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Breadcrumbs" })).toBeInTheDocument();
    expect(screen.getByText("AI basics").closest("[aria-current]")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expectNoAxeViolations();
  });

  it("WizardStepper announces progress", async () => {
    renderDs(<WizardStepper steps={["Partner", "Branding", "Admins", "Review"]} current={1} />);
    expect(screen.getByRole("navigation", { name: "Step 2 of 4" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Completed" })).toBeInTheDocument();
    expect(screen.getByText("Branding").closest("li")).toHaveAttribute("aria-current", "step");
    await expectNoAxeViolations();
  });

  it("SplitView and Toolbar", async () => {
    renderDs(
      <div>
        <Toolbar aria-label="Formatting">
          <Button variant="plain" size="small">
            Bold
          </Button>
          <ToolbarDivider />
          <Button variant="plain" size="small">
            Link
          </Button>
        </Toolbar>
        <SplitView
          list={<p>List</p>}
          detail={<p>Detail</p>}
          showDetail={false}
          onBack={() => {}}
          listLabel="Submissions"
          detailLabel="Submission"
        />
      </div>,
    );
    expect(screen.getByRole("toolbar", { name: "Formatting" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Submissions" })).toBeInTheDocument();
    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Link" })).toHaveFocus();
    await expectNoAxeViolations();
  });
});
