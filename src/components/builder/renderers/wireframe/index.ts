import { BLOCK_KIND_REGISTRY } from "@/builder/defaults";
import type { BlockContext, BlockKind } from "@/builder/types/entity";
import { StubBlock } from "../stub-block";
import type { BlockRenderer } from "../types";
import { AgentStepWireframe } from "./agent-step";
import { CardGridWireframe } from "./card-grid";
import {
  AvatarWireframe,
  BadgeWireframe,
  BannerWireframe,
  BottomNavWireframe,
  ButtonWireframe,
  CtaSectionWireframe,
  DividerWireframe,
  EmptyStateWireframe,
  FabWireframe,
  FooterWireframe,
  ImageWireframe,
  InputWireframe,
  ListRowWireframe,
  ModalWireframe,
  PageHeaderWireframe,
  SheetWireframe,
  SidebarWireframe,
  StatusBarWireframe,
  StatWireframe,
  TableWireframe,
  TabsWireframe,
} from "./extra";
import { FormWireframe } from "./form";
import { HeaderWireframe } from "./header";
import { HeroWireframe } from "./hero";
import { ListWireframe } from "./list";
import { NavWireframe } from "./nav";
import { TextWireframe } from "./text";

type ContextRegistry = Partial<Record<BlockKind, BlockRenderer>>;

const realDocs: ContextRegistry = {
  paragraph: TextWireframe,
  heading: HeaderWireframe,
  "bullet-list": ListWireframe,
  "numbered-list": ListWireframe,
  table: TableWireframe,
  stat: StatWireframe,
};

const realApp: ContextRegistry = {
  text: TextWireframe,
  list: ListWireframe,
  hero: HeroWireframe,
  "card-grid": CardGridWireframe,
  form: FormWireframe,
  nav: NavWireframe,
  "page-header": PageHeaderWireframe,
  sidebar: SidebarWireframe,
  footer: FooterWireframe,
  tabs: TabsWireframe,
  modal: ModalWireframe,
  divider: DividerWireframe,
  "cta-section": CtaSectionWireframe,
  image: ImageWireframe,
  stat: StatWireframe,
  avatar: AvatarWireframe,
  badge: BadgeWireframe,
  button: ButtonWireframe,
  input: InputWireframe,
  banner: BannerWireframe,
  "empty-state": EmptyStateWireframe,
  table: TableWireframe,
  // mobile
  "status-bar": StatusBarWireframe,
  "bottom-nav": BottomNavWireframe,
  "list-row": ListRowWireframe,
  fab: FabWireframe,
  sheet: SheetWireframe,
};

const realAgent: ContextRegistry = {
  "agent-step": AgentStepWireframe,
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

export const wireframeRenderers: Record<BlockContext, ContextRegistry> = {
  docs: fillStubs(realDocs, "docs"),
  app: fillStubs(realApp, "app"),
  agent: fillStubs(realAgent, "agent"),
};
