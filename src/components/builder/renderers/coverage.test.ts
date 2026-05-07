import { describe, expect, it } from "bun:test";
import { BLOCK_KIND_REGISTRY } from "@/builder/defaults";
import type { BlockKind } from "@/builder/types/entity";
import { detailRenderers } from "./detail";
import { editorRenderers } from "./editors";
import { JsonFallbackEditor } from "./editors/json-fallback-editor";
import { StubBlock } from "./stub-block";
import { wireframeRenderers } from "./wireframe";

describe("renderer coverage", () => {
  it("every kind has a non-stub detail renderer", () => {
    const offenders: { context: string; kind: BlockKind }[] = [];
    for (const spec of BLOCK_KIND_REGISTRY) {
      const renderer = detailRenderers[spec.context]?.[spec.kind];
      if (!renderer || renderer === StubBlock) {
        offenders.push({ context: spec.context, kind: spec.kind });
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every kind has a dedicated editor (not JsonFallbackEditor)", () => {
    // PR-D defers agent-step's role-typed sub-schemas — its current editor
    // (AgentStepEditor) is dedicated even though the form schema diverges
    // from the data shape. Track only kinds that fall through to JSON.
    const offenders: { context: string; kind: BlockKind }[] = [];
    for (const spec of BLOCK_KIND_REGISTRY) {
      const renderer = editorRenderers[spec.context]?.[spec.kind];
      if (!renderer || renderer === JsonFallbackEditor) {
        offenders.push({ context: spec.context, kind: spec.kind });
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every app + agent kind has a non-stub wireframe renderer", () => {
    const offenders: { context: string; kind: BlockKind }[] = [];
    for (const spec of BLOCK_KIND_REGISTRY) {
      // docs context has no wireframe variant by design.
      if (spec.context === "docs") continue;
      const renderer = wireframeRenderers[spec.context]?.[spec.kind];
      if (!renderer || renderer === StubBlock) {
        offenders.push({ context: spec.context, kind: spec.kind });
      }
    }
    expect(offenders).toEqual([]);
  });
});
