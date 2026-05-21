import { z } from "zod";

// ────────────────────────────── Input group (PR-2) ──────────────────────────────

export const CheckboxSchema = z.object({
  label: z.string().default(""),
  checked: z.boolean().default(false),
  disabled: z.boolean().default(false),
});
export type CheckboxValues = z.infer<typeof CheckboxSchema>;
export const CHECKBOX_DEFAULTS: CheckboxValues = {
  label: "",
  checked: false,
  disabled: false,
};

const OptionPairSchema = z.object({
  value: z.string().default(""),
  label: z.string().default(""),
});

export const RadioGroupSchema = z.object({
  label: z.string().default(""),
  options: z.array(OptionPairSchema).default([]),
  value: z.string().default(""),
  orientation: z.enum(["row", "col"]).default("col"),
});
export type RadioGroupValues = z.infer<typeof RadioGroupSchema>;
export const RADIO_GROUP_DEFAULTS: RadioGroupValues = {
  label: "",
  options: [],
  value: "",
  orientation: "col",
};

export const SwitchSchema = z.object({
  label: z.string().default(""),
  checked: z.boolean().default(false),
  size: z.enum(["sm", "md", "lg"]).default("md"),
});
export type SwitchValues = z.infer<typeof SwitchSchema>;
export const SWITCH_DEFAULTS: SwitchValues = {
  label: "",
  checked: false,
  size: "md",
};

export const SelectSchema = z.object({
  label: z.string().default(""),
  placeholder: z.string().default(""),
  options: z.array(OptionPairSchema).default([]),
  value: z.string().default(""),
  required: z.boolean().default(false),
});
export type SelectValues = z.infer<typeof SelectSchema>;
export const SELECT_DEFAULTS: SelectValues = {
  label: "",
  placeholder: "",
  options: [],
  value: "",
  required: false,
};

export const TextareaSchema = z.object({
  label: z.string().default(""),
  placeholder: z.string().default(""),
  rows: z.number().int().min(1).max(20).default(3),
  value: z.string().default(""),
  required: z.boolean().default(false),
  // 0 means no limit
  maxLength: z.number().int().min(0).default(0),
});
export type TextareaValues = z.infer<typeof TextareaSchema>;
export const TEXTAREA_DEFAULTS: TextareaValues = {
  label: "",
  placeholder: "",
  rows: 3,
  value: "",
  required: false,
  maxLength: 0,
};

const MarkSchema = z.object({
  value: z.number().default(0),
  label: z.string().default(""),
});

export const SliderSchema = z
  .object({
    label: z.string().default(""),
    min: z.number().default(0),
    max: z.number().default(100),
    step: z.number().default(1),
    value: z.number().default(0),
    showValue: z.boolean().default(true),
    marks: z.array(MarkSchema).default([]),
  })
  .refine((d) => d.min <= d.max, {
    message: "min must be ≤ max",
    path: ["min"],
  });
export type SliderValues = z.infer<typeof SliderSchema>;
export const SLIDER_DEFAULTS: SliderValues = {
  label: "",
  min: 0,
  max: 100,
  step: 1,
  value: 0,
  showValue: true,
  marks: [],
};

export const StepperSchema = z
  .object({
    label: z.string().default(""),
    min: z.number().default(0),
    max: z.number().default(100),
    step: z.number().default(1),
    value: z.number().default(0),
  })
  .refine((d) => d.min <= d.max, {
    message: "min must be ≤ max",
    path: ["min"],
  });
export type StepperValues = z.infer<typeof StepperSchema>;
export const STEPPER_DEFAULTS: StepperValues = {
  label: "",
  min: 0,
  max: 100,
  step: 1,
  value: 0,
};

export const RatingSchema = z.object({
  label: z.string().default(""),
  max: z.number().int().min(1).max(10).default(5),
  value: z.number().min(0).default(0),
  allowHalf: z.boolean().default(false),
  readOnly: z.boolean().default(false),
});
export type RatingValues = z.infer<typeof RatingSchema>;
export const RATING_DEFAULTS: RatingValues = {
  label: "",
  max: 5,
  value: 0,
  allowHalf: false,
  readOnly: false,
};

export const FileUploadSchema = z.object({
  label: z.string().default(""),
  accept: z.string().default(""),
  multiple: z.boolean().default(false),
  maxSizeMb: z.number().min(0).default(5),
  helpText: z.string().default(""),
});
export type FileUploadValues = z.infer<typeof FileUploadSchema>;
export const FILE_UPLOAD_DEFAULTS: FileUploadValues = {
  label: "",
  accept: "",
  multiple: false,
  maxSizeMb: 5,
  helpText: "",
};

export const SearchInputSchema = z.object({
  placeholder: z.string().default(""),
  value: z.string().default(""),
  withButton: z.boolean().default(false),
  // Comma-separated suggestions stored as CSV for form simplicity;
  // detail renderer splits on comma.
  suggestions: z.string().default(""),
});
export type SearchInputValues = z.infer<typeof SearchInputSchema>;
export const SEARCH_INPUT_DEFAULTS: SearchInputValues = {
  placeholder: "",
  value: "",
  withButton: false,
  suggestions: "",
};

export const SegmentedControlSchema = z.object({
  options: z.array(OptionPairSchema).default([]),
  value: z.string().default(""),
  size: z.enum(["sm", "md", "lg"]).default("md"),
});
export type SegmentedControlValues = z.infer<typeof SegmentedControlSchema>;
export const SEGMENTED_CONTROL_DEFAULTS: SegmentedControlValues = {
  options: [],
  value: "",
  size: "md",
};

// value/min/max are ISO date strings "YYYY-MM-DD" or empty string.
export const DatepickerSchema = z.object({
  label: z.string().default(""),
  value: z.string().default(""),
  min: z.string().default(""),
  max: z.string().default(""),
  placeholder: z.string().default(""),
  range: z.boolean().default(false),
});
export type DatepickerValues = z.infer<typeof DatepickerSchema>;
export const DATEPICKER_DEFAULTS: DatepickerValues = {
  label: "",
  value: "",
  min: "",
  max: "",
  placeholder: "",
  range: false,
};

export const TextSchema = z.object({
  markdown: z.string(),
});

export const HeaderSchema = z.object({
  level: z.number().int().min(1).max(3),
  text: z.string(),
});

export const ListSchema = z.object({
  ordered: z.boolean(),
  items: z.array(z.string()),
});

export const HeroSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  cta: z.string(),
});

export const CardSchema = z.object({
  title: z.string(),
  desc: z.string(),
});
export const CardGridSchema = z.object({
  columns: z.number().int().min(1).max(4),
  cards: z.array(CardSchema),
});

export const FormFieldSchema = z.object({
  label: z.string(),
  type: z.string(),
  required: z.boolean(),
});
export const FormSchema = z.object({
  fields: z.array(FormFieldSchema),
});

export const NavItemSchema = z.object({
  label: z.string(),
  href: z.string(),
});
export const NavSchema = z.object({
  items: z.array(NavItemSchema),
});

export const LayoutSchema = z.object({
  mode: z.enum(["vstack", "hstack", "grid"]).default("vstack"),
  cols: z.number().int().min(1).max(6).optional(),
  gap: z.enum(["sm", "md", "lg"]).default("md"),
});

export type LayoutValues = z.infer<typeof LayoutSchema>;

export const LAYOUT_DEFAULTS: LayoutValues = { mode: "vstack", gap: "md" };

export const AgentStepSchema = z.object({
  role: z.enum(["input", "tool", "llm", "output"]),
  specJson: z.string(),
});

export type TextValues = z.infer<typeof TextSchema>;
export type HeaderValues = z.infer<typeof HeaderSchema>;
export type ListValues = z.infer<typeof ListSchema>;
export type HeroValues = z.infer<typeof HeroSchema>;
export type CardGridValues = z.infer<typeof CardGridSchema>;
export type FormValues = z.infer<typeof FormSchema>;
export type NavValues = z.infer<typeof NavSchema>;
export type AgentStepValues = z.infer<typeof AgentStepSchema>;

// ────────────────────────────── Data group (PR-3) ──────────────────────────────

const SeriesItemSchema = z.object({
  name: z.string().default(""),
  // Comma-separated numbers, e.g. "10, 20, 30". Parsed by parseNumberCsv at render time.
  data: z.string().default(""),
});

export const ChartSchema = z.object({
  kind: z.enum(["line", "bar", "area", "donut"]).default("line"),
  title: z.string().default(""),
  series: z.array(SeriesItemSchema).default([]),
  // Comma-separated x-axis labels, e.g. "Jan, Feb, Mar"
  xLabels: z.string().default(""),
  showLegend: z.boolean().default(true),
  showGrid: z.boolean().default(true),
});
export type ChartValues = z.infer<typeof ChartSchema>;
export const CHART_DEFAULTS: ChartValues = {
  kind: "line",
  title: "",
  series: [],
  xLabels: "",
  showLegend: true,
  showGrid: true,
};

export const KpiCardSchema = z.object({
  label: z.string().default(""),
  value: z.string().default(""),
  change: z.string().default(""),
  changeKind: z.enum(["up", "down", "flat"]).default("flat"),
  icon: z.string().default(""),
  // Comma-separated numbers for sparkline mini-chart
  sparkline: z.string().default(""),
});
export type KpiCardValues = z.infer<typeof KpiCardSchema>;
export const KPI_CARD_DEFAULTS: KpiCardValues = {
  label: "",
  value: "",
  change: "",
  changeKind: "flat",
  icon: "",
  sparkline: "",
};

export const ProgressBarSchema = z.object({
  label: z.string().default(""),
  value: z.number().default(60),
  max: z.number().default(100),
  showPercent: z.boolean().default(true),
  variant: z
    .enum(["default", "success", "warning", "danger"])
    .default("default"),
  striped: z.boolean().default(false),
});
export type ProgressBarValues = z.infer<typeof ProgressBarSchema>;
export const PROGRESS_BAR_DEFAULTS: ProgressBarValues = {
  label: "",
  value: 60,
  max: 100,
  showPercent: true,
  variant: "default",
  striped: false,
};

const TimelineItemSchema = z.object({
  title: z.string().default(""),
  time: z.string().default(""),
  body: z.string().default(""),
  icon: z.string().default(""),
  status: z
    .enum(["default", "success", "warning", "danger"])
    .default("default"),
});

export const TimelineSchema = z.object({
  items: z.array(TimelineItemSchema).default([]),
  orientation: z.enum(["vertical", "horizontal"]).default("vertical"),
});
export type TimelineValues = z.infer<typeof TimelineSchema>;
export const TIMELINE_DEFAULTS: TimelineValues = {
  items: [],
  orientation: "vertical",
};

const CalendarEventSchema = z.object({
  title: z.string().default(""),
  date: z.string().default(""),
  color: z.string().default(""),
});

export const CalendarSchema = z.object({
  view: z.enum(["month", "week", "day"]).default("month"),
  // ISO YYYY-MM-DD. Falls back to today if invalid.
  date: z.string().default(""),
  events: z.array(CalendarEventSchema).default([]),
  showWeekends: z.boolean().default(true),
});
export type CalendarValues = z.infer<typeof CalendarSchema>;
export const CALENDAR_DEFAULTS: CalendarValues = {
  view: "month",
  date: "",
  events: [],
  showWeekends: true,
};

// ────────────────────────────── Media group (PR-4) ──────────────────────────────

const AspectRatioSchema = z
  .enum(["16:9", "4:3", "1:1", "auto"])
  .default("16:9");

// canvas — app context variant.
// docs variant uses snapshot/previewDataUrl; app variant is a mockup canvas.
export const CanvasAppSchema = z.object({
  title: z.string().default(""),
  aspect: AspectRatioSchema,
  placeholder: z.string().default(""),
  showToolbar: z.boolean().default(true),
});
export type CanvasAppValues = z.infer<typeof CanvasAppSchema>;
export const CANVAS_APP_DEFAULTS: CanvasAppValues = {
  title: "",
  aspect: "16:9",
  placeholder: "",
  showToolbar: true,
};

export const VideoSchema = z.object({
  src: z.string().default(""),
  poster: z.string().default(""),
  caption: z.string().default(""),
  controls: z.boolean().default(true),
  autoplay: z.boolean().default(false),
  loop: z.boolean().default(false),
  aspect: AspectRatioSchema,
});
export type VideoValues = z.infer<typeof VideoSchema>;
export const VIDEO_DEFAULTS: VideoValues = {
  src: "",
  poster: "",
  caption: "",
  controls: true,
  autoplay: false,
  loop: false,
  aspect: "16:9",
};

export const AudioSchema = z.object({
  src: z.string().default(""),
  title: z.string().default(""),
  controls: z.boolean().default(true),
  loop: z.boolean().default(false),
});
export type AudioValues = z.infer<typeof AudioSchema>;
export const AUDIO_DEFAULTS: AudioValues = {
  src: "",
  title: "",
  controls: true,
  loop: false,
};

// code-block — app context variant.
// docs variant uses language/code/filename; app variant adds showLineNumbers/theme.
export const CodeBlockAppSchema = z.object({
  language: z.string().default("ts"),
  code: z.string().default(""),
  showLineNumbers: z.boolean().default(true),
  theme: z.enum(["light", "dark"]).default("dark"),
});
export type CodeBlockAppValues = z.infer<typeof CodeBlockAppSchema>;
export const CODE_BLOCK_APP_DEFAULTS: CodeBlockAppValues = {
  language: "ts",
  code: "",
  showLineNumbers: true,
  theme: "dark",
};

export const TEXT_DEFAULTS: TextValues = { markdown: "" };
export const HEADER_DEFAULTS: HeaderValues = { level: 1, text: "" };
export const LIST_DEFAULTS: ListValues = { ordered: false, items: [] };
export const HERO_DEFAULTS: HeroValues = { title: "", subtitle: "", cta: "" };
export const CARD_GRID_DEFAULTS: CardGridValues = { columns: 3, cards: [] };
export const FORM_DEFAULTS: FormValues = { fields: [] };
export const NAV_DEFAULTS: NavValues = { items: [] };
export const AGENT_STEP_DEFAULTS: AgentStepValues = {
  role: "input",
  specJson: "{}",
};

// ────────────────────────────── Communication group (PR-5) ──────────────────────────────

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]).default("user"),
  content: z.string().default(""),
  timestamp: z.string().default(""),
});

const SuggestionItemSchema = z.object({
  label: z.string().default(""),
});

export const AiChatSchema = z.object({
  title: z.string().default(""),
  placeholder: z.string().default("Type a message…"),
  modelLabel: z.string().default(""),
  messages: z.array(ChatMessageSchema).default([]),
  suggestions: z.array(SuggestionItemSchema).default([]),
});
export type AiChatValues = z.infer<typeof AiChatSchema>;
export const AI_CHAT_DEFAULTS: AiChatValues = {
  title: "",
  placeholder: "Type a message…",
  modelLabel: "",
  messages: [],
  suggestions: [],
};

export const MessageBubbleSchema = z.object({
  sender: z.string().default(""),
  avatar: z.string().default(""),
  content: z.string().default(""),
  timestamp: z.string().default(""),
  side: z.enum(["left", "right"]).default("left"),
  status: z.enum(["sent", "delivered", "read"]).default("sent"),
  variant: z.enum(["default", "info", "system"]).default("default"),
});
export type MessageBubbleValues = z.infer<typeof MessageBubbleSchema>;
export const MESSAGE_BUBBLE_DEFAULTS: MessageBubbleValues = {
  sender: "",
  avatar: "",
  content: "",
  timestamp: "",
  side: "left",
  status: "sent",
  variant: "default",
};

// ────────────────────────────── Navigation / Feedback group (PR-6) ──────────────────────────────

const BreadcrumbItemSchema = z.object({
  label: z.string().default(""),
  href: z.string().default(""),
});

export const BreadcrumbSchema = z.object({
  items: z.array(BreadcrumbItemSchema).default([]),
  separator: z.enum(["/", ">", "·"]).default("/"),
});
export type BreadcrumbValues = z.infer<typeof BreadcrumbSchema>;
export const BREADCRUMB_DEFAULTS: BreadcrumbValues = {
  items: [],
  separator: "/",
};

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  total: z.number().int().min(0).default(0),
  perPage: z.number().int().min(1).default(10),
  mode: z.enum(["numbered", "prev-next", "load-more"]).default("numbered"),
});
export type PaginationValues = z.infer<typeof PaginationSchema>;
export const PAGINATION_DEFAULTS: PaginationValues = {
  page: 1,
  total: 0,
  perPage: 10,
  mode: "numbered",
};

const DropdownItemSchema = z.object({
  label: z.string().default(""),
  icon: z.string().default(""),
  action: z.string().default(""),
  divider: z.boolean().default(false),
});

export const DropdownMenuSchema = z.object({
  trigger: z.string().default("Options"),
  items: z.array(DropdownItemSchema).default([]),
});
export type DropdownMenuValues = z.infer<typeof DropdownMenuSchema>;
export const DROPDOWN_MENU_DEFAULTS: DropdownMenuValues = {
  trigger: "Options",
  items: [],
};

export const ToastSchema = z.object({
  variant: z.enum(["info", "success", "warning", "error"]).default("info"),
  title: z.string().default(""),
  body: z.string().default(""),
  duration: z.number().int().min(0).default(4000),
  dismissible: z.boolean().default(true),
});
export type ToastValues = z.infer<typeof ToastSchema>;
export const TOAST_DEFAULTS: ToastValues = {
  variant: "info",
  title: "",
  body: "",
  duration: 4000,
  dismissible: true,
};

export const TooltipSchema = z.object({
  trigger: z.string().default("Hover me"),
  content: z.string().default(""),
  side: z.enum(["top", "right", "bottom", "left"]).default("top"),
});
export type TooltipValues = z.infer<typeof TooltipSchema>;
export const TOOLTIP_DEFAULTS: TooltipValues = {
  trigger: "Hover me",
  content: "",
  side: "top",
};

export const PopoverSchema = z.object({
  trigger: z.string().default("Open"),
  title: z.string().default(""),
  body: z.string().default(""),
  side: z.enum(["top", "right", "bottom", "left"]).default("bottom"),
  withArrow: z.boolean().default(true),
});
export type PopoverValues = z.infer<typeof PopoverSchema>;
export const POPOVER_DEFAULTS: PopoverValues = {
  trigger: "Open",
  title: "",
  body: "",
  side: "bottom",
  withArrow: true,
};
