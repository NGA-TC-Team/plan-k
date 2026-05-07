import type { BlockContext, BlockKind } from "@/builder/types/entity";
import type { BlockRenderer } from "../types";
import { AgentStepWireframe } from "./agent-step";
import { CardGridWireframe } from "./card-grid";
import { FormWireframe } from "./form";
import { HeaderWireframe } from "./header";
import { HeroWireframe } from "./hero";
import { ListWireframe } from "./list";
import { NavWireframe } from "./nav";
import { TextWireframe } from "./text";

type ContextRegistry = Partial<Record<BlockKind, BlockRenderer>>;

const docs: ContextRegistry = {
  text: TextWireframe,
  header: HeaderWireframe,
  list: ListWireframe,
};

const app: ContextRegistry = {
  text: TextWireframe,
  header: HeaderWireframe,
  list: ListWireframe,
  hero: HeroWireframe,
  "card-grid": CardGridWireframe,
  form: FormWireframe,
  nav: NavWireframe,
};

const agent: ContextRegistry = {
  "agent-step": AgentStepWireframe,
};

export const wireframeRenderers: Record<BlockContext, ContextRegistry> = {
  docs,
  app,
  agent,
};
