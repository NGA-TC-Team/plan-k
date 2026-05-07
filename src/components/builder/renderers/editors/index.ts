import type { BlockContext, BlockKind } from "@/builder/types/entity";
import type { BlockRenderer } from "../types";
import { AgentStepEditor } from "./agent-step-editor";
import { CardGridEditor } from "./card-grid-editor";
import { FormEditor } from "./form-editor";
import { HeaderEditor } from "./header-editor";
import { HeroEditor } from "./hero-editor";
import { JsonFallbackEditor } from "./json-fallback-editor";
import { ListEditor } from "./list-editor";
import { NavEditor } from "./nav-editor";
import { TextEditor } from "./text-editor";

type ContextRegistry = Partial<Record<BlockKind, BlockRenderer>>;

const docs: ContextRegistry = {
  text: TextEditor,
  header: HeaderEditor,
  list: ListEditor,
};

const app: ContextRegistry = {
  text: TextEditor,
  header: HeaderEditor,
  list: ListEditor,
  hero: HeroEditor,
  "card-grid": CardGridEditor,
  form: FormEditor,
  nav: NavEditor,
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
