import type { BlockKind } from "@/builder/types/entity";
import type { BlockRenderer } from "../types";
import { AgentStepEditor } from "./agent-step-editor";
import { CardGridEditor } from "./card-grid-editor";
import { FormEditor } from "./form-editor";
import { HeaderEditor } from "./header-editor";
import { HeroEditor } from "./hero-editor";
import { ListEditor } from "./list-editor";
import { NavEditor } from "./nav-editor";
import { TextEditor } from "./text-editor";

export const editorRenderers: Partial<Record<BlockKind, BlockRenderer>> = {
  text: TextEditor,
  header: HeaderEditor,
  list: ListEditor,
  hero: HeroEditor,
  "card-grid": CardGridEditor,
  form: FormEditor,
  nav: NavEditor,
  "agent-step": AgentStepEditor,
};
