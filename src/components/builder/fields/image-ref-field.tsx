"use client";

import { ImageIcon, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { MediaPicker } from "@/components/builder/media/picker";
import { useMediaUrl } from "@/hooks/builder/use-media-url.hook";
import { cn } from "@/lib/utils";
import { Field } from "./field";
import { TextField } from "./text-field";

type Props<TFieldValues extends FieldValues> = {
  form: UseFormReturn<TFieldValues>;
  srcName: Path<TFieldValues>;
  altName: Path<TFieldValues>;
  captionName?: Path<TFieldValues>;
};

/**
 * Bundle of (src trigger, alt, optional caption) inputs.
 *
 * src field: click-to-open MediaPicker modal instead of a raw text input.
 * planId is sourced from the Next.js route param (:id) via useParams —
 * same pattern as block-shell.tsx. No props invasions needed.
 */
export function ImageRefField<TFieldValues extends FieldValues>({
  form,
  srcName,
  altName,
  captionName,
}: Props<TFieldValues>) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // planId comes from the /plan/[id] route — mirrors the block-shell.tsx pattern.
  const params = useParams();
  const planId = typeof params.id === "string" ? params.id : "";

  const currentRef = form.watch(srcName) as unknown as string | undefined;
  const resolvedUrl = useMediaUrl(currentRef);

  const handleSelect = (ref: string) => {
    form.setValue(srcName, ref as Parameters<typeof form.setValue>[1], {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handleClear = () => {
    form.setValue(srcName, "" as Parameters<typeof form.setValue>[1], {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  return (
    <div className="space-y-2">
      {/* src trigger row */}
      <div className="flex items-center gap-2">
        {/* Thumbnail preview */}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted">
          {resolvedUrl ? (
            // biome-ignore lint/performance/noImgElement: local /api/media/<id>/raw or raw URL — next/image not applicable.
            <img
              src={resolvedUrl}
              alt="preview"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="size-4 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={cn(
            "flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {currentRef ? (
            <span className="truncate text-foreground">
              {currentRef.startsWith("media:")
                ? currentRef
                : currentRef.length > 40
                  ? `${currentRef.slice(0, 40)}…`
                  : currentRef}
            </span>
          ) : (
            "Choose image…"
          )}
        </button>

        {/* Clear button — only shown when there is a value */}
        {currentRef ? (
          <button
            type="button"
            aria-label="Clear image"
            onClick={handleClear}
            className="shrink-0 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <Field label="Alt text" hint="Describe the image for screen readers">
        <TextField {...form.register(altName)} />
      </Field>
      {captionName ? (
        <Field label="Caption">
          <TextField {...form.register(captionName)} />
        </Field>
      ) : null}

      {/* Media picker modal — rendered lazily but always mounted when open */}
      {planId ? (
        <MediaPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          planId={planId}
          value={currentRef}
          onSelect={handleSelect}
        />
      ) : null}
    </div>
  );
}
