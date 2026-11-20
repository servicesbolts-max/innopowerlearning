// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations, renderDs } from "../../testing";
import { Button } from "../Button/Button";
import { Pagination, pageWindow } from "../Pagination/Pagination";
import { DataTable, type DataTableColumn } from "./DataTable";

interface Learner {
  id: string;
  name: string;
  course: string;
  progress: number;
}

const rows: Learner[] = [
  { id: "1", name: "Ada Okafor", course: "AI basics", progress: 80 },
  { id: "2", name: "Kwame Mensah", course: "Bookkeeping", progress: 35 },
  { id: "3", name: "Fatu Kollie", course: "AI basics", progress: 100 },
];

const columns: DataTableColumn<Learner>[] = [
  { id: "name", label: "Name", isRowHeader: true, sortable: true, value: (r) => r.name },
  { id: "course", label: "Course", sortable: true, value: (r) => r.course },
  { id: "progress", label: "Progress", sortable: true, align: "end", value: (r) => r.progress },
];

const names = () => screen.getAllByRole("rowheader").map((c) => c.textContent);

describe("DataTable", () => {
  it("renders a labelled grid and passes axe", async () => {
    renderDs(
      <DataTable aria-label="Learners" columns={columns} rows={rows} selectable filterable />,
    );
    expect(screen.getByRole("grid", { name: "Learners" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(4);
    await expectNoAxeViolations();
  });

  it("sorts by a column header, ascending then descending", async () => {
    renderDs(<DataTable aria-label="Learners" columns={columns} rows={rows} />);
    await userEvent.click(screen.getByRole("columnheader", { name: /Progress/ }));
    expect(names()).toEqual(["Kwame Mensah", "Ada Okafor", "Fatu Kollie"]);
    await userEvent.click(screen.getByRole("columnheader", { name: /Progress/ }));
    expect(names()).toEqual(["Fatu Kollie", "Ada Okafor", "Kwame Mensah"]);
  });

  it("filters rows across columns", async () => {
    renderDs(<DataTable aria-label="Learners" columns={columns} rows={rows} filterable />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Filter" }), "book");
    expect(names()).toEqual(["Kwame Mensah"]);
    await userEvent.clear(screen.getByRole("searchbox"));
    await userEvent.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("selects rows and shows bulk actions", async () => {
    renderDs(
      <DataTable
        aria-label="Learners"
        columns={columns}
        rows={rows}
        selectable
        filterable
        bulkActions={(keys, clear) => (
          <Button size="small" onPress={clear}>
            Message {keys.size}
          </Button>
        )}
      />,
    );
    const firstRow = screen.getAllByRole("row")[1]!;
    await userEvent.click(within(firstRow).getByRole("checkbox"));
    // Announced by the always-mounted live region, and shown in the bulk-action bar.
    expect(screen.getByText("1 selected", { selector: "[aria-live]" })).toBeInTheDocument();
    expect(screen.getByText("1 selected", { selector: "[aria-hidden]" })).toBeVisible();
    expect(screen.getByRole("searchbox", { name: "Filter" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all" }));
    expect(screen.getByRole("button", { name: "Message 3" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Message 3" }));
    expect(screen.queryByRole("button", { name: "Message 3" })).not.toBeInTheDocument();
    expect(screen.queryByText("3 selected")).not.toBeInTheDocument();
  });

  it("hides columns from the column menu", async () => {
    renderDs(<DataTable aria-label="Learners" columns={columns} rows={rows} />);
    await userEvent.click(screen.getByRole("button", { name: "Columns" }));
    await userEvent.click(await screen.findByRole("checkbox", { name: "Course" }));
    expect(screen.queryByRole("columnheader", { name: "Course" })).not.toBeInTheDocument();
  });
});

describe("Pagination", () => {
  it("windows the page list with gaps", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageWindow(3, 10)).toEqual([1, 2, 3, 4, null, 10]);
  });

  it("marks the current page and disables previous on page 1", async () => {
    let page = 1;
    renderDs(<Pagination page={1} pageCount={8} onPageChange={(p) => (page = p)} />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(page).toBe(2);
    await expectNoAxeViolations();
  });
});
