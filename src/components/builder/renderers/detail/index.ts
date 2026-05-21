import { BLOCK_KIND_REGISTRY } from "@/builder/defaults";
import type { BlockContext, BlockKind } from "@/builder/types/entity";
import { StubBlock } from "../stub-block";
import type { BlockRenderer } from "../types";
import { AgentStepDetail } from "./agent-step";
import { AiChatDetail } from "./ai-chat";
import { AudioDetail } from "./audio";
import { CalendarDetail } from "./calendar";
import { CanvasDetail } from "./canvas";
import { CanvasAppDetail } from "./canvas-app";
import { CardGridDetail } from "./card-grid";
import { ChartDetail } from "./chart";
import { CodeBlockAppDetail } from "./code-block-app";
import { DropdownMenuDetail } from "./dropdown-menu";
import {
  ApiEndpointDetail,
  AvatarDetail,
  BadgeDetail,
  BannerDetail,
  BlockquoteDetail,
  BottomNavDetail,
  BreadcrumbDetail,
  ButtonDetail,
  CalloutDetail,
  CheckboxDetail,
  ChecklistDetail,
  CodeBlockDetail,
  ColorSwatchDetail,
  CtaSectionDetail,
  DatepickerDetail,
  DecisionDetail,
  DefinitionDetail,
  DividerDetail,
  EmptyStateDetail,
  FabDetail,
  FigureDetail,
  FileUploadDetail,
  FooterDetail,
  ImageDetail,
  InputDetail,
  JourneyStepDetail,
  KpiCardDetail,
  LinkCardDetail,
  ListRowDetail,
  MathBlockDetail,
  MetricDetail,
  MilestoneDetail,
  ModalDetail,
  PageHeaderDetail,
  PaginationDetail,
  PersonaDetail,
  ProgressBarDetail,
  RadioGroupDetail,
  RatingDetail,
  ReleaseNoteDetail,
  RiskDetail,
  RuleDetail,
  SearchInputDetail,
  SegmentedControlDetail,
  SelectDetail,
  SheetDetail,
  SidebarDetail,
  SliderDetail,
  StatDetail,
  StatusBarDetail,
  StepperDetail,
  SwitchDetail,
  TableDetail,
  TabsDetail,
  TextareaDetail,
  ToastDetail,
  TooltipDetail,
  UserStoryDetail,
} from "./extra";
import { FormDetail } from "./form";
import { HeaderDetail } from "./header";
import { HeroDetail } from "./hero";
import { LayoutDetail } from "./layout";
import { ListDetail } from "./list";
import { MessageBubbleDetail } from "./message-bubble";
import { NavDetail } from "./nav";
import { PopoverDetail } from "./popover";
import { TextDetail } from "./text";
import { TimelineDetail } from "./timeline";
import { VideoDetail } from "./video";

type ContextRegistry = Partial<Record<BlockKind, BlockRenderer>>;

const realDocs: ContextRegistry = {
  paragraph: TextDetail,
  heading: HeaderDetail,
  "bullet-list": ListDetail,
  "numbered-list": ListDetail,
  blockquote: BlockquoteDetail,
  callout: CalloutDetail,
  canvas: CanvasDetail,
  "code-block": CodeBlockDetail,
  checklist: ChecklistDetail,
  table: TableDetail,
  rule: RuleDetail,
  figure: FigureDetail,
  "link-card": LinkCardDetail,
  "math-block": MathBlockDetail,
  definition: DefinitionDetail,
  decision: DecisionDetail,
  persona: PersonaDetail,
  "user-story": UserStoryDetail,
  risk: RiskDetail,
  metric: MetricDetail,
  milestone: MilestoneDetail,
  "release-note": ReleaseNoteDetail,
  "color-swatch": ColorSwatchDetail,
  "journey-step": JourneyStepDetail,
  "api-endpoint": ApiEndpointDetail,
  stat: StatDetail,
  layout: LayoutDetail,
};

const realApp: ContextRegistry = {
  text: TextDetail,
  list: ListDetail,
  hero: HeroDetail,
  "card-grid": CardGridDetail,
  form: FormDetail,
  nav: NavDetail,
  "page-header": PageHeaderDetail,
  sidebar: SidebarDetail,
  footer: FooterDetail,
  tabs: TabsDetail,
  modal: ModalDetail,
  divider: DividerDetail,
  "cta-section": CtaSectionDetail,
  image: ImageDetail,
  stat: StatDetail,
  avatar: AvatarDetail,
  badge: BadgeDetail,
  button: ButtonDetail,
  checkbox: CheckboxDetail,
  datepicker: DatepickerDetail,
  "file-upload": FileUploadDetail,
  input: InputDetail,
  "radio-group": RadioGroupDetail,
  rating: RatingDetail,
  "search-input": SearchInputDetail,
  "segmented-control": SegmentedControlDetail,
  select: SelectDetail,
  slider: SliderDetail,
  stepper: StepperDetail,
  switch: SwitchDetail,
  textarea: TextareaDetail,
  banner: BannerDetail,
  "empty-state": EmptyStateDetail,
  table: TableDetail,
  // mobile
  "status-bar": StatusBarDetail,
  "bottom-nav": BottomNavDetail,
  "list-row": ListRowDetail,
  fab: FabDetail,
  sheet: SheetDetail,
  // Data group (PR-3)
  chart: ChartDetail,
  "kpi-card": KpiCardDetail,
  "progress-bar": ProgressBarDetail,
  timeline: TimelineDetail,
  calendar: CalendarDetail,
  layout: LayoutDetail,
  // Media group (PR-4) — app context
  // canvas/code-block app variants override the key with app-specific details.
  canvas: CanvasAppDetail,
  "code-block": CodeBlockAppDetail,
  video: VideoDetail,
  audio: AudioDetail,
  // Communication group (PR-5)
  "ai-chat": AiChatDetail,
  "message-bubble": MessageBubbleDetail,
  // Navigation group (PR-6)
  breadcrumb: BreadcrumbDetail,
  pagination: PaginationDetail,
  "dropdown-menu": DropdownMenuDetail,
  // Feedback group (PR-6)
  toast: ToastDetail,
  tooltip: TooltipDetail,
  popover: PopoverDetail,
};

const realAgent: ContextRegistry = {
  "agent-step": AgentStepDetail,
};

function fillStubs(
  real: ContextRegistry,
  context: BlockContext,
): ContextRegistry {
  const out: ContextRegistry = { ...real };
  for (const spec of BLOCK_KIND_REGISTRY) {
    if (spec.context !== context) continue;
    if (out[spec.kind]) continue;
    out[spec.kind] = StubBlock;
  }
  return out;
}

export const detailRenderers: Record<BlockContext, ContextRegistry> = {
  docs: fillStubs(realDocs, "docs"),
  app: fillStubs(realApp, "app"),
  agent: fillStubs(realAgent, "agent"),
};
