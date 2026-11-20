import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { Pagination } from "../Pagination/Pagination";
import { DataTable, type DataTableColumn } from "./DataTable";

interface Learner {
  id: string;
  name: string;
  cohort: string;
  progress: number;
  status: "active" | "completed" | "at-risk";
}

const people = [
  "Ada Okafor",
  "Kwame Mensah",
  "Fatu Kollie",
  "Chidi Eze",
  "Aminata Sesay",
  "Yaw Boateng",
  "Ngozi Bello",
  "Musa Bah",
];
const rows: Learner[] = people.map((name, i) => ({
  id: String(i + 1),
  name,
  cohort: i % 2 ? "Lagos, Spring" : "Monrovia, Spring",
  progress: (i * 37) % 101,
  status: i % 3 === 0 ? "completed" : i % 3 === 1 ? "active" : "at-risk",
}));

const STATUS = {
  active: { tone: "accent", label: "Active" },
  completed: { tone: "green", label: "Completed" },
  "at-risk": { tone: "orange", label: "At risk" },
} as const;

const columns: DataTableColumn<Learner>[] = [
  { id: "name", label: "Name", isRowHeader: true, sortable: true, value: (r) => r.name },
  { id: "cohort", label: "Cohort", sortable: true, value: (r) => r.cohort },
  {
    id: "status",
    label: "Status",
    sortable: true,
    value: (r) => STATUS[r.status].label,
    render: (r) => <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>,
  },
  {
    id: "progress",
    label: "Progress",
    sortable: true,
    align: "end",
    value: (r) => r.progress,
    render: (r) => `${r.progress}%`,
  },
];

const meta = {
  title: "Data/Data table",
  component: DataTable<Learner>,
  args: { "aria-label": "Learners", columns, rows },
} satisfies Meta<typeof DataTable<Learner>>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FullFeatured: Story = {
  args: {
    selectable: true,
    filterable: true,
    maxHeight: "20rem",
    bulkActions: (keys, clear) => (
      <>
        <Button size="small" variant="tinted">
          Message {keys.size}
        </Button>
        <Button size="small" variant="plain" onPress={clear}>
          Clear
        </Button>
      </>
    ),
  },
};

export const Dense: Story = { args: { dense: true } };

export const Empty: Story = { args: { rows: [], emptyState: "No learners in this cohort yet." } };

export const WithPagination: Story = {
  render: function Render(args) {
    const [page, setPage] = useState(3);
    return (
      <div className="flex flex-col gap-3">
        <DataTable {...args} />
        <Pagination page={page} pageCount={12} onPageChange={setPage} />
      </div>
    );
  },
};
