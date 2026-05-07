"use client";

import { z } from "zod";
import { manifestFor } from "@/builder/blocks/registry";
import type { BlockKind } from "@/builder/types/entity";

type Props = {
  kind: BlockKind;
  data: Record<string, unknown>;
};

/**
 * Auto-generated readonly view for a block's data, driven by its manifest's
 * zod schema. Keeps the inspect panel in sync with editor changes without
 * a hand-maintained second renderer per block kind.
 *
 * Field traversal is shallow: arrays show length + first three previews,
 * nested objects render as `{n keys}`. Stage 6 swaps individual block kinds
 * to richer detail renderers — until then this gives every kind a usable
 * inspect view with zero per-kind code.
 */
export function PropertyList({ kind, data }: Props) {
  const manifest = manifestFor(kind);
  const shape = unwrapShape(manifest.schema);
  const keys = shape ? Object.keys(shape) : Object.keys(data);

  if (keys.length === 0) {
    return <p className="text-xs text-muted-foreground">No properties.</p>;
  }

  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 text-xs">
      {keys.map((key) => (
        <PropertyRow
          key={key}
          name={key}
          value={(data as Record<string, unknown>)[key]}
        />
      ))}
    </dl>
  );
}

function PropertyRow({ name, value }: { name: string; value: unknown }) {
  return (
    <>
      <dt className="font-medium text-muted-foreground capitalize">
        {humanize(name)}
      </dt>
      <dd className="min-w-0 text-foreground">
        <Value value={value} />
      </dd>
    </>
  );
}

function Value({ value }: { value: unknown }) {
  if (value === undefined || value === null || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  if (typeof value === "string") {
    return (
      <span className="line-clamp-3 break-words whitespace-pre-wrap">
        {value}
      </span>
    );
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return <span>{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground">empty</span>;
    }
    const preview = value.slice(0, 3).map((item, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: stable preview list, never reordered.
      <li key={i} className="truncate">
        {previewLine(item)}
      </li>
    ));
    return (
      <div className="space-y-0.5">
        <span className="text-muted-foreground">{value.length} items</span>
        <ul className="ml-3 list-disc">{preview}</ul>
      </div>
    );
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    return <span className="text-muted-foreground">{keys.length} keys</span>;
  }
  return <span>{String(value)}</span>;
}

function previewLine(item: unknown): string {
  if (item === null || item === undefined) return "—";
  if (typeof item === "string") return item;
  if (typeof item === "number" || typeof item === "boolean")
    return String(item);
  if (typeof item === "object") {
    const obj = item as Record<string, unknown>;
    const candidates = ["title", "label", "name", "text", "term", "risk"];
    for (const k of candidates) {
      const v = obj[k];
      if (typeof v === "string" && v.length > 0) return v;
    }
    return JSON.stringify(item);
  }
  return String(item);
}

function humanize(key: string): string {
  return key.replace(/[-_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
}

/**
 * Unwrap a zod schema to its top-level field shape, peeling effects/defaults.
 * Returns null when the schema is not a ZodObject we can introspect.
 */
function unwrapShape(
  schema: z.ZodTypeAny,
): Record<string, z.ZodTypeAny> | null {
  let s: z.ZodTypeAny = schema;
  // Peel `.default()` and `.optional()` wrappers a few levels deep.
  for (let i = 0; i < 5; i++) {
    if (s instanceof z.ZodObject) {
      return s.shape as Record<string, z.ZodTypeAny>;
    }
    // biome-ignore lint/suspicious/noExplicitAny: zod's internal _def shape varies across wrappers.
    const inner = (s as any)?._def?.innerType;
    if (!inner) break;
    s = inner;
  }
  return null;
}
