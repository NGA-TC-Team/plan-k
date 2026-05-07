"use client";

import { ImageIcon } from "lucide-react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { Field } from "./field";
import { TextField } from "./text-field";

type Props<TFieldValues extends FieldValues> = {
  form: UseFormReturn<TFieldValues>;
  srcName: Path<TFieldValues>;
  altName: Path<TFieldValues>;
  captionName?: Path<TFieldValues>;
};

/**
 * Bundle of (src, alt, optional caption) inputs with a tiny preview thumb.
 * No file upload — URLs only, per P6 non-goals.
 */
export function ImageRefField<TFieldValues extends FieldValues>({
  form,
  srcName,
  altName,
  captionName,
}: Props<TFieldValues>) {
  const src = form.watch(srcName) as unknown as string | undefined;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted">
          {src ? (
            // biome-ignore lint/performance/noImgElement: arbitrary remote URLs; next/image's loader configuration is out of scope here.
            <img
              src={src}
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
        <div className="flex-1">
          <TextField
            placeholder="https://… image URL"
            {...form.register(srcName)}
          />
        </div>
      </div>
      <Field label="Alt text" hint="Describe the image for screen readers">
        <TextField {...form.register(altName)} />
      </Field>
      {captionName ? (
        <Field label="Caption">
          <TextField {...form.register(captionName)} />
        </Field>
      ) : null}
    </div>
  );
}
