import { BLOCK_KIND_REGISTRY } from "@/builder/defaults";
import type { BlockContext, BlockKind } from "@/builder/types/entity";
import { StubBlock } from "../stub-block";
import type { BlockRenderer } from "../types";
import { AgentStepDetail } from "./agent-step";
import { CanvasDetail } from "./canvas";
import { CardGridDetail } from "./card-grid";
import {
  ApiEndpointDetail,
  AvatarDetail,
  BadgeDetail,
  BannerDetail,
  BlockquoteDetail,
  BottomNavDetail,
  ButtonDetail,
  CalloutDetail,
  ChecklistDetail,
  CodeBlockDetail,
  ColorSwatchDetail,
  CtaSectionDetail,
  DecisionDetail,
  DefinitionDetail,
  DividerDetail,
  EmptyStateDetail,
  FabDetail,
  FigureDetail,
  FooterDetail,
  ImageDetail,
  InputDetail,
  JourneyStepDetail,
  LinkCardDetail,
  ListRowDetail,
  MathBlockDetail,
  MetricDetail,
  MilestoneDetail,
  ModalDetail,
  PageHeaderDetail,
  PersonaDetail,
  ReleaseNoteDetail,
  RiskDetail,
  RuleDetail,
  SheetDetail,
  SidebarDetail,
  StatDetail,
  StatusBarDetail,
  TableDetail,
  TabsDetail,
  UserStoryDetail,
} from "./extra";
import { FormDetail } from "./form";
import { HeaderDetail } from "./header";
import { HeroDetail } from "./hero";
import { LayoutDetail } from "./layout";
import { ListDetail } from "./list";
import { NavDetail } from "./nav";
import { TextDetail } from "./text";

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
  input: InputDetail,
  banner: BannerDetail,
  "empty-state": EmptyStateDetail,
  table: TableDetail,
  // mobile
  "status-bar": StatusBarDetail,
  "bottom-nav": BottomNavDetail,
  "list-row": ListRowDetail,
  fab: FabDetail,
  sheet: SheetDetail,
  layout: LayoutDetail,
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
