"use client";

import { useEffect, useState } from "react";
import { MarkdownView } from "@/components/builder/markdown/markdown-view";
import { cn } from "@/lib/utils";
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
  <span className="italic text-muted-foreground">{label}</span>
);

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
    <blockquote className="border-l-2 border-border pl-3 text-sm text-muted-foreground">
      {text ? <MarkdownView compact>{text}</MarkdownView> : empty("Quote")}
      {cite ? (
        <footer className="mt-1 text-xs not-italic text-muted-foreground/80">
          — {cite}
        </footer>
      ) : null}
    </blockquote>
  );
};

const CALLOUT_TONES: Record<string, string> = {
  info: "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100",
  warn: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
  success:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  error:
    "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
};

export const CalloutDetail: BlockRenderer = ({ vm }) => {
  const variant = stringValue(vm, "variant") || "info";
  const title = stringValue(vm, "title");
  const text = stringValue(vm, "text");
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm",
        CALLOUT_TONES[variant] ?? CALLOUT_TONES.info,
      )}
    >
      {title ? <div className="mb-1 font-semibold">{title}</div> : null}
      {text ? <MarkdownView compact>{text}</MarkdownView> : empty("Callout")}
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
    <div className="group relative overflow-hidden rounded-md border bg-surface-1 text-xs">
      <div className="flex items-center justify-between border-b bg-muted/60 px-2 py-1">
        <span className="font-mono text-[10px] text-muted-foreground">
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
            className="code-block-shiki overflow-x-auto px-3 py-2 font-mono text-xs [&_pre]:bg-transparent [&_pre]:p-0"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is HTML escaped by the highlighter.
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        ) : (
          <pre className="overflow-x-auto bg-muted/30 px-3 py-2 font-mono">
            <code>{code}</code>
          </pre>
        )
      ) : (
        <pre className="overflow-x-auto bg-muted/30 px-3 py-2 font-mono">
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
    return <div className="py-1 text-sm">{empty("Empty checklist")}</div>;
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: positional list mirroring source array.
        <li key={i} className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={!!item.checked}
            readOnly
            className="mt-[3px] size-3.5 rounded border-border"
          />
          <span
            className={
              item.checked
                ? "leading-relaxed line-through text-muted-foreground"
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
    return <div className="py-1 text-sm">{empty("Empty table")}</div>;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/40">
          <tr>
            {columns.map((col, i) => (
              <th
                // biome-ignore lint/suspicious/noArrayIndexKey: header positions are stable.
                key={i}
                className="border-b border-border px-3 py-1.5 text-left font-semibold"
              >
                {col || empty(`col ${i + 1}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional.
            <tr key={ri} className="border-b border-border last:border-b-0">
              {row.map((cell, ci) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional.
                <td key={ci} className="px-3 py-1.5 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const RuleDetail: BlockRenderer = () => (
  <hr className="my-3 border-muted" />
);

export const FigureDetail: BlockRenderer = ({ vm }) => {
  const src = stringValue(vm, "src");
  const alt = stringValue(vm, "alt");
  const caption = stringValue(vm, "caption");
  const width = vm.displayValue.width as number | undefined;
  return (
    <figure className="my-2 space-y-1">
      {src ? (
        // biome-ignore lint/performance/noImgElement: arbitrary remote URLs.
        <img
          src={src}
          alt={alt || "figure"}
          style={width ? { width } : undefined}
          className="rounded border"
        />
      ) : (
        <div className="flex h-32 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
          {empty("No image")}
        </div>
      )}
      {caption ? (
        <figcaption className="text-xs text-muted-foreground">
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
  return (
    <a
      href={url || "#"}
      className="block rounded border p-3 text-sm hover:bg-accent"
      target="_blank"
      rel="noreferrer"
    >
      <div className="flex items-center gap-2">
        {faviconUrl ? (
          // biome-ignore lint/performance/noImgElement: tiny external favicon.
          <img src={faviconUrl} alt="" className="h-4 w-4" />
        ) : null}
        <span className="font-medium">{title || empty("Untitled link")}</span>
      </div>
      {description ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      {url ? (
        <p className="mt-1 truncate text-[10px] text-muted-foreground">{url}</p>
      ) : null}
    </a>
  );
};

export const DefinitionDetail: BlockRenderer = ({ vm }) => (
  <dl className="text-sm">
    <dt className="font-semibold">
      {stringValue(vm, "term") || empty("Term")}
    </dt>
    <dd className="ml-3 text-muted-foreground">
      {stringValue(vm, "definition") || empty("Definition")}
    </dd>
  </dl>
);

const STATUS_TONE: Record<string, string> = {
  proposed: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-800",
  superseded: "bg-surface-2 text-ink-subtle",
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
    <div className="space-y-3 rounded border p-3 text-sm">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded px-2 py-0.5 text-[10px] font-semibold uppercase",
            STATUS_TONE[status] ?? STATUS_TONE.proposed,
          )}
        >
          {status}
        </span>
        <span className="font-semibold">{question || empty("Question")}</span>
      </div>
      {ctx ? (
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Context
          </div>
          <p className="whitespace-pre-wrap text-xs">{ctx}</p>
        </div>
      ) : null}
      {options.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2">
          {options.map((opt, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: option order is stable.
              key={i}
              className="rounded border p-2 text-xs"
            >
              <div className="font-medium">
                {opt.label || `Option ${i + 1}`}
              </div>
              {opt.pros ? (
                <div className="mt-1 text-emerald-700">+ {opt.pros}</div>
              ) : null}
              {opt.cons ? (
                <div className="text-red-700">− {opt.cons}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {decision ? (
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Decision
          </div>
          <p className="whitespace-pre-wrap text-xs">{decision}</p>
        </div>
      ) : null}
      {rationale ? (
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Rationale
          </div>
          <p className="whitespace-pre-wrap text-xs">{rationale}</p>
        </div>
      ) : null}
      {consequences ? (
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Consequences
          </div>
          <p className="whitespace-pre-wrap text-xs">{consequences}</p>
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
  return (
    <div className="rounded border p-3 text-sm">
      <div className="font-semibold">{name || empty("Persona")}</div>
      {role ? (
        <div className="text-xs text-muted-foreground">{role}</div>
      ) : null}
      {demographics ? (
        <p className="mt-1 text-xs text-muted-foreground">{demographics}</p>
      ) : null}
      {quote ? (
        <blockquote className="my-2 border-l-2 border-muted-foreground/40 pl-2 text-xs italic">
          {quote}
        </blockquote>
      ) : null}
      <div className="mt-2 grid gap-2 md:grid-cols-3">
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
      <div className="text-[10px] font-semibold uppercase text-muted-foreground">
        {title}
      </div>
      {items.length === 0 ? (
        <div className="text-xs italic text-muted-foreground">—</div>
      ) : (
        <ul className="ml-3 list-disc text-xs">
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
  P0: "bg-red-100 text-red-800",
  P1: "bg-amber-100 text-amber-800",
  P2: "bg-surface-2 text-ink-subtle",
};

export const UserStoryDetail: BlockRenderer = ({ vm }) => {
  const as = stringValue(vm, "as");
  const want = stringValue(vm, "want");
  const soThat = stringValue(vm, "soThat");
  const priority = stringValue(vm, "priority") || "P1";
  const estimate = stringValue(vm, "estimate");
  const acceptance = (vm.displayValue.acceptance as string[]) ?? [];
  return (
    <div className="rounded border p-3 text-sm">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded px-2 py-0.5 text-[10px] font-semibold",
            PRIORITY_TONE[priority] ?? PRIORITY_TONE.P1,
          )}
        >
          {priority}
        </span>
        {estimate ? (
          <span className="text-xs text-muted-foreground">{estimate}</span>
        ) : null}
      </div>
      <p className="mt-1">
        As <span className="font-medium">{as || empty("…")}</span>, I want{" "}
        <span className="font-medium">{want || empty("…")}</span>, so that{" "}
        <span className="font-medium">{soThat || empty("…")}</span>.
      </p>
      {acceptance.length > 0 ? (
        <div className="mt-2">
          <div className="text-[10px] font-semibold uppercase text-muted-foreground">
            Acceptance
          </div>
          <ul className="ml-3 list-disc text-xs">
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
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

export const RiskDetail: BlockRenderer = ({ vm }) => {
  const risk = stringValue(vm, "risk");
  const impact = stringValue(vm, "impact");
  const impactLevel = stringValue(vm, "impactLevel") || "medium";
  const likelihood = stringValue(vm, "likelihood") || "medium";
  const mitigation = stringValue(vm, "mitigation");
  const owner = stringValue(vm, "owner");
  return (
    <div className="space-y-2 rounded border p-3 text-sm">
      <div className="font-semibold">{risk || empty("Risk")}</div>
      <div className="flex flex-wrap gap-2 text-[10px]">
        <span
          className={cn(
            "rounded px-2 py-0.5 font-semibold",
            LEVEL_TONE[impactLevel] ?? LEVEL_TONE.medium,
          )}
        >
          impact: {impactLevel}
        </span>
        <span
          className={cn(
            "rounded px-2 py-0.5 font-semibold",
            LEVEL_TONE[likelihood] ?? LEVEL_TONE.medium,
          )}
        >
          likelihood: {likelihood}
        </span>
        {owner ? (
          <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">
            owner: {owner}
          </span>
        ) : null}
      </div>
      {impact ? (
        <p className="text-xs text-muted-foreground">{impact}</p>
      ) : null}
      {mitigation ? (
        <div>
          <div className="text-[10px] font-semibold uppercase text-muted-foreground">
            Mitigation
          </div>
          <p className="text-xs">{mitigation}</p>
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
    <div className="rounded border p-3 text-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{name || empty("Metric")}</span>
        <span
          title={`status: ${status}`}
          className={cn(
            "h-2 w-2 rounded-full",
            METRIC_TONE[status] ?? METRIC_TONE.ok,
          )}
        />
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold">{current || "—"}</span>
        {unit ? <span className="text-xs">{unit}</span> : null}
        <span className="ml-2 text-xs text-muted-foreground">
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
  const src = stringValue(vm, "src");
  const alt = stringValue(vm, "alt");
  const fit = stringValue(vm, "fit") || "cover";
  const width = vm.displayValue.width as number | undefined;
  const height = vm.displayValue.height as number | undefined;
  if (!src)
    return (
      <div className="flex h-32 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
        {empty("No image")}
      </div>
    );
  return (
    // biome-ignore lint/performance/noImgElement: arbitrary remote URLs.
    <img
      src={src}
      alt={alt || "image"}
      style={{
        width: width ?? "100%",
        height,
        objectFit: fit as "cover" | "contain",
      }}
      className="rounded border"
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
        {src ? (
          // biome-ignore lint/performance/noImgElement: arbitrary remote URLs.
          <img
            src={src}
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
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
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
        <p className="text-[10px] text-muted-foreground">{helpText}</p>
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
        "flex items-center justify-between px-3 py-1 text-[11px]",
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
            "flex flex-col items-center px-2 text-[10px]",
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
    <div className="flex gap-3 rounded border p-3 text-sm">
      <span
        className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", tone.dot)}
        aria-hidden
      />
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {date ? (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              {date}
            </span>
          ) : null}
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium",
              tone.chip,
            )}
          >
            {tone.label}
          </span>
          <span className="font-semibold">{title || empty("Milestone")}</span>
        </div>
        {scope ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Scope · </span>
            {scope}
          </p>
        ) : null}
        {exitCriteria ? (
          <p className="text-xs text-muted-foreground">
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
  { key: "added", label: "Added", tone: "text-emerald-600" },
  { key: "changed", label: "Changed", tone: "text-amber-600" },
  { key: "fixed", label: "Fixed", tone: "text-blue-600" },
  { key: "removed", label: "Removed", tone: "text-red-600" },
];

export const ReleaseNoteDetail: BlockRenderer = ({ vm }) => {
  const version = stringValue(vm, "version");
  const date = stringValue(vm, "date");
  const highlights = stringValue(vm, "highlights");
  const data = vm.displayValue;
  return (
    <div className="rounded border p-4 text-sm">
      <header className="mb-3 flex flex-wrap items-baseline gap-2 border-b pb-2">
        <span className="font-mono text-base font-semibold">
          {version || empty("v0.0.0")}
        </span>
        {date ? (
          <span className="text-xs text-muted-foreground">{date}</span>
        ) : null}
      </header>
      {highlights ? (
        <p className="mb-3 text-xs text-muted-foreground">{highlights}</p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {RELEASE_BUCKETS.map((b) => {
          const items = (data[b.key] as string[]) ?? [];
          return (
            <div key={b.key}>
              <div
                className={cn(
                  "mb-1 text-[10px] font-semibold uppercase tracking-wide",
                  b.tone,
                )}
              >
                {b.label} ({items.length})
              </div>
              {items.length === 0 ? (
                <div className="text-xs text-muted-foreground/70">—</div>
              ) : (
                <ul className="space-y-0.5 text-xs">
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
    <div className="flex items-stretch gap-3 rounded border p-3 text-sm">
      <div
        className="size-16 shrink-0 rounded border"
        style={hex ? { backgroundColor: hex } : undefined}
        aria-hidden
      />
      <div className="flex-1 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold">{name || empty("Swatch")}</span>
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
    <div className="rounded border p-3 text-sm">
      <header className="mb-2 flex items-baseline gap-2 border-b pb-1.5">
        <span className="rounded bg-foreground px-1.5 py-0.5 font-mono text-[10px] text-background">
          STEP {step}
        </span>
        <span className="text-xs text-muted-foreground">
          {persona || empty("(persona)")}
        </span>
      </header>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="font-medium text-foreground">Action</dt>
        <dd className="text-muted-foreground">{action || empty("—")}</dd>
        <dt className="font-medium text-foreground">System</dt>
        <dd className="text-muted-foreground">{system || empty("—")}</dd>
        <dt className="font-medium text-foreground">Outcome</dt>
        <dd className="text-muted-foreground">{outcome || empty("—")}</dd>
        {painPoint ? (
          <>
            <dt className="font-medium text-red-600">Pain</dt>
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
  if (!code) return <div className="text-[11px] text-muted-foreground">—</div>;
  if (html) {
    return (
      <div
        className="overflow-x-auto rounded bg-muted/40 px-2 py-1.5 font-mono text-[11px] [&_pre]:bg-transparent [&_pre]:p-0"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <pre className="overflow-x-auto rounded bg-muted/40 px-2 py-1.5 font-mono text-[11px]">
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
    <div className="rounded border text-sm">
      <header className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
            METHOD_TONE[method] ?? METHOD_TONE.GET,
          )}
        >
          {method}
        </span>
        <code className="font-mono text-sm">{path || empty("/path")}</code>
        {auth ? (
          <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            🔒 {auth}
          </span>
        ) : null}
      </header>
      {summary ? (
        <p className="border-b px-3 py-2 text-xs text-muted-foreground">
          {summary}
        </p>
      ) : null}
      <div className="grid gap-3 p-3 md:grid-cols-2">
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Request
          </div>
          <HighlightedJson code={request} />
        </div>
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Response
          </div>
          <HighlightedJson code={response} />
        </div>
      </div>
      {errors.length > 0 ? (
        <div className="border-t px-3 py-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Errors
          </div>
          <ul className="space-y-0.5 text-xs">
            {errors.map((e, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: positional list.
              <li key={i} className="flex gap-2">
                <span className="font-mono font-semibold text-red-600">
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
