"use client";

import { CalendarDate, Time } from "@internationalized/date";
import {
  Archive,
  Bell,
  Bold,
  BookOpen,
  CircleCheck,
  CircleX,
  Clock,
  Copy,
  Ellipsis,
  Globe,
  Home,
  Italic,
  Link2,
  Lock,
  LogOut,
  MessageCircle,
  Moon,
  Pencil,
  Settings,
  Trash2,
  User,
  Users,
} from "lucide-react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";
import { DialogTrigger, type Key } from "react-aria-components";
import {
  ActionSheet,
  AlertDialog,
  Avatar,
  AvatarStack,
  Badge,
  Banner,
  Breadcrumbs,
  Button,
  Calendar,
  Card,
  CardHeader,
  Checkbox,
  CheckboxGroup,
  Chip,
  ContextMenu,
  DataTable,
  DatePicker,
  Disclosure,
  DisclosureGroup,
  EmptyState,
  Icon,
  Link,
  ListRow,
  ListSection,
  Menu,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  NavigationBar,
  Pagination,
  PopoverDialog,
  ProgressBar,
  ProgressRing,
  Radio,
  RadioGroup,
  SearchField,
  SegmentedControl,
  Select,
  SelectItem,
  Sheet,
  Sidebar,
  Skeleton,
  SkeletonGroup,
  SkeletonText,
  Slider,
  SplitView,
  Stepper,
  Switch,
  Tab,
  TabBar,
  TabList,
  TabPanel,
  Tabs,
  Text,
  TextArea,
  TextField,
  TimeField,
  ToastRegion,
  Toolbar,
  ToolbarDivider,
  Tooltip,
  TooltipTrigger,
  WizardStepper,
  toast,
  type BadgeTone,
  type DataTableColumn,
  type SearchToken,
  type TextVariant,
} from "@/design-system";
import { PRODUCT_NAME } from "@/lib/config";
import { DEMO_THEME_NAMES, type ContrastCheck, type DemoThemeName } from "@/lib/theme";

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5 border-t border-separator pt-8">
      <Text as="h2" variant="title2" id={id}>
        {title}
      </Text>
      {children}
    </section>
  );
}

const TYPE_SCALE: TextVariant[] = [
  "large-title",
  "title1",
  "title2",
  "title3",
  "headline",
  "body",
  "callout",
  "subheadline",
  "footnote",
  "caption1",
  "caption2",
];

const SWATCHES = [
  { key: "accentFill", className: "bg-accent-fill" },
  { key: "accentTint", className: "bg-accent-tint" },
  { key: "accent2", className: "bg-accent2-fill" },
  { key: "green", className: "bg-green-fill" },
  { key: "red", className: "bg-red-fill" },
  { key: "orange", className: "bg-orange-fill" },
] as const;

interface Learner {
  id: string;
  name: string;
  cohort: string;
  progress: number;
  status: "active" | "completed" | "atRisk";
}

const LEARNERS: Learner[] = [
  { id: "1", name: "Ada Okafor", cohort: "Lagos", progress: 82, status: "active" },
  { id: "2", name: "Kwame Mensah", cohort: "Accra", progress: 100, status: "completed" },
  { id: "3", name: "Fatu Kollie", cohort: "Monrovia", progress: 34, status: "atRisk" },
  { id: "4", name: "Chidi Eze", cohort: "Lagos", progress: 57, status: "active" },
  { id: "5", name: "Aminata Sesay", cohort: "Freetown", progress: 100, status: "completed" },
];

type SchemeChoice = "system" | "light" | "dark";

export function Showcase({ theme, report }: { theme: DemoThemeName; report: ContrastCheck[] }) {
  const t = useTranslations("design");
  const [scheme, setScheme] = useState<SchemeChoice>("system");
  const [view, setView] = useState<Key>("all");
  const [tokens, setTokens] = useState<SearchToken[]>([
    { id: "design", label: t("form.tokenDesign") },
    { id: "beginner", label: t("form.tokenBeginner") },
  ]);
  const [page, setPage] = useState(2);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openSubmission, setOpenSubmission] = useState<string | null>(null);

  const changeScheme = (key: Key) => {
    const next = key as SchemeChoice;
    setScheme(next);
    if (next === "system") delete document.documentElement.dataset.scheme;
    else document.documentElement.dataset.scheme = next;
  };

  const statusBadge: Record<Learner["status"], { tone: BadgeTone; label: string }> = {
    active: { tone: "accent", label: t("display.badgeActive") },
    completed: { tone: "green", label: t("display.badgeCompleted") },
    atRisk: { tone: "orange", label: t("display.badgeAtRisk") },
  };
  const learnerColumns: DataTableColumn<Learner>[] = [
    { id: "name", label: t("data.name"), isRowHeader: true, sortable: true, value: (r) => r.name },
    { id: "cohort", label: t("data.cohort"), sortable: true, value: (r) => r.cohort },
    {
      id: "status",
      label: t("data.status"),
      sortable: true,
      value: (r) => statusBadge[r.status].label,
      render: (r) => <Badge tone={statusBadge[r.status].tone}>{statusBadge[r.status].label}</Badge>,
    },
    {
      id: "progress",
      label: t("data.progress"),
      sortable: true,
      align: "end",
      value: (r) => r.progress,
      render: (r) => `${r.progress}%`,
    },
  ];

  const reportRows = report.map((c, i) => ({ ...c, id: String(i) }));
  const reportColumns: DataTableColumn<(typeof reportRows)[number]>[] = [
    { id: "pair", label: t("contrast.pair"), isRowHeader: true, value: (r) => r.pair },
    { id: "scheme", label: t("contrast.scheme"), sortable: true, value: (r) => r.scheme },
    {
      id: "ratio",
      label: t("contrast.ratio"),
      sortable: true,
      align: "end",
      value: (r) => r.ratio,
      render: (r) => `${r.ratio.toFixed(2)}:1`,
    },
    {
      id: "result",
      label: t("contrast.result"),
      value: (r) => (r.pass ? t("contrast.pass") : t("contrast.fail")),
      render: (r) =>
        r.pass ? (
          <Badge tone="green" icon={CircleCheck}>
            {t("contrast.pass")}
          </Badge>
        ) : (
          <Badge tone="red" icon={CircleX}>
            {t("contrast.fail")}
          </Badge>
        ),
    },
  ];

  const nav = [
    { href: "#home", label: t("navigation.home"), icon: Home },
    { href: "#courses", label: t("navigation.courses"), icon: BookOpen },
    { href: "#community", label: t("navigation.community"), icon: MessageCircle },
    { href: "#profile", label: t("navigation.profile"), icon: User },
  ];

  const lessonMenu = (
    <>
      <MenuItem id="edit" icon={Pencil}>
        {t("overlays.edit")}
      </MenuItem>
      <MenuItem id="duplicate" icon={Copy}>
        {t("overlays.duplicate")}
      </MenuItem>
      <MenuItem id="archive" icon={Archive}>
        {t("overlays.archive")}
      </MenuItem>
      <MenuSeparator />
      <MenuItem id="delete" icon={Trash2} destructive>
        {t("overlays.deleteLesson")}
      </MenuItem>
    </>
  );

  return (
    <div className="min-h-dvh bg-bg pb-24 md:pb-0">
      <NavigationBar
        title={t("title")}
        accessory={
          <div className="flex flex-col gap-4">
            <Text tone="secondary" variant="subheadline" className="max-w-reading">
              {t("intro", { product: PRODUCT_NAME, theme: t(`themeNames.${theme}`) })}
            </Text>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <nav aria-label={t("themes")}>
                <ul className="flex flex-wrap gap-2">
                  {DEMO_THEME_NAMES.map((name) => (
                    <li key={name}>
                      <NextLink
                        href={`/design/${name}`}
                        aria-current={name === theme ? "page" : undefined}
                        className="inline-flex min-h-touch-dense items-center rounded-full border border-control-border px-3 text-subheadline font-medium text-label hover:bg-fill aria-[current=page]:border-transparent aria-[current=page]:bg-accent-tint aria-[current=page]:font-semibold aria-[current=page]:text-accent-text-on-tint"
                      >
                        {t(`themeNames.${name}`)}
                      </NextLink>
                    </li>
                  ))}
                </ul>
              </nav>
              <SegmentedControl
                aria-label={t("scheme")}
                segments={[
                  { id: "system", label: t("schemeSystem") },
                  { id: "light", label: t("schemeLight") },
                  { id: "dark", label: t("schemeDark") },
                ]}
                selectedKey={scheme}
                onSelectionChange={changeScheme}
              />
            </div>
          </div>
        }
      />

      <main className="mx-auto flex max-w-app flex-col gap-12 px-4 pt-4 pb-16">
        <Section title={t("sections.foundations")}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SWATCHES.map((s) => (
              <li key={s.key} className="flex flex-col gap-2">
                <span
                  aria-hidden
                  className={`h-16 rounded-card border border-separator ${s.className}`}
                />
                <Text variant="footnote" tone="secondary">
                  {t(`swatches.${s.key}`)}
                </Text>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 overflow-hidden">
            {TYPE_SCALE.map((v) => (
              <div key={v} className="flex items-baseline gap-4">
                <Text as="span" variant="caption1" tone="secondary" className="w-24 shrink-0">
                  {v}
                </Text>
                <Text as="span" variant={v} className="truncate">
                  {t("typeSample")}
                </Text>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t("sections.actions")}>
          <div className="flex flex-wrap items-center gap-3">
            {(["filled", "tinted", "gray", "plain"] as const).map((v) => (
              <Button key={v} variant={v}>
                {t(`variants.${v}`)}
              </Button>
            ))}
            <Button destructive>{t("deleteCourse")}</Button>
            <Button isPending>{t("saving")}</Button>
            <Button size="small" variant="tinted">
              {t("newCourse")}
            </Button>
            <Button size="large" pill>
              {t("startLearning")}
            </Button>
          </div>
          <Text className="max-w-reading">
            {t("inlineLinkBefore")}
            <Link href="#outline">{t("inlineLink")}</Link>
            {t("inlineLinkAfter")}
          </Text>
        </Section>

        <Section title={t("sections.inputs")}>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <TextField
                label={t("form.fullName")}
                placeholder={t("form.fullNamePlaceholder")}
                description={t("form.fullNameHelp")}
              />
              <TextField
                label={t("form.email")}
                isInvalid
                errorMessage={t("form.emailError")}
                defaultValue="ada@"
              />
              <TextArea label={t("form.about")} rows={3} />
              <Select label={t("form.language")} defaultSelectedKey="en">
                {(["en", "fr", "yo", "ha"] as const).map((l) => (
                  <SelectItem key={l} id={l}>
                    {t(`form.languages.${l}`)}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-4">
              <SearchField
                label={t("form.searchCourses")}
                tokens={tokens}
                onRemoveToken={(id) => setTokens((ts) => ts.filter((x) => x.id !== id))}
              />
              <DatePicker
                label={t("form.startDate")}
                defaultValue={new CalendarDate(2026, 12, 1)}
              />
              <TimeField label={t("form.startTime")} defaultValue={new Time(9, 30)} />
              <Stepper label={t("form.seats")} defaultValue={25} minValue={1} />
              <Slider
                label={t("form.dailyGoal")}
                defaultValue={30}
                minValue={5}
                maxValue={120}
                step={5}
              />
            </div>
          </div>
          <Card className="w-fit">
            <Calendar
              aria-label={t("form.calendar")}
              defaultValue={new CalendarDate(2026, 12, 1)}
            />
          </Card>
        </Section>

        <Section title={t("sections.selection")}>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex flex-col gap-4">
              <Switch defaultSelected>{t("selection.reminders")}</Switch>
              <SegmentedControl
                aria-label={t("selection.view")}
                segments={[
                  { id: "all", label: t("selection.viewAll") },
                  { id: "progress", label: t("selection.viewProgress") },
                  { id: "done", label: t("selection.viewDone") },
                ]}
                selectedKey={view}
                onSelectionChange={setView}
              />
            </div>
            <CheckboxGroup label={t("selection.interests")} defaultValue={["ai"]}>
              <Checkbox value="ai">{t("selection.ai")}</Checkbox>
              <Checkbox value="business">{t("selection.business")}</Checkbox>
              <Checkbox value="agriculture">{t("selection.agriculture")}</Checkbox>
            </CheckboxGroup>
            <RadioGroup label={t("selection.attend")} defaultValue="online">
              <Radio value="online">{t("selection.online")}</Radio>
              <Radio value="campus">{t("selection.campus")}</Radio>
              <Radio value="hybrid">{t("selection.hybrid")}</Radio>
            </RadioGroup>
          </div>
        </Section>

        <Section title={t("sections.display")}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{t("display.badgeActive")}</Badge>
            <Badge tone="green" icon={CircleCheck}>
              {t("display.badgeCompleted")}
            </Badge>
            <Badge tone="orange">{t("display.badgeAtRisk")}</Badge>
            <Badge tone="red">{t("display.badgeOverdue")}</Badge>
            <Chip defaultSelected>{t("display.chipAll")}</Chip>
            <Chip>{t("display.chipBeginner")}</Chip>
            <Chip>{t("display.chipAdvanced")}</Chip>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card as="article" aria-labelledby="showcase-course">
              <CardHeader
                titleId="showcase-course"
                title={t("display.courseTitle")}
                subtitle={t("display.courseMeta")}
                action={<Badge tone="green">{t("display.new")}</Badge>}
              />
              <Text variant="subheadline" tone="secondary" className="mb-4">
                {t("display.courseSummary")}
              </Text>
              <div className="mb-4 flex items-center gap-4 text-footnote text-label-secondary">
                <span className="inline-flex items-center gap-1">
                  <Icon icon={Clock} size={16} />4 h
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon icon={BookOpen} size={16} />
                  {t("display.chipBeginner")}
                </span>
              </div>
              <ProgressBar label={t("display.yourProgress")} value={40} className="mb-4" />
              <div className="flex items-center justify-between gap-3">
                <AvatarStack people={LEARNERS.map((l) => ({ name: l.name }))} max={3} size={32} />
                <Button size="small">{t("display.continue")}</Button>
              </div>
            </Card>
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <Avatar name="Ada Okafor" size={56} />
                <Avatar name="Kwame Mensah" size={40} />
                <ProgressRing value={75} size={64} showValue aria-label={t("display.module")} />
                <ProgressRing value={40} size={40} aria-label={t("display.module")} />
              </div>
              <ProgressBar label={t("display.uploading")} isIndeterminate />
              <SkeletonGroup className="flex gap-3">
                <Skeleton circle className="size-10 shrink-0" />
                <div className="flex-1">
                  <SkeletonText lines={2} />
                </div>
              </SkeletonGroup>
            </div>
          </div>
          <Card>
            <EmptyState
              icon={BookOpen}
              headingLevel="h3"
              title={t("display.emptyTitle")}
              description={t("display.emptyBody")}
              action={<Button>{t("newCourse")}</Button>}
            />
          </Card>
        </Section>

        <Section title={t("sections.lists")}>
          <div className="grid gap-6 rounded-card bg-bg-grouped p-4 md:grid-cols-2">
            <div className="flex flex-col gap-6">
              <ListSection header={t("lists.preferences")} footer={t("lists.preferencesFooter")}>
                <ListRow
                  icon={Globe}
                  title={t("lists.language")}
                  trailing={t("lists.english")}
                  href="#language"
                />
                <ListRow
                  icon={Moon}
                  iconTone="indigo"
                  title={t("lists.appearance")}
                  trailing={t("schemeSystem")}
                  href="#appearance"
                />
                <ListRow
                  icon={Bell}
                  iconTone="red"
                  title={t("lists.reminders")}
                  trailing={<Switch aria-label={t("lists.reminders")} defaultSelected />}
                />
              </ListSection>
              <ListSection header={t("lists.account")}>
                <ListRow
                  icon={Lock}
                  iconTone="gray"
                  title={t("lists.twoStep")}
                  subtitle={t("lists.twoStepSub")}
                  trailing={<Badge tone="green">{t("lists.on")}</Badge>}
                  href="#two-step"
                />
                <ListRow
                  icon={LogOut}
                  iconTone="gray"
                  title={t("lists.signOut")}
                  onPress={() => {}}
                />
              </ListSection>
            </div>
            <DisclosureGroup>
              <Disclosure title={t("lists.faq1")} defaultExpanded>
                {t("lists.faq1Body")}
              </Disclosure>
              <Disclosure title={t("lists.faq2")}>{t("lists.faq2Body")}</Disclosure>
            </DisclosureGroup>
          </div>
        </Section>

        <Section title={t("sections.data")}>
          <DataTable
            aria-label={t("data.learners")}
            columns={learnerColumns}
            rows={LEARNERS}
            selectable
            filterable
            bulkActions={(keys, clear) => (
              <>
                <Button size="small" variant="tinted">
                  {t("data.message", { count: keys.size })}
                </Button>
                <Button size="small" variant="plain" onPress={clear}>
                  {t("data.clear")}
                </Button>
              </>
            )}
          />
          <Pagination page={page} pageCount={9} onPageChange={setPage} />
        </Section>

        <Section title={t("sections.overlays")}>
          <div className="flex flex-wrap items-center gap-3">
            <DialogTrigger>
              <Button>{t("overlays.openSheet")}</Button>
              <Sheet
                title={t("overlays.sheetTitle")}
                footer={
                  <>
                    <Button variant="gray" slot="close">
                      {t("overlays.cancel")}
                    </Button>
                    <Button>{t("overlays.create")}</Button>
                  </>
                }
              >
                <TextField label={t("overlays.title")} placeholder={t("display.courseTitle")} />
              </Sheet>
            </DialogTrigger>
            <DialogTrigger>
              <Button destructive variant="tinted">
                {t("deleteCourse")}
              </Button>
              <AlertDialog
                title={t("overlays.deleteTitle")}
                actionLabel={t("deleteCourse")}
                destructive
                onAction={() => {}}
              >
                {t("overlays.deleteBody")}
              </AlertDialog>
            </DialogTrigger>
            <DialogTrigger>
              <Button variant="gray">{t("overlays.lessonOptions")}</Button>
              <ActionSheet
                title={t("overlays.lessonTitle")}
                actions={[
                  { label: t("overlays.duplicate"), onAction: () => {} },
                  { label: t("overlays.move"), onAction: () => {} },
                  { label: t("overlays.deleteLesson"), onAction: () => {}, destructive: true },
                ]}
              />
            </DialogTrigger>
            <MenuTrigger>
              <Button variant="gray" aria-label={t("overlays.actions")}>
                <Icon icon={Ellipsis} />
              </Button>
              <Menu>{lessonMenu}</Menu>
            </MenuTrigger>
            <DialogTrigger>
              <Button variant="plain">{t("overlays.details")}</Button>
              <PopoverDialog aria-label={t("overlays.details")} showArrow>
                <p className="max-w-60 text-subheadline">{t("overlays.detailsBody")}</p>
              </PopoverDialog>
            </DialogTrigger>
            <TooltipTrigger>
              <Button variant="gray" aria-label={t("overlays.copyLink")}>
                <Icon icon={Copy} />
              </Button>
              <Tooltip>{t("overlays.copyLink")}</Tooltip>
            </TooltipTrigger>
            <Button
              variant="tinted"
              onPress={() =>
                toast.add(
                  {
                    title: t("overlays.toastTitle"),
                    description: t("overlays.toastBody"),
                    action: { label: t("overlays.undo"), onAction: () => {} },
                  },
                  { timeout: 6000 },
                )
              }
            >
              {t("overlays.showToast")}
            </Button>
          </div>
          <ContextMenu
            aria-label={t("overlays.lessonTitle")}
            menu={lessonMenu}
            className="rounded-card bg-bg-secondary p-5 text-subheadline"
          >
            {t("overlays.contextTarget")}
          </ContextMenu>
          <div className="grid gap-3 md:grid-cols-2">
            <Banner tone="info" title={t("overlays.bannerInfo")} />
            <Banner tone="success" title={t("overlays.bannerSuccess")}>
              {t("overlays.bannerSuccessBody")}
            </Banner>
            <Banner tone="warning" title={t("overlays.bannerWarning")} />
            <Banner tone="danger" title={t("overlays.bannerDanger")}>
              {t("overlays.bannerDangerBody")}
            </Banner>
          </div>
        </Section>

        <Section title={t("sections.navigation")}>
          <Breadcrumbs
            items={[
              { href: "#home", label: t("navigation.home") },
              { href: "#courses", label: t("navigation.courses") },
              { href: "#course", label: t("display.courseTitle") },
            ]}
          />
          <Tabs>
            <TabList aria-label={t("navigation.courseSections")}>
              <Tab id="overview">{t("navigation.overview")}</Tab>
              <Tab id="lessons">{t("navigation.lessons")}</Tab>
              <Tab id="reviews">{t("navigation.reviews")}</Tab>
            </TabList>
            <TabPanel id="overview">{t("navigation.overviewBody")}</TabPanel>
            <TabPanel id="lessons">{t("navigation.lessonsBody")}</TabPanel>
            <TabPanel id="reviews">{t("navigation.reviewsBody")}</TabPanel>
          </Tabs>
          <WizardStepper
            steps={[
              t("navigation.steps.partner"),
              t("navigation.steps.branding"),
              t("navigation.steps.admins"),
              t("navigation.steps.review"),
            ]}
            current={1}
          />
          <Toolbar aria-label={t("navigation.formatting")} className="w-fit">
            <Button variant="plain" size="small" aria-label={t("navigation.bold")}>
              <Icon icon={Bold} size={16} />
            </Button>
            <Button variant="plain" size="small" aria-label={t("navigation.italic")}>
              <Icon icon={Italic} size={16} />
            </Button>
            <ToolbarDivider />
            <Button variant="plain" size="small" aria-label={t("navigation.link")}>
              <Icon icon={Link2} size={16} />
            </Button>
          </Toolbar>
          <div className="hidden h-96 overflow-hidden rounded-card border border-separator md:flex">
            <Sidebar
              aria-label={t("navigation.admin")}
              header={t("navigation.adminTitle")}
              collapsed={sidebarCollapsed}
              onCollapsedChange={setSidebarCollapsed}
              current="#learners"
              className="h-auto"
              sections={[
                { items: [{ href: "#dashboard", label: t("navigation.dashboard"), icon: Home }] },
                {
                  title: t("navigation.people"),
                  items: [
                    { href: "#learners", label: t("data.learners"), icon: Users, badge: "1,204" },
                    { href: "#courses", label: t("navigation.courses"), icon: BookOpen },
                  ],
                },
                { items: [{ href: "#settings", label: t("navigation.settings"), icon: Settings }] },
              ]}
            />
            <div className="flex-1 p-6 text-label-secondary">{t("navigation.content")}</div>
          </div>
          <SplitView
            listLabel={t("navigation.submissions")}
            detailLabel={t("navigation.submission")}
            showDetail={openSubmission !== null}
            onBack={() => setOpenSubmission(null)}
            list={
              <ul>
                {LEARNERS.slice(0, 3).map((l) => (
                  <ListRow
                    key={l.id}
                    title={l.name}
                    subtitle={t("navigation.assignment")}
                    onPress={() => setOpenSubmission(l.name)}
                  />
                ))}
              </ul>
            }
            detail={
              <div className="p-5">
                <Text as="h3" variant="title3">
                  {openSubmission ?? t("navigation.selectSubmission")}
                </Text>
              </div>
            }
          />
        </Section>

        <Section title={t("sections.contrast")}>
          <Text variant="subheadline" tone="secondary" className="max-w-reading">
            {t("contrast.intro")}
          </Text>
          <DataTable
            aria-label={t("sections.contrast")}
            columns={reportColumns}
            rows={reportRows}
            dense
            maxHeight="28rem"
          />
        </Section>
      </main>

      <TabBar aria-label={t("navigation.mainNav")} items={nav} current="#courses" />
      <ToastRegion />
    </div>
  );
}
