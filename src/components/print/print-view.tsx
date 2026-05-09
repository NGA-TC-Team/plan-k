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
  /** Whether to render a cover page (full-plan export only). Defaults to true. */
  cover?: boolean;
  /** Whether to render a table of contents page (full-plan export only). Defaults to true. */
  toc?: boolean;
  /**
   * Version metadata — only provided when exporting a tagged version.
   * When present, the cover page shows the version label, note, and tagged-at date.
   * These props have no effect when cover=false or sectionId is set.
   */
  versionLabel?: string;
  /** Pre-truncated note (≤400 chars). */
  versionNote?: string;
  /** The Date object from PlanVersionRow.createdAt (timestamp_ms mode). */
  versionTaggedAt?: Date;
};

export function PrintView({
  snapshot,
  tailEntries,
  sectionId,
  cover = true,
  toc = true,
  versionLabel,
  versionNote,
  versionTaggedAt,
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

  const generatedAt = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="print-page mx-auto max-w-3xl space-y-10 p-8 text-zinc-900 print:max-w-none print:p-0 print:text-black">
      {/* Cover page — full-plan export only, when cover=true */}
      {cover && !sectionId ? (
        <div className="flex min-h-[80vh] flex-col justify-between print:break-after-page">
          <div />
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-widest text-zinc-500">
              {kind ?? "—"} plan
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              {project?.title ?? plan?.id ?? "Untitled plan"}
            </h1>
            {project?.summary ? (
              <p className="max-w-prose text-base text-zinc-600">
                {project.summary}
              </p>
            ) : null}
            {versionLabel ? (
              <div className="mt-4 space-y-1 border-t pt-4">
                <p className="text-xs uppercase tracking-widest text-zinc-400">
                  Version
                </p>
                <p className="font-mono text-sm font-medium text-zinc-700">
                  {versionLabel}
                </p>
                {versionNote ? (
                  <p className="max-w-prose text-sm text-zinc-500">
                    {versionNote}
                  </p>
                ) : null}
                {versionTaggedAt ? (
                  <p className="text-xs text-zinc-400">
                    Tagged {versionTaggedAt.toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="text-xs text-zinc-400">{generatedAt}</div>
        </div>
      ) : null}

      {/* Table of contents — full-plan export only, when toc=true */}
      {toc && !sectionId ? (
        <div className="space-y-4 print:break-after-page">
          <h2 className="text-xl font-semibold">Contents</h2>
          {docsRoots.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Docs
              </p>
              <ul className="space-y-0.5 text-sm">
                {docsRoots.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#section-${s.id}`}
                      className="text-zinc-700 hover:underline"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {screens.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Screens
              </p>
              <ul className="space-y-0.5 text-sm">
                {screens.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#screen-${s.id}`}
                      className="text-zinc-700 hover:underline"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {docsRoots.length === 0 && screens.length === 0 ? (
            <p className="text-xs italic text-zinc-500">(no content)</p>
          ) : null}
        </div>
      ) : null}

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
                <div key={section.id} id={`section-${section.id}`}>
                  <SectionPrintNode state={state} section={section} depth={0} />
                </div>
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
                    id={`screen-${screen.id}`}
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
