import type { BlockKind } from "@/builder/types/entity";
import type { BlockRenderer } from "../types";
import { AgentStepDetail } from "./agent-step";
import { CardGridDetail } from "./card-grid";
import { FormDetail } from "./form";
import { HeaderDetail } from "./header";
import { HeroDetail } from "./hero";
import { ListDetail } from "./list";
import { NavDetail } from "./nav";
import { TextDetail } from "./text";

export const detailRenderers: Partial<Record<BlockKind, BlockRenderer>> = {
  text: TextDetail,
  header: HeaderDetail,
  list: ListDetail,
  hero: HeroDetail,
  "card-grid": CardGridDetail,
  form: FormDetail,
  nav: NavDetail,
  "agent-step": AgentStepDetail,
};
