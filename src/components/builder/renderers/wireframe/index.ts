import type { BlockKind } from "@/builder/types/entity";
import type { BlockRenderer } from "../types";
import { AgentStepWireframe } from "./agent-step";
import { CardGridWireframe } from "./card-grid";
import { FormWireframe } from "./form";
import { HeaderWireframe } from "./header";
import { HeroWireframe } from "./hero";
import { ListWireframe } from "./list";
import { NavWireframe } from "./nav";
import { TextWireframe } from "./text";

export const wireframeRenderers: Partial<Record<BlockKind, BlockRenderer>> = {
  text: TextWireframe,
  list: ListWireframe,
  header: HeaderWireframe,
  hero: HeroWireframe,
  "card-grid": CardGridWireframe,
  form: FormWireframe,
  nav: NavWireframe,
  "agent-step": AgentStepWireframe,
};
