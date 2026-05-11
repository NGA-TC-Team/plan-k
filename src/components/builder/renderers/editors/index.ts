import type { BlockContext, BlockKind } from "@/builder/types/entity";
import type { BlockRenderer } from "../types";
import { AgentStepEditor } from "./agent-step-editor";
import { ApiEndpointEditor } from "./api-endpoint-editor";
import { AvatarEditor } from "./avatar-editor";
import { BadgeEditor } from "./badge-editor";
import { BannerEditor } from "./banner-editor";
import { BlockquoteEditor } from "./blockquote-editor";
import { BottomNavEditor } from "./bottom-nav-editor";
import { ButtonEditor } from "./button-editor";
import { CalloutEditor } from "./callout-editor";
import { CardGridEditor } from "./card-grid-editor";
import { ChecklistEditor } from "./checklist-editor";
import { CodeBlockEditor } from "./code-block-editor";
import { ColorSwatchEditor } from "./color-swatch-editor";
import { CtaSectionEditor } from "./cta-section-editor";
import { DecisionEditor } from "./decision-editor";
import { DefinitionEditor } from "./definition-editor";
import { DividerEditor } from "./divider-editor";
import { EmptyStateEditor } from "./empty-state-editor";
import { FabEditor } from "./fab-editor";
import { FigureEditor } from "./figure-editor";
import { FooterEditor } from "./footer-editor";
import { FormEditor } from "./form-editor";
import { HeaderEditor } from "./header-editor";
import { HeroEditor } from "./hero-editor";
import { ImageEditor } from "./image-editor";
import { InputEditor } from "./input-editor";
import { JourneyStepEditor } from "./journey-step-editor";
import { JsonFallbackEditor } from "./json-fallback-editor";
import { LinkCardEditor } from "./link-card-editor";
import { ListEditor } from "./list-editor";
import { ListRowEditor } from "./list-row-editor";
import { MathBlockEditor } from "./math-block-editor";
import { MetricEditor } from "./metric-editor";
import { MilestoneEditor } from "./milestone-editor";
import { ModalEditor } from "./modal-editor";
import { NavEditor } from "./nav-editor";
import { PageHeaderEditor } from "./page-header-editor";
import { PersonaEditor } from "./persona-editor";
import { ReleaseNoteEditor } from "./release-note-editor";
import { RiskEditor } from "./risk-editor";
import { RuleEditor } from "./rule-editor";
import { SheetEditor } from "./sheet-editor";
import { SidebarEditor } from "./sidebar-editor";
import { StatEditor } from "./stat-editor";
import { StatusBarEditor } from "./status-bar-editor";
import { TableEditor } from "./table-editor";
import { TabsEditor } from "./tabs-editor";
import { TextEditor } from "./text-editor";
import { UserStoryEditor } from "./user-story-editor";

type ContextRegistry = Partial<Record<BlockKind, BlockRenderer>>;

const docs: ContextRegistry = {
  paragraph: TextEditor,
  heading: HeaderEditor,
  "bullet-list": ListEditor,
  "numbered-list": ListEditor,
  blockquote: BlockquoteEditor,
  callout: CalloutEditor,
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
  input: InputEditor,
  banner: BannerEditor,
  "empty-state": EmptyStateEditor,
  table: TableEditor,
  // mobile
  "status-bar": StatusBarEditor,
  "bottom-nav": BottomNavEditor,
  "list-row": ListRowEditor,
  fab: FabEditor,
  sheet: SheetEditor,
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
