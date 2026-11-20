// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookOpen, Globe } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations, renderDs } from "../../testing";
import { Avatar, AvatarStack, initials } from "../Avatar/Avatar";
import { Badge, Chip } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { Disclosure, DisclosureGroup } from "../Disclosure/Disclosure";
import { EmptyState } from "../EmptyState/EmptyState";
import { ListRow, ListSection } from "../List/List";
import { ProgressBar, ProgressRing } from "../Progress/Progress";
import { Skeleton, SkeletonGroup, SkeletonText } from "../Skeleton/Skeleton";
import { Switch } from "../Switch/Switch";
import { Card, CardHeader } from "./Card";

describe("display components", () => {
  it("Card, Badge, Chip and Avatar pass axe", async () => {
    renderDs(
      <Card as="section" aria-labelledby="c1">
        <CardHeader
          titleId="c1"
          title="AI basics"
          subtitle="12 lessons"
          action={<Badge tone="green">Open</Badge>}
        />
        <Chip>Beginner</Chip>
        <Avatar name="Ada Okafor" />
        <AvatarStack people={[{ name: "A B" }, { name: "C D" }, { name: "E F" }]} max={2} />
      </Card>,
    );
    expect(screen.getByRole("region", { name: "AI basics" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ada Okafor" })).toHaveTextContent("AO");
    expect(screen.getByRole("img", { name: "1 more person" })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it("Chip toggles and shows a check mark", async () => {
    renderDs(<Chip>Beginner</Chip>);
    const chip = screen.getByRole("button", { name: "Beginner" });
    await userEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip.querySelector("svg")).not.toBeNull();
  });

  it("computes initials", () => {
    expect(initials("Ada Okafor")).toBe("AO");
    expect(initials("  kwame  ")).toBe("K");
    expect(initials("Fatu M. Kollie")).toBe("FK");
  });

  it("ProgressBar and ProgressRing expose values", async () => {
    renderDs(
      <div>
        <ProgressBar label="Course progress" value={40} />
        <ProgressRing value={75} size={64} showValue aria-label="Module" />
        <ProgressBar aria-label="Uploading" isIndeterminate />
      </div>,
    );
    expect(screen.getByRole("progressbar", { name: "Course progress" })).toHaveAttribute(
      "aria-valuenow",
      "40",
    );
    expect(screen.getByRole("progressbar", { name: "Module" })).toHaveTextContent("75%");
    await expectNoAxeViolations();
  });

  it("Skeleton announces loading once and hides placeholders", async () => {
    renderDs(
      <SkeletonGroup>
        <Skeleton circle className="size-10" />
        <SkeletonText />
      </SkeletonGroup>,
    );
    expect(screen.getByRole("status", { name: "Loading" })).toHaveAttribute("aria-busy", "true");
    await expectNoAxeViolations();
  });

  it("EmptyState has a heading and one action", async () => {
    renderDs(
      <EmptyState
        icon={BookOpen}
        title="No courses yet"
        description="Create your first course."
        action={<Button>New course</Button>}
      />,
    );
    expect(screen.getByRole("heading", { name: "No courses yet" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    await expectNoAxeViolations();
  });

  it("ListSection rows: link, button and control rows", async () => {
    const onPress = vi.fn();
    renderDs(
      <ListSection header="General" footer="Applies to all your courses.">
        <ListRow icon={Globe} title="Language" trailing="English" href="/settings/language" />
        <ListRow title="Sign out" onPress={onPress} />
        <ListRow title="Reminders" trailing={<Switch aria-label="Reminders" />} />
      </ListSection>,
    );
    expect(screen.getByRole("region", { name: "General" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Language/ })).toHaveAttribute(
      "href",
      "/settings/language",
    );
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onPress).toHaveBeenCalled();
    await expectNoAxeViolations();
  });

  it("ListRow marks the selected item with aria-current", () => {
    renderDs(
      <ListSection>
        <ListRow title="Ada Okafor" onPress={() => {}} isSelected />
        <ListRow title="Kwame Mensah" onPress={() => {}} />
      </ListSection>,
    );
    expect(screen.getByRole("button", { name: "Ada Okafor" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("button", { name: "Kwame Mensah" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("Disclosure expands with the keyboard", async () => {
    renderDs(
      <DisclosureGroup>
        <Disclosure title="What do I need?">A phone and a data plan.</Disclosure>
      </DisclosureGroup>,
    );
    const trigger = screen.getByRole("button", { name: "What do I need?" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("A phone and a data plan.")).toBeVisible();
    await expectNoAxeViolations();
  });
});
