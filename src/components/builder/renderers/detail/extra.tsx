"use client";

import { CheckCircle2, Info, TriangleAlert, User, XCircle } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { inlineMdToHtml } from "@/components/builder/inline-editor";
import { MarkdownView } from "@/components/builder/markdown/markdown-view";
import { useMediaUrl } from "@/hooks/builder/use-media-url.hook";
import { cn } from "@/lib/utils";
import { renderTexToHtml } from "@/services/third-party-facade/katex";
import { highlightToHtml } from "@/services/third-party-facade/shiki";
import type { BlockRenderer } from "../types";
import { CopyButton } from "./_copy-button";

/**
 * One-file home for the long tail of detail renderers added in P6 stage 6.
 * Each renderer pulls fields off vm.displayValue with permissive casts —
 * the manifest schema is the single source of truth for shape, but we
 * defensively coerce here so legacy data without the new keys still draws
 * something sensible.
 */

const empty = (label: string) => (
  <span className="italic text-muted-foreground/70">{label}</span>
);

// Shared card class for all spec-card docs blocks (decision, persona, …).
const cardCls =
  "rounded-lg border border-hairline bg-background dark:bg-card p-4 shadow-[0_0_0_1px_transparent]";

// Eyebrow label: uppercase small caps for sub-section labels inside cards.
const eyebrowCls =
  "text-caption font-medium uppercase tracking-eyebrow text-muted-foreground";

function stringValue(
  vm: { displayValue: Record<string, unknown> },
  key: string,
) {
  const v = vm.displayValue[key];
  return typeof v === "string" ? v : "";
}

// ────────── docs ──────────

export const BlockquoteDetail: BlockRenderer = ({ vm }) => {
  const text = stringValue(vm, "text");
  const cite = stringValue(vm, "cite");
  return (
    <blockquote className="border-l-2 border-hairline-strong pl-4 text-subhead italic text-muted-foreground">
      {text ? (
        <MarkdownView compact className="prose-doc">
          {text}
        </MarkdownView>
      ) : (
        empty("Quote")
      )}
      {cite ? (
        <footer className="mt-1 not-italic text-xs text-muted-foreground/70">
          — {cite}
        </footer>
      ) : null}
    </blockquote>
  );
};

// Callout tones: left accent bar + icon chip. Dark-mode safe via semantic color tokens
// and explicit dark: variants only on explicit light-color bg tints.
const CALLOUT_TONES: Record<
  string,
  { accent: string; iconBg: string; icon: ReactNode }
> = {
  info: {
    accent: "before:bg-blue-500",
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    icon: <Info className="size-3.5" />,
  },
  warn: {
    accent: "before:bg-amber-500",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    icon: <TriangleAlert className="size-3.5" />,
  },
  success: {
    accent: "before:bg-emerald-500",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    icon: <CheckCircle2 className="size-3.5" />,
  },
  error: {
    accent: "before:bg-red-500",
    iconBg: "bg-red-500/10 text-red-600 dark:text-red-300",
    icon: <XCircle className="size-3.5" />,
  },
};

export const CalloutDetail: BlockRenderer = ({ vm }) => {
  const variant = stringValue(vm, "variant") || "info";
  const title = stringValue(vm, "title");
  const text = stringValue(vm, "text");
  // Fallback to info tone when an unknown variant is passed in data.
  const tone = CALLOUT_TONES[variant] ?? CALLOUT_TONES.info;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-hairline bg-background dark:bg-card pl-4 pr-4 py-3 text-subhead",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-1",
        tone.accent,
      )}
    >
      <div className="flex gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
            tone.iconBg,
          )}
        >
          {tone.icon}
        </span>
        <div className="min-w-0 flex-1">
          {title ? (
            <div className="mb-1 font-semibold text-foreground">{title}</div>
          ) : null}
          {text ? (
            <MarkdownView compact className="prose-doc">
              {text}
            </MarkdownView>
          ) : (
            empty("Callout")
          )}
        </div>
      </div>
    </div>
  );
};

export const CodeBlockDetail: BlockRenderer = ({ vm }) => {
  const language = stringValue(vm, "language") || "text";
  const code = stringValue(vm, "code");
  const filename = stringValue(vm, "filename");
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setHighlighted(null);
      return;
    }
    let cancelled = false;
    highlightToHtml(code, language).then((html) => {
      if (!cancelled) setHighlighted(html);
    });
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  return (
    <div className="group relative overflow-hidden rounded-lg border border-hairline bg-surface-1">
      <div className="flex items-center justify-between border-b border-hairline bg-surface-2 px-3 py-1.5">
        <span className="font-mono text-caption font-medium uppercase tracking-eyebrow text-muted-foreground">
          {filename ? `${filename} · ${language}` : language}
        </span>
        {code ? (
          <CopyButton
            text={code}
            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          />
        ) : null}
      </div>
      {code ? (
        highlighted ? (
          <div
            className="code-block-shiki overflow-x-auto px-3 py-3 font-mono text-[13px] leading-relaxed [&_pre]:bg-transparent [&_pre]:p-0"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is HTML escaped by the highlighter.
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        ) : (
          <pre className="overflow-x-auto bg-muted/30 px-3 py-3 font-mono text-[13px] leading-relaxed">
            <code>{code}</code>
          </pre>
        )
      ) : (
        <pre className="overflow-x-auto bg-muted/30 px-3 py-3 font-mono text-[13px] leading-relaxed">
          <code>{empty("// empty")}</code>
        </pre>
      )}
    </div>
  );
};

export const ChecklistDetail: BlockRenderer = ({ vm }) => {
  const items =
    (vm.displayValue.items as { text: string; checked: boolean }[]) ?? [];
  if (items.length === 0)
    return <div className="py-1 text-[15px]">{empty("Empty checklist")}</div>;
  return (
    <ul className="space-y-1.5 text-[15px]">
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: positional list mirroring source array.
        <li key={i} className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={!!item.checked}
            readOnly
            className="mt-[3px] size-4 rounded-sm border-hairline-strong accent-foreground"
          />
          <span
            className={
              item.checked
                ? "leading-relaxed line-through decoration-2 text-muted-foreground"
                : "leading-relaxed"
            }
          >
            {item.text || empty("(item)")}
          </span>
        </li>
      ))}
    </ul>
  );
};

export const TableDetail: BlockRenderer = ({ vm }) => {
  const columns = (vm.displayValue.columns as string[]) ?? [];
  const rows = (vm.displayValue.rows as string[][]) ?? [];
  if (columns.length === 0 && rows.length === 0)
    return <div className="py-1 text-[14px]">{empty("Empty table")}</div>;
  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full border-collapse text-[14px]">
        <thead className="border-b border-hairline-strong bg-surface-2/60">
          <tr>
            {columns.map((col, i) => (
              <th
                // biome-ignore lint/suspicious/noArrayIndexKey: header positions are stable.
                key={i}
                className="px-4 py-2.5 text-left text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground"
              >
                {col ? (
                  <span
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: inlineMdToHtml escapes user input before inserting whitelisted tags only.
                    dangerouslySetInnerHTML={{ __html: inlineMdToHtml(col) }}
                  />
                ) : (
                  empty(`col ${i + 1}`)
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional.
              key={ri}
              className="border-b border-hairline last:border-b-0 even:bg-surface-1/40"
            >
              {row.map((cell, ci) => {
                const html = inlineMdToHtml(cell);
                return (
                  <td
                    // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional.
                    key={ci}
                    className="px-4 py-2.5 align-top text-foreground"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: inlineMdToHtml escapes user input before inserting whitelisted tags only.
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const RuleDetail: BlockRenderer = () => (
  <hr className="border-hairline" />
);

export const FigureDetail: BlockRenderer = ({ vm }) => {
  // imageRef is the canonical key; fall back to legacy src for existing data.
  const ref = stringValue(vm, "imageRef") || stringValue(vm, "src");
  const alt = stringValue(vm, "alt");
  const caption = stringValue(vm, "caption");
  const width = vm.displayValue.width as number | undefined;
  // Resolve "media:<id>" refs to /api/media/<id>/raw; raw URLs pass through unchanged.
  const resolvedSrc = useMediaUrl(ref);
  return (
    <figure className="max-w-full space-y-2">
      {resolvedSrc ? (
        <div className="overflow-hidden rounded-lg border border-hairline bg-muted/30">
          {/* biome-ignore lint/performance/noImgElement: arbitrary remote URLs. */}
          <img
            src={resolvedSrc}
            alt={alt || "figure"}
            style={width ? { width } : undefined}
            className="w-full max-w-full"
          />
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg border border-hairline bg-muted/30 text-xs text-muted-foreground">
          {empty("No image")}
        </div>
      )}
      {caption ? (
        <figcaption className="mt-2 text-[13px] italic text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
};

export const LinkCardDetail: BlockRenderer = ({ vm }) => {
  const url = stringValue(vm, "url");
  const title = stringValue(vm, "title");
  const description = stringValue(vm, "description");
  const faviconUrl = stringValue(vm, "faviconUrl");
  // Resolve "media:<id>" refs; raw external favicon URLs pass through unchanged.
  const resolvedFaviconUrl = useMediaUrl(faviconUrl);
  return (
    <a
      href={url || "#"}
      className="block rounded-lg border border-hairline p-4 hover:border-hairline-strong transition-colors"
      target="_blank"
      rel="noreferrer"
    >
      <div className="flex items-center gap-2">
        {resolvedFaviconUrl ? (
          // biome-ignore lint/performance/noImgElement: tiny external favicon.
          <img src={resolvedFaviconUrl} alt="" className="h-4 w-4" />
        ) : null}
        <span className="font-semibold text-foreground">
          {title || empty("Untitled link")}
        </span>
      </div>
      {description ? (
        <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
          {description}
        </p>
      ) : null}
      {url ? (
        <p className="mt-1 truncate text-caption text-muted-foreground">
          {url}
        </p>
      ) : null}
    </a>
  );
};

export const DefinitionDetail: BlockRenderer = ({ vm }) => (
  <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[15px]">
    <dt className="font-semibold text-foreground">
      {stringValue(vm, "term") || empty("Term")}
    </dt>
    <dd className="leading-relaxed text-muted-foreground">
      {stringValue(vm, "definition") || empty("Definition")}
    </dd>
  </dl>
);

const STATUS_TONE: Record<string, string> = {
  proposed:
    "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300/60 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800/60",
  accepted:
    "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-300/60 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800/60",
  superseded:
    "bg-surface-2 text-ink-subtle ring-1 ring-inset ring-hairline dark:bg-surface-2 dark:text-ink-subtle",
};

export const DecisionDetail: BlockRenderer = ({ vm }) => {
  const question = stringValue(vm, "question");
  const status = stringValue(vm, "status") || "proposed";
  const ctx = stringValue(vm, "context");
  const decision = stringValue(vm, "decision");
  const rationale = stringValue(vm, "rationale");
  const consequences = stringValue(vm, "consequences");
  const options =
    (vm.displayValue.options as {
      label: string;
      pros: string;
      cons: string;
    }[]) ?? [];
  return (
    <div className={cn(cardCls, "space-y-4")}>
      <div className="flex flex-wrap items-start gap-2">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-caption font-medium uppercase tracking-eyebrow",
            STATUS_TONE[status] ?? STATUS_TONE.proposed,
          )}
        >
          {status}
        </span>
        <span className="text-[17px] font-semibold leading-snug text-foreground">
          {question || empty("Question")}
        </span>
      </div>
      {ctx ? (
        <div>
          <div className={eyebrowCls}>Context</div>
          <p className="mt-1 whitespace-pre-wrap text-[14px] text-muted-foreground">
            {ctx}
          </p>
        </div>
      ) : null}
      {options.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2">
          {options.map((opt, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: option order is stable.
              key={i}
              className="rounded-md border border-hairline p-3 text-[13px]"
            >
              <div className="font-semibold text-foreground">
                {opt.label || `Option ${i + 1}`}
              </div>
              {opt.pros ? (
                <div className="mt-1 text-emerald-600 dark:text-emerald-400">
                  + {opt.pros}
                </div>
              ) : null}
              {opt.cons ? (
                <div className="text-red-600 dark:text-red-400">
                  − {opt.cons}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {decision ? (
        <div>
          <div className={eyebrowCls}>Decision</div>
          <p className="mt-1 whitespace-pre-wrap text-[14px]">{decision}</p>
        </div>
      ) : null}
      {rationale ? (
        <div>
          <div className={eyebrowCls}>Rationale</div>
          <p className="mt-1 whitespace-pre-wrap text-[14px]">{rationale}</p>
        </div>
      ) : null}
      {consequences ? (
        <div>
          <div className={eyebrowCls}>Consequences</div>
          <p className="mt-1 whitespace-pre-wrap text-[14px]">{consequences}</p>
        </div>
      ) : null}
    </div>
  );
};

export const PersonaDetail: BlockRenderer = ({ vm }) => {
  const name = stringValue(vm, "name");
  const role = stringValue(vm, "role");
  const demographics = stringValue(vm, "demographics");
  const quote = stringValue(vm, "quote");
  const goals = (vm.displayValue.goals as string[]) ?? [];
  const needs = (vm.displayValue.needs as string[]) ?? [];
  const pains = (vm.displayValue.pains as string[]) ?? [];

  // Resolve "media:<id>" → URL; empty string / undefined → undefined (SVG fallback).
  const profileRef = stringValue(vm, "profileImageRef");
  const profileAlt =
    stringValue(vm, "profileImageAlt") || name || "Persona profile";
  const resolvedProfile = useMediaUrl(profileRef || undefined);

  // Track img load failure so we can swap to the SVG fallback.
  const [imgError, setImgError] = useState(false);

  // Reset error state whenever the ref changes (user picks a new image).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset on ref change only.
  useEffect(() => {
    setImgError(false);
  }, [profileRef]);

  const showImage = resolvedProfile && !imgError;

  return (
    <div className={cardCls}>
      {/* Avatar header — image or SVG fallback */}
      <div className="flex items-start gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline bg-muted">
          {showImage ? (
            // biome-ignore lint/performance/noImgElement: local /api/media/<id>/raw — next/image not applicable.
            <img
              src={resolvedProfile}
              alt={profileAlt}
              className="h-full w-full object-cover"
              onError={() => {
                console.warn(
                  `[PersonaDetail] Failed to load profile image: ${profileRef}`,
                );
                setImgError(true);
              }}
            />
          ) : (
            <User className="size-7 text-muted-foreground/60" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-foreground">
            {name || empty("Persona")}
          </div>
          {role ? (
            <div className="truncate text-[13px] text-muted-foreground">
              {role}
            </div>
          ) : null}
          {demographics ? (
            <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
              {demographics}
            </p>
          ) : null}
        </div>
      </div>
      {quote ? (
        <blockquote className="my-3 border-l-2 border-hairline-strong pl-3 text-[13px] italic text-muted-foreground">
          {quote}
        </blockquote>
      ) : null}
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <PersonaList title="Goals" items={goals} />
        <PersonaList title="Needs" items={needs} />
        <PersonaList title="Pains" items={pains} />
      </div>
    </div>
  );
};

function PersonaList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className={eyebrowCls}>{title}</div>
      {items.length === 0 ? (
        <div className="text-[13px] italic text-muted-foreground/70">—</div>
      ) : (
        <ul className="mt-1 space-y-1 pl-4 list-disc marker:text-muted-foreground/50 text-[13px]">
          {items.map((item, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable list.
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const PRIORITY_TONE: Record<string, string> = {
  P0: "bg-red-100 text-red-800 ring-1 ring-inset ring-red-300/60 dark:bg-red-950 dark:text-red-200 dark:ring-red-800/60",
  P1: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300/60 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800/60",
  P2: "bg-surface-2 text-ink-subtle ring-1 ring-inset ring-hairline",
};

export const UserStoryDetail: BlockRenderer = ({ vm }) => {
  const as = stringValue(vm, "as");
  const want = stringValue(vm, "want");
  const soThat = stringValue(vm, "soThat");
  const priority = stringValue(vm, "priority") || "P1";
  const estimate = stringValue(vm, "estimate");
  const acceptance = (vm.displayValue.acceptance as string[]) ?? [];
  return (
    <div className={cn(cardCls, "space-y-3")}>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-caption font-medium uppercase tracking-eyebrow",
            PRIORITY_TONE[priority] ?? PRIORITY_TONE.P1,
          )}
        >
          {priority}
        </span>
        {estimate ? (
          <span className="text-[13px] text-muted-foreground">{estimate}</span>
        ) : null}
      </div>
      <p className="text-[15px] leading-relaxed">
        As{" "}
        <span className="font-semibold text-foreground">
          {as || empty("…")}
        </span>
        , I want{" "}
        <span className="font-semibold text-foreground">
          {want || empty("…")}
        </span>
        , so that{" "}
        <span className="font-semibold text-foreground">
          {soThat || empty("…")}
        </span>
        .
      </p>
      {acceptance.length > 0 ? (
        <div>
          <div className={eyebrowCls}>Acceptance</div>
          <ul className="mt-1 space-y-1 ml-4 list-disc marker:text-muted-foreground/50 text-[13px]">
            {acceptance.map((c, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: stable list.
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

const LEVEL_TONE: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-300/60 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800/60",
  medium:
    "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300/60 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800/60",
  high: "bg-red-100 text-red-800 ring-1 ring-inset ring-red-300/60 dark:bg-red-950 dark:text-red-200 dark:ring-red-800/60",
};

export const RiskDetail: BlockRenderer = ({ vm }) => {
  const risk = stringValue(vm, "risk");
  const impact = stringValue(vm, "impact");
  const impactLevel = stringValue(vm, "impactLevel") || "medium";
  const likelihood = stringValue(vm, "likelihood") || "medium";
  const mitigation = stringValue(vm, "mitigation");
  const owner = stringValue(vm, "owner");
  return (
    <div className={cn(cardCls, "space-y-3")}>
      <div className="font-semibold text-foreground text-[15px]">
        {risk || empty("Risk")}
      </div>
      <div className="flex flex-wrap gap-2">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-caption font-medium uppercase tracking-eyebrow",
            LEVEL_TONE[impactLevel] ?? LEVEL_TONE.medium,
          )}
        >
          impact: {impactLevel}
        </span>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-caption font-medium uppercase tracking-eyebrow",
            LEVEL_TONE[likelihood] ?? LEVEL_TONE.medium,
          )}
        >
          likelihood: {likelihood}
        </span>
        {owner ? (
          <span className="rounded-md bg-surface-2 px-2 py-0.5 text-caption font-medium tracking-eyebrow text-muted-foreground ring-1 ring-inset ring-hairline">
            @{owner}
          </span>
        ) : null}
      </div>
      {impact ? (
        <p className="text-[13px] text-muted-foreground">{impact}</p>
      ) : null}
      {mitigation ? (
        <div>
          <div className={eyebrowCls}>Mitigation</div>
          <p className="mt-1 text-[14px]">{mitigation}</p>
        </div>
      ) : null}
    </div>
  );
};

const METRIC_TONE: Record<string, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-red-500",
};

const TREND_GLYPH: Record<string, string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

export const MetricDetail: BlockRenderer = ({ vm }) => {
  const name = stringValue(vm, "name");
  const target = stringValue(vm, "target");
  const current = stringValue(vm, "current");
  const status = stringValue(vm, "status") || "ok";
  const unit = stringValue(vm, "unit");
  const trend = stringValue(vm, "trend") || "flat";
  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between">
        <span className={eyebrowCls}>{name || empty("Metric")}</span>
        <span
          title={`status: ${status}`}
          className={cn(
            "h-2 w-2 rounded-full",
            METRIC_TONE[status] ?? METRIC_TONE.ok,
          )}
        />
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-[28px] font-semibold tracking-display-lg tabular-nums">
          {current || "—"}
        </span>
        {unit ? (
          <span className="text-[13px] text-muted-foreground ml-1">{unit}</span>
        ) : null}
        <span className="ml-2 text-[13px] text-muted-foreground">
          {TREND_GLYPH[trend] ?? "→"} target {target || "—"}
        </span>
      </div>
    </div>
  );
};

// ────────── app ──────────

export const PageHeaderDetail: BlockRenderer = ({ vm }) => {
  const title = stringValue(vm, "title");
  const subtitle = stringValue(vm, "subtitle");
  const breadcrumbs =
    (vm.displayValue.breadcrumbs as { label: string; href: string }[]) ?? [];
  const actions =
    (vm.displayValue.actions as {
      label: string;
      variant: string;
      href: string;
    }[]) ?? [];
  return (
    <header className="border-b py-3">
      {breadcrumbs.length > 0 ? (
        <nav className="text-xs text-muted-foreground">
          {breadcrumbs.map((b, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable order.
            <span key={i}>
              {i > 0 ? " / " : ""}
              {b.label || "—"}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{title || empty("Title")}</h1>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {actions.length > 0 ? (
          <div className="flex gap-1">
            {actions.map((a, i) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: stable order.
                key={i}
                type="button"
                className={cn(
                  "rounded px-3 py-1 text-xs",
                  a.variant === "primary"
                    ? "bg-primary text-primary-foreground"
                    : "border",
                )}
              >
                {a.label || "Action"}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
};

export const SidebarDetail: BlockRenderer = ({ vm }) => {
  const items =
    (vm.displayValue.items as {
      label: string;
      href: string;
      icon: string;
    }[]) ?? [];
  return (
    <nav className="w-60 rounded border p-2">
      {items.length === 0 ? (
        <div className="text-xs italic text-muted-foreground">No items</div>
      ) : (
        <ul className="space-y-1 text-sm">
          {items.map((it, i) => (
            <li
              key={`${i}-${it.label}`}
              className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent"
            >
              {it.icon ? (
                <span className="text-xs text-muted-foreground">
                  [{it.icon}]
                </span>
              ) : null}
              <span>{it.label || "—"}</span>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
};

export const FooterDetail: BlockRenderer = ({ vm }) => {
  const columns =
    (vm.displayValue.columns as {
      title: string;
      links: { label: string; href: string }[];
    }[]) ?? [];
  const copyright = stringValue(vm, "copyright");
  return (
    <footer className="border-t py-4 text-sm">
      {columns.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((col, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable order.
            <div key={i}>
              <div className="text-xs font-semibold uppercase">
                {col.title || "—"}
              </div>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {col.links.map((l, li) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable order.
                  <li key={li}>{l.label || "link"}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
      {copyright ? (
        <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">
          {copyright}
        </div>
      ) : null}
    </footer>
  );
};

export const TabsDetail: BlockRenderer = ({ vm }) => {
  const tabs = (vm.displayValue.tabs as { label: string; id: string }[]) ?? [];
  const defaultId = stringValue(vm, "defaultTabId");
  if (tabs.length === 0)
    return <div className="py-1 text-sm">{empty("No tabs")}</div>;
  return (
    <div className="flex gap-2 border-b">
      {tabs.map((t, i) => {
        const active = (t.id || "") === defaultId || (i === 0 && !defaultId);
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: stable order.
            key={i}
            className={cn(
              "border-b-2 px-3 py-1 text-sm",
              active
                ? "border-primary font-medium"
                : "border-transparent text-muted-foreground",
            )}
          >
            {t.label || `Tab ${i + 1}`}
          </div>
        );
      })}
    </div>
  );
};

export const ModalDetail: BlockRenderer = ({ vm }) => {
  const title = stringValue(vm, "title");
  const body = stringValue(vm, "body");
  const primary = stringValue(vm, "primaryCta");
  const secondary = stringValue(vm, "secondaryCta");
  const size = stringValue(vm, "size") || "md";
  const widthCls =
    size === "sm" ? "max-w-xs" : size === "lg" ? "max-w-2xl" : "max-w-md";
  return (
    <div
      className={cn(
        "mx-auto rounded-lg border bg-background p-4 shadow-lg",
        widthCls,
      )}
    >
      <div className="border-b pb-2 text-sm font-semibold">
        {title || empty("Modal title")}
      </div>
      <p className="my-3 whitespace-pre-wrap text-sm">
        {body || empty("(body)")}
      </p>
      <div className="flex justify-end gap-2 border-t pt-2">
        {secondary ? (
          <button type="button" className="rounded border px-3 py-1 text-xs">
            {secondary}
          </button>
        ) : null}
        {primary ? (
          <button
            type="button"
            className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground"
          >
            {primary}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export const DividerDetail: BlockRenderer = ({ vm }) => {
  const orientation = stringValue(vm, "orientation") || "horizontal";
  const spacing = stringValue(vm, "spacing") || "md";
  const spaceCls =
    spacing === "sm" ? "my-2" : spacing === "lg" ? "my-6" : "my-4";
  if (orientation === "vertical")
    return <span className="mx-2 inline-block h-6 w-px bg-muted" />;
  return <hr className={cn("border-muted", spaceCls)} />;
};

export const CtaSectionDetail: BlockRenderer = ({ vm }) => {
  const title = stringValue(vm, "title");
  const body = stringValue(vm, "body");
  const cta = stringValue(vm, "cta");
  const variant = stringValue(vm, "variant") || "primary";
  return (
    <section
      className={cn(
        "rounded-lg p-6 text-center",
        variant === "muted"
          ? "bg-muted text-foreground"
          : "bg-primary text-primary-foreground",
      )}
    >
      <h3 className="text-lg font-semibold">{title || empty("CTA title")}</h3>
      {body ? <p className="mt-1 text-sm opacity-80">{body}</p> : null}
      {cta ? (
        <button
          type="button"
          className="mt-3 rounded-md bg-background px-4 py-2 text-sm text-foreground"
        >
          {cta}
        </button>
      ) : null}
    </section>
  );
};

export const ImageDetail: BlockRenderer = ({ vm }) => {
  // imageRef is the canonical key; fall back to legacy src for existing data.
  const ref = stringValue(vm, "imageRef") || stringValue(vm, "src");
  const alt = stringValue(vm, "alt");
  const fit = stringValue(vm, "fit") || "cover";
  const width = vm.displayValue.width as number | undefined;
  const height = vm.displayValue.height as number | undefined;
  // Resolve "media:<id>" refs to /api/media/<id>/raw; raw URLs pass through unchanged.
  const resolvedSrc = useMediaUrl(ref);
  if (!resolvedSrc)
    return (
      <div className="flex h-32 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
        {empty("No image")}
      </div>
    );
  return (
    // biome-ignore lint/performance/noImgElement: arbitrary remote URLs.
    <img
      src={resolvedSrc}
      alt={alt || "image"}
      style={{
        width: width ?? "100%",
        height,
        objectFit: fit as "cover" | "contain",
      }}
      className="max-w-full rounded border"
    />
  );
};

const CHANGE_TONE: Record<string, string> = {
  up: "text-emerald-600",
  down: "text-red-600",
  none: "text-muted-foreground",
};

export const StatDetail: BlockRenderer = ({ vm }) => {
  const label = stringValue(vm, "label");
  const value = stringValue(vm, "value");
  const change = stringValue(vm, "change");
  const kind = stringValue(vm, "changeKind") || "none";
  return (
    <div className="rounded border p-3 text-sm">
      <div className="text-xs uppercase text-muted-foreground">
        {label || empty("Label")}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value || "—"}</div>
      {change ? (
        <div className={cn("text-xs", CHANGE_TONE[kind] ?? CHANGE_TONE.none)}>
          {kind === "up" ? "▲ " : kind === "down" ? "▼ " : ""}
          {change}
        </div>
      ) : null}
    </div>
  );
};

const SIZE_PX: Record<string, number> = { sm: 28, md: 40, lg: 56 };

export const AvatarDetail: BlockRenderer = ({ vm }) => {
  const name = stringValue(vm, "name");
  const src = stringValue(vm, "src");
  const subtitle = stringValue(vm, "subtitle");
  const size = stringValue(vm, "size") || "md";
  const px = SIZE_PX[size] ?? SIZE_PX.md;
  // Resolve "media:<id>" refs; raw URLs pass through unchanged.
  const resolvedSrc = useMediaUrl(src);
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex items-center gap-2">
      <div
        style={{ width: px, height: px }}
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted"
      >
        {resolvedSrc ? (
          // biome-ignore lint/performance/noImgElement: arbitrary remote URLs.
          <img
            src={resolvedSrc}
            alt={name || "avatar"}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs font-medium">{initials || "?"}</span>
        )}
      </div>
      <div className="text-sm">
        <div className="font-medium">{name || empty("Name")}</div>
        {subtitle ? (
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
};

const BADGE_TONE: Record<string, string> = {
  default: "bg-surface-2 text-ink-muted",
  primary: "bg-primary text-primary-foreground",
  success: "bg-emerald-200 text-emerald-800",
  warn: "bg-amber-200 text-amber-800",
  error: "bg-red-200 text-red-800",
  outline: "border border-foreground text-foreground",
};

export const BadgeDetail: BlockRenderer = ({ vm }) => {
  const label = stringValue(vm, "label");
  const variant = stringValue(vm, "variant") || "default";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium",
        BADGE_TONE[variant] ?? BADGE_TONE.default,
      )}
    >
      {label || "badge"}
    </span>
  );
};

const BUTTON_VARIANT_TONE: Record<string, string> = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  ghost: "hover:bg-accent",
  destructive: "bg-destructive text-destructive-foreground",
};

const BUTTON_SIZE: Record<string, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2 text-base",
};

export const ButtonDetail: BlockRenderer = ({ vm }) => {
  const label = stringValue(vm, "label");
  const variant = stringValue(vm, "variant") || "primary";
  const size = stringValue(vm, "size") || "md";
  const disabled = !!vm.displayValue.disabled;
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "rounded-md disabled:opacity-50",
        BUTTON_VARIANT_TONE[variant] ?? BUTTON_VARIANT_TONE.primary,
        BUTTON_SIZE[size] ?? BUTTON_SIZE.md,
      )}
    >
      {label || "Button"}
    </button>
  );
};

export const InputDetail: BlockRenderer = ({ vm }) => {
  const label = stringValue(vm, "label");
  const placeholder = stringValue(vm, "placeholder");
  const type = stringValue(vm, "type") || "text";
  const required = !!vm.displayValue.required;
  const helpText = stringValue(vm, "helpText");
  return (
    <div className="space-y-1 text-sm">
      {label ? (
        <div className="block text-xs font-medium">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </div>
      ) : null}
      {type === "textarea" ? (
        <textarea
          placeholder={placeholder}
          className="w-full rounded border bg-background px-2 py-1 text-sm"
          rows={3}
          readOnly
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          className="w-full rounded border bg-background px-2 py-1 text-sm"
          readOnly
        />
      )}
      {helpText ? (
        <p className="text-caption text-muted-foreground">{helpText}</p>
      ) : null}
    </div>
  );
};

const BANNER_TONE: Record<string, string> = {
  info: "bg-blue-100 text-blue-900",
  warn: "bg-amber-100 text-amber-900",
  success: "bg-emerald-100 text-emerald-900",
  error: "bg-red-100 text-red-900",
};

export const BannerDetail: BlockRenderer = ({ vm }) => {
  const variant = stringValue(vm, "variant") || "info";
  const text = stringValue(vm, "text");
  const ctaLabel = stringValue(vm, "ctaLabel");
  const dismissible = !!vm.displayValue.dismissible;
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded px-3 py-2 text-sm",
        BANNER_TONE[variant] ?? BANNER_TONE.info,
      )}
    >
      <span>{text || empty("Banner text")}</span>
      <div className="flex items-center gap-2">
        {ctaLabel ? (
          <button type="button" className="text-xs underline">
            {ctaLabel}
          </button>
        ) : null}
        {dismissible ? <span className="text-xs opacity-60">×</span> : null}
      </div>
    </div>
  );
};

export const EmptyStateDetail: BlockRenderer = ({ vm }) => {
  const title = stringValue(vm, "title");
  const body = stringValue(vm, "body");
  const ctaLabel = stringValue(vm, "ctaLabel");
  const icon = stringValue(vm, "icon");
  return (
    <div className="flex flex-col items-center gap-2 rounded border border-dashed p-6 text-center">
      {icon ? (
        <div className="text-2xl text-muted-foreground">[{icon}]</div>
      ) : null}
      <div className="font-medium">{title || empty("No data")}</div>
      {body ? (
        <p className="max-w-sm text-xs text-muted-foreground">{body}</p>
      ) : null}
      {ctaLabel ? (
        <button
          type="button"
          className="mt-2 rounded bg-primary px-3 py-1 text-xs text-primary-foreground"
        >
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
};

// ────────── mobile ──────────

export const StatusBarDetail: BlockRenderer = ({ vm }) => {
  const variant = stringValue(vm, "variant") || "light";
  const time = stringValue(vm, "time");
  const battery = vm.displayValue.batteryPct as number | undefined;
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-1 text-caption",
        variant === "dark"
          ? "bg-surface-3 text-ink"
          : "bg-inverse-canvas text-inverse-ink",
      )}
    >
      <span className="font-medium">{time || "9:41"}</span>
      <span>{battery != null ? `${battery}%` : "•••"}</span>
    </div>
  );
};

export const BottomNavDetail: BlockRenderer = ({ vm }) => {
  const items =
    (vm.displayValue.items as {
      label: string;
      icon: string;
      screenId: string;
    }[]) ?? [];
  const active = (vm.displayValue.activeIndex as number) ?? 0;
  if (items.length === 0)
    return (
      <div className="py-1 text-xs italic text-muted-foreground">No items</div>
    );
  return (
    <nav className="flex items-stretch justify-around border-t py-1">
      {items.map((it, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: stable.
          key={i}
          className={cn(
            "flex flex-col items-center px-2 text-caption",
            i === active ? "text-primary font-medium" : "text-muted-foreground",
          )}
        >
          {it.icon ? <span>[{it.icon}]</span> : null}
          <span>{it.label || "—"}</span>
        </div>
      ))}
    </nav>
  );
};

export const ListRowDetail: BlockRenderer = ({ vm }) => {
  const title = stringValue(vm, "title");
  const subtitle = stringValue(vm, "subtitle");
  const leading = stringValue(vm, "leading");
  const trailing = stringValue(vm, "trailing");
  const chevron = !!vm.displayValue.chevron;
  return (
    <div className="flex items-center gap-3 border-b py-2 text-sm">
      {leading ? (
        <span className="text-xs text-muted-foreground">[{leading}]</span>
      ) : null}
      <div className="flex-1">
        <div className="font-medium">{title || empty("Title")}</div>
        {subtitle ? (
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
      {trailing ? (
        <span className="text-xs text-muted-foreground">{trailing}</span>
      ) : null}
      {chevron ? <span className="text-muted-foreground">›</span> : null}
    </div>
  );
};

const FAB_POS: Record<string, string> = {
  br: "bottom-4 right-4",
  bl: "bottom-4 left-4",
  center: "bottom-4 left-1/2 -translate-x-1/2",
};

export const FabDetail: BlockRenderer = ({ vm }) => {
  const label = stringValue(vm, "label") || "+";
  const position = stringValue(vm, "position") || "br";
  return (
    <div className="relative h-24 rounded border bg-muted">
      <button
        type="button"
        className={cn(
          "absolute h-12 w-12 rounded-full bg-primary text-primary-foreground shadow",
          FAB_POS[position] ?? FAB_POS.br,
        )}
      >
        {label}
      </button>
    </div>
  );
};

const SHEET_HEIGHT: Record<string, string> = {
  auto: "min-h-24",
  half: "h-48",
  full: "h-72",
};

export const SheetDetail: BlockRenderer = ({ vm }) => {
  const title = stringValue(vm, "title");
  const body = stringValue(vm, "body");
  const height = stringValue(vm, "height") || "auto";
  const primaryCta = stringValue(vm, "primaryCta");
  return (
    <div
      className={cn(
        "rounded-t-xl border bg-background p-3 shadow-md",
        SHEET_HEIGHT[height] ?? SHEET_HEIGHT.auto,
      )}
    >
      <div className="mx-auto mb-2 h-1 w-10 rounded bg-muted-foreground/40" />
      <div className="text-sm font-semibold">{title || empty("Sheet")}</div>
      {body ? (
        <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
          {body}
        </p>
      ) : null}
      {primaryCta ? (
        <button
          type="button"
          className="mt-3 w-full rounded bg-primary py-2 text-xs text-primary-foreground"
        >
          {primaryCta}
        </button>
      ) : null}
    </div>
  );
};

// ────────── P7: gap fillers ──────────

const MILESTONE_STATUS: Record<
  string,
  { label: string; dot: string; chip: string }
> = {
  planned: {
    label: "Planned",
    dot: "bg-muted-foreground/40",
    chip: "bg-muted text-muted-foreground",
  },
  "in-progress": {
    label: "In progress",
    dot: "bg-amber-500",
    chip: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  },
  shipped: {
    label: "Shipped",
    dot: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  },
  delayed: {
    label: "Delayed",
    dot: "bg-red-500",
    chip: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
  },
};

export const MilestoneDetail: BlockRenderer = ({ vm }) => {
  const date = stringValue(vm, "date");
  const title = stringValue(vm, "title");
  const status = stringValue(vm, "status") || "planned";
  const scope = stringValue(vm, "scope");
  const exitCriteria = stringValue(vm, "exitCriteria");
  const tone = MILESTONE_STATUS[status] ?? MILESTONE_STATUS.planned;
  return (
    <div className={cn(cardCls, "flex gap-3")}>
      <span
        className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", tone.dot)}
        aria-hidden
      />
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {date ? (
            <span className="font-mono text-label bg-surface-2 border border-hairline rounded px-2 py-0.5 text-muted-foreground">
              {date}
            </span>
          ) : null}
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-caption font-medium uppercase tracking-eyebrow",
              tone.chip,
            )}
          >
            {tone.label}
          </span>
          <span className="font-semibold text-foreground text-[15px]">
            {title || empty("Milestone")}
          </span>
        </div>
        {scope ? (
          <p className="text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">Scope · </span>
            {scope}
          </p>
        ) : null}
        {exitCriteria ? (
          <p className="text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">Done when · </span>
            {exitCriteria}
          </p>
        ) : null}
      </div>
    </div>
  );
};

const RELEASE_BUCKETS: Array<{
  key: "added" | "changed" | "fixed" | "removed";
  label: string;
  tone: string;
}> = [
  {
    key: "added",
    label: "Added",
    tone: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "changed",
    label: "Changed",
    tone: "text-amber-600 dark:text-amber-400",
  },
  { key: "fixed", label: "Fixed", tone: "text-blue-600 dark:text-blue-400" },
  {
    key: "removed",
    label: "Removed",
    tone: "text-red-600 dark:text-red-400",
  },
];

export const ReleaseNoteDetail: BlockRenderer = ({ vm }) => {
  const version = stringValue(vm, "version");
  const date = stringValue(vm, "date");
  const highlights = stringValue(vm, "highlights");
  const data = vm.displayValue;
  return (
    <div className={cardCls}>
      <header className="mb-4 flex flex-wrap items-baseline gap-2 border-b border-hairline pb-3">
        <span className="font-mono text-[17px] font-semibold tabular-nums text-foreground">
          {version || empty("v0.0.0")}
        </span>
        {date ? (
          <span className="text-[13px] text-muted-foreground">{date}</span>
        ) : null}
      </header>
      {highlights ? (
        <p className="mb-4 text-[13px] text-muted-foreground">{highlights}</p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {RELEASE_BUCKETS.map((b) => {
          const items = (data[b.key] as string[]) ?? [];
          return (
            <div key={b.key}>
              <div className={cn(eyebrowCls, b.tone)}>
                {b.label} ({items.length})
              </div>
              {items.length === 0 ? (
                <div className="mt-1 text-[13px] text-muted-foreground/70">
                  —
                </div>
              ) : (
                <ul className="mt-1 space-y-1 text-[13px]">
                  {items.map((item, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: positional list.
                    <li key={i} className="flex gap-1">
                      <span className={cn("font-bold", b.tone)}>·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ColorSwatchDetail: BlockRenderer = ({ vm }) => {
  const name = stringValue(vm, "name");
  const hexRaw = stringValue(vm, "hex");
  const hex = hexRaw && !hexRaw.startsWith("#") ? `#${hexRaw}` : hexRaw;
  const role = stringValue(vm, "role");
  const contrastNote = stringValue(vm, "contrastNote");
  return (
    <div className={cn(cardCls, "flex items-stretch gap-4")}>
      <div
        className="size-14 shrink-0 rounded-md ring-1 ring-hairline-strong"
        style={hex ? { backgroundColor: hex } : undefined}
        aria-hidden
      />
      <div className="flex-1 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-foreground">
            {name || empty("Swatch")}
          </span>
          {hex ? (
            <span className="font-mono text-xs text-muted-foreground">
              {hex}
            </span>
          ) : null}
        </div>
        {role ? <p className="text-xs">{role}</p> : null}
        {contrastNote ? (
          <p className="text-xs text-muted-foreground">{contrastNote}</p>
        ) : null}
      </div>
    </div>
  );
};

export const JourneyStepDetail: BlockRenderer = ({ vm }) => {
  const step = (vm.displayValue.step as number) ?? 1;
  const persona = stringValue(vm, "persona");
  const action = stringValue(vm, "action");
  const system = stringValue(vm, "system");
  const outcome = stringValue(vm, "outcome");
  const painPoint = stringValue(vm, "painPoint");
  return (
    <div className={cardCls}>
      <header className="mb-3 flex items-baseline gap-2 border-b border-hairline pb-2">
        <span className="rounded bg-foreground px-1.5 py-0.5 font-mono text-caption text-background">
          STEP {step}
        </span>
        <span className="text-[13px] text-muted-foreground">
          {persona || empty("(persona)")}
        </span>
      </header>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[13px]">
        <dt className={eyebrowCls}>Action</dt>
        <dd className="text-muted-foreground">{action || empty("—")}</dd>
        <dt className={eyebrowCls}>System</dt>
        <dd className="text-muted-foreground">{system || empty("—")}</dd>
        <dt className={eyebrowCls}>Outcome</dt>
        <dd className="text-muted-foreground">{outcome || empty("—")}</dd>
        {painPoint ? (
          <>
            <dt className={cn(eyebrowCls, "text-red-600 dark:text-red-400")}>
              Pain
            </dt>
            <dd className="text-muted-foreground">{painPoint}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
};

const METHOD_TONE: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  POST: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
  PUT: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  PATCH:
    "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-100",
  DELETE: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
};

function HighlightedJson({ code }: { code: string }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    if (!code) {
      setHtml(null);
      return;
    }
    let cancelled = false;
    highlightToHtml(code, "json").then((h) => {
      if (!cancelled) setHtml(h);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);
  if (!code) return <div className="text-caption text-muted-foreground">—</div>;
  if (html) {
    return (
      <div
        className="overflow-x-auto rounded bg-muted/40 px-2 py-1.5 font-mono text-caption [&_pre]:bg-transparent [&_pre]:p-0"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <pre className="overflow-x-auto rounded bg-muted/40 px-2 py-1.5 font-mono text-caption">
      <code>{code}</code>
    </pre>
  );
}

export const ApiEndpointDetail: BlockRenderer = ({ vm }) => {
  const method = stringValue(vm, "method") || "GET";
  const path = stringValue(vm, "path");
  const summary = stringValue(vm, "summary");
  const auth = stringValue(vm, "auth");
  const request = stringValue(vm, "request");
  const response = stringValue(vm, "response");
  const errors =
    (vm.displayValue.errors as { status: number; reason: string }[]) ?? [];
  return (
    <div className={cn(cardCls, "p-0 overflow-hidden")}>
      <header className="flex flex-wrap items-center gap-2 border-b border-hairline bg-surface-2/60 px-4 py-3">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 font-mono text-caption font-semibold ring-1 ring-inset ring-current/20",
            METHOD_TONE[method] ?? METHOD_TONE.GET,
          )}
        >
          {method}
        </span>
        <code className="font-mono text-[14px] text-foreground">
          {path || empty("/path")}
        </code>
        {auth ? (
          <span className="ml-auto rounded bg-surface-2 border border-hairline px-2 py-0.5 text-caption text-muted-foreground">
            🔒 {auth}
          </span>
        ) : null}
      </header>
      {summary ? (
        <p className="border-b border-hairline px-4 py-2.5 text-[13px] text-muted-foreground">
          {summary}
        </p>
      ) : null}
      <div className="grid gap-4 p-4 md:grid-cols-2">
        <div>
          <div className={cn(eyebrowCls, "mb-1.5")}>Request</div>
          <HighlightedJson code={request} />
        </div>
        <div>
          <div className={cn(eyebrowCls, "mb-1.5")}>Response</div>
          <HighlightedJson code={response} />
        </div>
      </div>
      {errors.length > 0 ? (
        <div className="border-t border-hairline px-4 py-3">
          <div className={cn(eyebrowCls, "mb-1.5")}>Errors</div>
          <ul className="space-y-1 text-[13px]">
            {errors.map((e, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: positional list.
              <li key={i} className="flex gap-2">
                <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                  {e.status}
                </span>
                <span className="text-muted-foreground">{e.reason || "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export const MathBlockDetail: BlockRenderer = ({ vm }) => {
  const tex =
    typeof vm.displayValue.tex === "string" ? vm.displayValue.tex : "";

  if (!tex.trim()) {
    return (
      <div className="flex h-12 items-center rounded border bg-muted px-3 text-xs text-muted-foreground">
        {empty("Empty formula")}
      </div>
    );
  }

  const html = renderTexToHtml(tex, { displayMode: true });

  return (
    <div
      className="overflow-x-auto rounded-md border border-hairline bg-background dark:bg-card px-3 py-4 text-center"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted KaTeX output.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
