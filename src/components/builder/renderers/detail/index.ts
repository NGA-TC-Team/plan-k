import { BLOCK_KIND_REGISTRY } from "@/builder/defaults";
import type { BlockContext, BlockKind } from "@/builder/types/entity";
import { StubBlock } from "../stub-block";
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

// Real renderers shipping in commit 3 — every other kind in the registry
// falls back to StubBlock until a dedicated component lands.
const realDocs: ContextRegistry = {
  text: TextDetail,
  header: HeaderDetail,
  list: ListDetail,
};

const realApp: ContextRegistry = {
  text: TextDetail,
  header: HeaderDetail,
  list: ListDetail,
  hero: HeroDetail,
  "card-grid": CardGridDetail,
  form: FormDetail,
  nav: NavDetail,
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
