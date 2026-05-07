"use client";

import type { ReactNode } from "react";
import { hydrate } from "@/builder/hydrate";
import type { BlockEntity, SectionEntity } from "@/builder/types/entity";
import type { IntentLogEntry } from "@/builder/types/intent";
import type { AppState } from "@/builder/types/state";
import { BrowserFrame, MobileFrame } from "@/components/builder/frames";
import { detailRenderers } from "@/components/builder/renderers/detail";
import type { BlockHandlers } from "@/components/builder/renderers/types";

const NOOP_HANDLERS: BlockHandlers = {
  onSelect: () => {},
  onBeginEdit: () => {},
  onCancelEdit: () => {},
  onCommitEdit: () => {},
  onDelete: () => {},
};

type PrintViewProps = {
  snapshot: AppState;
  tailEntries: IntentLogEntry[];
  /** When set, only this section's subtree is rendered (no docs index, no screens). */
  sectionId?: string;
};

export function PrintView({
  snapshot,
  tailEntries,
  sectionId,
}: PrintViewProps) {
  const state = hydrate(snapshot, tailEntries);
  const plan = Object.values(state.plans)[0];
  const project = plan ? state.projects[plan.projectId] : undefined;
  const kind = plan?.kind;

  const focusedSection = sectionId ? state.sections[sectionId] : undefined;

  const docsRoots = state.docsRootIds
    .map((id) => state.sections[id])
    .filter((s): s is SectionEntity => Boolean(s));

  const screens = Object.values(state.screens).filter(
    (s) => s.planId === plan?.id,
  );

  const breadcrumbs = focusedSection
    ? buildBreadcrumbs(state, focusedSection)
    : [];

  return (
    <div className="print-page mx-auto max-w-3xl space-y-10 p-8 text-zinc-900 print:max-w-none print:p-0 print:text-black">
      <header className="space-y-1 border-b pb-4">
        <div className="text-xs uppercase tracking-wider text-zinc-500">
          {kind ?? "—"} plan
          {focusedSection ? ` · section export` : ""}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {project?.title ?? plan?.id ?? "Untitled plan"}
        </h1>
        {project?.summary ? (
          <p className="text-sm text-zinc-600">{project.summary}</p>
        ) : null}
        {breadcrumbs.length > 0 ? (
          <p className="pt-1 text-xs text-zinc-500">
            {breadcrumbs.map((b) => b.title).join(" › ")}
          </p>
        ) : null}
      </header>

      {focusedSection ? (
        <SectionPrintNode
          state={state}
          section={focusedSection}
          depth={0}
          standalone
        />
      ) : (
        <>
          {docsRoots.length > 0 ? (
            <section className="space-y-6">
              <h2 className="text-xl font-semibold print:break-before-page first:print:break-before-auto">
                Docs
              </h2>
              {docsRoots.map((section) => (
                <SectionPrintNode
                  key={section.id}
                  state={state}
                  section={section}
                  depth={0}
                />
              ))}
            </section>
          ) : null}

          {screens.length > 0 ? (
            <section className="space-y-6">
              <h2 className="text-xl font-semibold print:break-before-page">
                Screens
              </h2>
              {screens.map((screen) => {
                const childIds = state.children[screen.id] ?? [];
                const tree = (
                  <div className="space-y-3">
                    {childIds.map((id) => (
                      <BlockPrintNode key={id} state={state} blockId={id} />
                    ))}
                    {childIds.length === 0 ? (
                      <div className="text-xs italic text-zinc-500">
                        (empty screen)
                      </div>
                    ) : null}
                  </div>
                );
                const wrapped =
                  kind === "web" ? (
                    <BrowserFrame
                      url={
                        screen.route ??
                        `https://app.local${screen.route ?? "/"}`
                      }
                      title={screen.title}
                    >
                      {tree}
                    </BrowserFrame>
                  ) : kind === "mobile" ? (
                    <MobileFrame title={screen.title}>{tree}</MobileFrame>
                  ) : (
                    <div className="rounded-lg border p-4">{tree}</div>
                  );
                return (
                  <article
                    key={screen.id}
                    className="space-y-3 break-inside-avoid"
                  >
                    <h3 className="text-base font-medium">{screen.title}</h3>
                    {wrapped}
                  </article>
                );
              })}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function buildBreadcrumbs(
  state: AppState,
  section: SectionEntity,
): SectionEntity[] {
  const chain: SectionEntity[] = [];
  let current: SectionEntity | undefined = section;
  let guard = 0;
  while (current && guard < 32) {
    chain.unshift(current);
    if (current.parentId === null) break;
    current = state.sections[current.parentId];
    guard++;
  }
  return chain;
}

function SectionPrintNode({
  state,
  section,
  depth,
  standalone = false,
}: {
  state: AppState;
  section: SectionEntity;
  depth: number;
  standalone?: boolean;
}): ReactNode {
  const childIds = state.children[section.id] ?? [];
  const subSections: SectionEntity[] = [];
  const blocks: string[] = [];
  for (const id of childIds) {
    if (state.sections[id]) subSections.push(state.sections[id]);
    else if (state.blocks[id]) blocks.push(id);
  }
  const HeadingTag = depth === 0 ? "h3" : depth === 1 ? "h4" : "h5";
  const headingClass =
    depth === 0
      ? "text-lg font-semibold"
      : depth === 1
        ? "text-base font-semibold"
        : "text-sm font-medium";
  // Top-level docs sections start on a fresh page when paginated, except the
  // first one and when we're rendering a standalone (?sectionId=) export.
  const breakClass =
    !standalone && depth === 0
      ? "print:break-before-page first:print:break-before-auto"
      : "";
  return (
    <section className={`space-y-3 ${breakClass}`}>
      <HeadingTag className={`${headingClass} break-after-avoid`}>
        {section.title}
      </HeadingTag>
      {blocks.length > 0 ? (
        <div className="space-y-3">
          {blocks.map((id) => (
            <BlockPrintNode key={id} state={state} blockId={id} />
          ))}
        </div>
      ) : null}
      {subSections.length > 0 ? (
        <div className="space-y-4 pl-4">
          {subSections.map((sub) => (
            <SectionPrintNode
              key={sub.id}
              state={state}
              section={sub}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
      {blocks.length === 0 && subSections.length === 0 ? (
        <div className="text-xs italic text-zinc-500">(empty)</div>
      ) : null}
    </section>
  );
}

function BlockPrintNode({
  state,
  blockId,
}: {
  state: AppState;
  blockId: string;
}): ReactNode {
  const block: BlockEntity | undefined = state.blocks[blockId];
  if (!block) return null;
  const context = block.context ?? "app";
  const Renderer = detailRenderers[context]?.[block.kind];
  const childIds = state.children[blockId] ?? [];
  return (
    <div className="space-y-2 break-inside-avoid">
      {Renderer ? (
        <Renderer
          vm={{
            id: block.id,
            kind: block.kind,
            context,
            parentId: block.parentId,
            data: block.data,
            isSelected: false,
            isEditing: false,
            isPending: false,
            displayValue: block.data,
          }}
          handlers={NOOP_HANDLERS}
        />
      ) : (
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          [{block.kind}] no renderer
        </div>
      )}
      {childIds.length > 0 ? (
        <div className="space-y-2 pl-4">
          {childIds.map((id) => (
            <BlockPrintNode key={id} state={state} blockId={id} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
