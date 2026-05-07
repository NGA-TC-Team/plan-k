import type { BlockContext, BlockKind } from "@/builder/types/entity";
import type { BlockRenderer } from "../types";
import { AgentStepDetail } from "./agent-step";
import { CardGridDetail } from "./card-grid";
import { FormDetail } from "./form";
import { HeaderDetail } from "./header";
import { HeroDetail } from "./hero";
import { ListDetail } from "./list";
import { NavDetail } from "./nav";
import { TextDetail } from "./text";

type ContextRegistry = Partial<Record<BlockKind, BlockRenderer>>;

const docs: ContextRegistry = {
  text: TextDetail,
  header: HeaderDetail,
  list: ListDetail,
};

const app: ContextRegistry = {
  text: TextDetail,
  header: HeaderDetail,
  list: ListDetail,
  hero: HeroDetail,
  "card-grid": CardGridDetail,
  form: FormDetail,
  nav: NavDetail,
};

const agent: ContextRegistry = {
  "agent-step": AgentStepDetail,
};

export const detailRenderers: Record<BlockContext, ContextRegistry> = {
  docs,
  app,
  agent,
};
