import type { BlockContext, BlockKind } from "@/builder/types/entity";
import type { BlockRenderer } from "../types";
import { AgentStepEditor } from "./agent-step-editor";
import { AiChatEditor } from "./ai-chat-editor";
import { ApiEndpointEditor } from "./api-endpoint-editor";
import { AudioEditor } from "./audio-editor";
import { AvatarEditor } from "./avatar-editor";
import { BadgeEditor } from "./badge-editor";
import { BannerEditor } from "./banner-editor";
import { BlockquoteEditor } from "./blockquote-editor";
import { BottomNavEditor } from "./bottom-nav-editor";
import { BreadcrumbEditor } from "./breadcrumb-editor";
import { ButtonEditor } from "./button-editor";
import { CalendarEditor } from "./calendar-editor";
import { CalloutEditor } from "./callout-editor";
import { CanvasAppEditor } from "./canvas-app-editor";
import { CanvasEditor } from "./canvas-editor";
import { CardGridEditor } from "./card-grid-editor";
import { ChartEditor } from "./chart-editor";
import { CheckboxEditor } from "./checkbox-editor";
import { ChecklistEditor } from "./checklist-editor";
import { CodeBlockAppEditor } from "./code-block-app-editor";
import { CodeBlockEditor } from "./code-block-editor";
import { ColorSwatchEditor } from "./color-swatch-editor";
import { CtaSectionEditor } from "./cta-section-editor";
import { DatepickerEditor } from "./datepicker-editor";
import { DecisionEditor } from "./decision-editor";
import { DefinitionEditor } from "./definition-editor";
import { DividerEditor } from "./divider-editor";
import { DropdownMenuEditor } from "./dropdown-menu-editor";
import { EmptyStateEditor } from "./empty-state-editor";
import { FabEditor } from "./fab-editor";
import { FigureEditor } from "./figure-editor";
import { FileUploadEditor } from "./file-upload-editor";
import { FooterEditor } from "./footer-editor";
import { FormEditor } from "./form-editor";
import { HeaderEditor } from "./header-editor";
import { HeroEditor } from "./hero-editor";
import { ImageEditor } from "./image-editor";
import { InputEditor } from "./input-editor";
import { JourneyStepEditor } from "./journey-step-editor";
import { JsonFallbackEditor } from "./json-fallback-editor";
import { KpiCardEditor } from "./kpi-card-editor";
import { LayoutEditor } from "./layout-editor";
import { LinkCardEditor } from "./link-card-editor";
import { ListEditor } from "./list-editor";
import { ListRowEditor } from "./list-row-editor";
import { MathBlockEditor } from "./math-block-editor";
import { MessageBubbleEditor } from "./message-bubble-editor";
import { MetricEditor } from "./metric-editor";
import { MilestoneEditor } from "./milestone-editor";
import { ModalEditor } from "./modal-editor";
import { NavEditor } from "./nav-editor";
import { PageHeaderEditor } from "./page-header-editor";
import { PaginationEditor } from "./pagination-editor";
import { PersonaEditor } from "./persona-editor";
import { PopoverEditor } from "./popover-editor";
import { ProgressBarEditor } from "./progress-bar-editor";
import { RadioGroupEditor } from "./radio-group-editor";
import { RatingEditor } from "./rating-editor";
import { ReleaseNoteEditor } from "./release-note-editor";
import { RiskEditor } from "./risk-editor";
import { RuleEditor } from "./rule-editor";
import { SearchInputEditor } from "./search-input-editor";
import { SegmentedControlEditor } from "./segmented-control-editor";
import { SelectEditor } from "./select-editor";
import { SheetEditor } from "./sheet-editor";
import { SidebarEditor } from "./sidebar-editor";
import { SliderEditor } from "./slider-editor";
import { StatEditor } from "./stat-editor";
import { StatusBarEditor } from "./status-bar-editor";
import { StepperEditor } from "./stepper-editor";
import { SwitchEditor } from "./switch-editor";
import { TableEditor } from "./table-editor";
import { TabsEditor } from "./tabs-editor";
import { TextEditor } from "./text-editor";
import { TextareaEditor } from "./textarea-editor";
import { TimelineEditor } from "./timeline-editor";
import { ToastEditor } from "./toast-editor";
import { TooltipEditor } from "./tooltip-editor";
import { UserStoryEditor } from "./user-story-editor";
import { VideoEditor } from "./video-editor";

type ContextRegistry = Partial<Record<BlockKind, BlockRenderer>>;

const docs: ContextRegistry = {
  paragraph: TextEditor,
  heading: HeaderEditor,
  "bullet-list": ListEditor,
  "numbered-list": ListEditor,
  blockquote: BlockquoteEditor,
  callout: CalloutEditor,
  canvas: CanvasEditor,
  "code-block": CodeBlockEditor,
  checklist: ChecklistEditor,
  table: TableEditor,
  rule: RuleEditor,
  figure: FigureEditor,
  "link-card": LinkCardEditor,
  "math-block": MathBlockEditor,
  definition: DefinitionEditor,
  decision: DecisionEditor,
  persona: PersonaEditor,
  "user-story": UserStoryEditor,
  risk: RiskEditor,
  metric: MetricEditor,
  milestone: MilestoneEditor,
  "release-note": ReleaseNoteEditor,
  "color-swatch": ColorSwatchEditor,
  "journey-step": JourneyStepEditor,
  "api-endpoint": ApiEndpointEditor,
  stat: StatEditor,
  layout: LayoutEditor,
};

const app: ContextRegistry = {
  text: TextEditor,
  list: ListEditor,
  hero: HeroEditor,
  "card-grid": CardGridEditor,
  form: FormEditor,
  nav: NavEditor,
  "page-header": PageHeaderEditor,
  sidebar: SidebarEditor,
  footer: FooterEditor,
  tabs: TabsEditor,
  modal: ModalEditor,
  divider: DividerEditor,
  "cta-section": CtaSectionEditor,
  image: ImageEditor,
  stat: StatEditor,
  avatar: AvatarEditor,
  badge: BadgeEditor,
  button: ButtonEditor,
  checkbox: CheckboxEditor,
  datepicker: DatepickerEditor,
  "file-upload": FileUploadEditor,
  input: InputEditor,
  "radio-group": RadioGroupEditor,
  rating: RatingEditor,
  "search-input": SearchInputEditor,
  "segmented-control": SegmentedControlEditor,
  select: SelectEditor,
  slider: SliderEditor,
  stepper: StepperEditor,
  switch: SwitchEditor,
  textarea: TextareaEditor,
  banner: BannerEditor,
  "empty-state": EmptyStateEditor,
  table: TableEditor,
  // mobile
  "status-bar": StatusBarEditor,
  "bottom-nav": BottomNavEditor,
  "list-row": ListRowEditor,
  fab: FabEditor,
  sheet: SheetEditor,
  // Data group (PR-3)
  chart: ChartEditor,
  "kpi-card": KpiCardEditor,
  "progress-bar": ProgressBarEditor,
  timeline: TimelineEditor,
  calendar: CalendarEditor,
  layout: LayoutEditor,
  // Media group (PR-4)
  // canvas/code-block app variants override the key with app-specific editors.
  canvas: CanvasAppEditor,
  "code-block": CodeBlockAppEditor,
  video: VideoEditor,
  audio: AudioEditor,
  // Communication group (PR-5)
  "ai-chat": AiChatEditor,
  "message-bubble": MessageBubbleEditor,
  // Navigation group (PR-6)
  breadcrumb: BreadcrumbEditor,
  pagination: PaginationEditor,
  "dropdown-menu": DropdownMenuEditor,
  // Feedback group (PR-6)
  toast: ToastEditor,
  tooltip: TooltipEditor,
  popover: PopoverEditor,
};

const agent: ContextRegistry = {
  "agent-step": AgentStepEditor,
};

export const editorRenderers: Record<BlockContext, ContextRegistry> = {
  docs,
  app,
  agent,
};

export function pickEditor(
  context: BlockContext,
  kind: BlockKind,
): BlockRenderer {
  return editorRenderers[context]?.[kind] ?? JsonFallbackEditor;
}
