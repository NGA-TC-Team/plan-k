import { BLOCK_KIND_REGISTRY } from "@/builder/defaults";
import type { BlockContext, BlockKind } from "@/builder/types/entity";
import { StubBlock } from "../stub-block";
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

const realDocs: ContextRegistry = {
  paragraph: TextWireframe,
  heading: HeaderWireframe,
  "bullet-list": ListWireframe,
  "numbered-list": ListWireframe,
};

const realApp: ContextRegistry = {
  text: TextWireframe,
  list: ListWireframe,
  hero: HeroWireframe,
  "card-grid": CardGridWireframe,
  form: FormWireframe,
  nav: NavWireframe,
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
