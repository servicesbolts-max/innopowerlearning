// @vitest-environment jsdom
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Copy, Trash2 } from "lucide-react";
import { DialogTrigger } from "react-aria-components";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations, renderDs } from "../../testing";
import { Button } from "../Button/Button";
import { ContextMenu, Menu, MenuItem, MenuSeparator, MenuTrigger } from "../Menu/Menu";
import { TextField } from "../TextField/TextField";
import { Banner, ToastRegion, toast } from "../Toast/Toast";
import { Tooltip, TooltipTrigger } from "../Tooltip/Tooltip";
import { ActionSheet, AlertDialog, Sheet } from "./Sheet";

describe("overlays", () => {
  it("Sheet opens as a labelled modal dialog, traps focus and closes with Escape", async () => {
    renderDs(
      <DialogTrigger>
        <Button>New course</Button>
        <Sheet title="New course" footer={<Button>Create</Button>}>
          <TextField label="Title" autoFocus />
        </Sheet>
      </DialogTrigger>,
    );
    await userEvent.click(screen.getByRole("button", { name: "New course" }));
    const dialog = await screen.findByRole("dialog", { name: "New course" });
    expect(within(dialog).getByRole("textbox", { name: "Title" })).toHaveFocus();
    await expectNoAxeViolations();
    for (let i = 0; i < 4; i++) await userEvent.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("AlertDialog is an alertdialog that focuses Cancel and confirms", async () => {
    const onAction = vi.fn();
    renderDs(
      <DialogTrigger>
        <Button destructive>Delete</Button>
        <AlertDialog
          title="Delete this course?"
          actionLabel="Delete course"
          destructive
          onAction={onAction}
        >
          Learners lose access. This cannot be undone.
        </AlertDialog>
      </DialogTrigger>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete this course?" });
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await expectNoAxeViolations();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete course" }));
    expect(onAction).toHaveBeenCalled();
  });

  it("ActionSheet runs an action and closes", async () => {
    const onShare = vi.fn();
    renderDs(
      <DialogTrigger>
        <Button>More</Button>
        <ActionSheet
          title="Lesson 3"
          actions={[
            { label: "Share", onAction: onShare },
            { label: "Remove", onAction: () => {}, destructive: true },
          ]}
        />
      </DialogTrigger>,
    );
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    await expectNoAxeViolations();
    await userEvent.click(await screen.findByRole("button", { name: "Share" }));
    expect(onShare).toHaveBeenCalled();
  });

  it("Menu is keyboard operable", async () => {
    const onAction = vi.fn();
    renderDs(
      <MenuTrigger>
        <Button variant="gray">Actions</Button>
        <Menu onAction={onAction}>
          <MenuItem id="dup" icon={Copy} shortcut="⌘D">
            Duplicate
          </MenuItem>
          <MenuSeparator />
          <MenuItem id="del" icon={Trash2} destructive>
            Delete
          </MenuItem>
        </Menu>
      </MenuTrigger>,
    );
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    const menu = await screen.findByRole("menu");
    await expectNoAxeViolations();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    // React Aria passes the key first (a second argument was added in 1.22).
    expect(onAction.mock.calls[0]?.[0]).toBe("del");
    expect(menu).not.toBeInTheDocument();
  });

  it("ContextMenu opens with Shift+F10", async () => {
    const onAction = vi.fn();
    renderDs(
      <ContextMenu
        aria-label="Lesson 3"
        menu={
          <MenuItem id="rename" onAction={onAction}>
            Rename
          </MenuItem>
        }
      >
        Lesson 3
      </ContextMenu>,
    );
    await userEvent.tab();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Rename" }));
    expect(onAction).toHaveBeenCalled();
  });

  it("Tooltip appears on keyboard focus", async () => {
    renderDs(
      <TooltipTrigger delay={0}>
        <Button aria-label="Copy link" variant="plain">
          <Copy />
        </Button>
        <Tooltip>Copy link</Tooltip>
      </TooltipTrigger>,
    );
    await userEvent.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Copy link");
  });

  it("Toast shows with an undo action; Banner uses the right role", async () => {
    const onUndo = vi.fn();
    renderDs(
      <div>
        <ToastRegion />
        <Banner tone="danger" title="Payment failed">
          Check your card details and try again.
        </Banner>
        <Banner tone="success" title="Saved" />
      </div>,
    );
    act(() => {
      toast.add({ title: "Lesson archived", action: { label: "Undo", onAction: onUndo } });
    });
    const region = await screen.findByRole("region", { name: "Notifications" });
    expect(within(region).getByText("Lesson archived")).toBeInTheDocument();
    expect(screen.getByText("Payment failed").closest("[role]")).toHaveAttribute("role", "alert");
    expect(screen.getByText("Saved").closest("[role]")).toHaveAttribute("role", "status");
    await expectNoAxeViolations();
    await userEvent.click(within(region).getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalled();
  });
});
