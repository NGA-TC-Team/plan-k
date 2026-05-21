"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, type Resolver, useForm } from "react-hook-form";
import {
  VideoSchema,
  VIDEO_DEFAULTS,
  type VideoValues,
} from "@/components/builder/renderers/editors/schemas";
import { EnumChips, Field, TextField } from "@/components/builder/fields";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";

const ASPECT_OPTIONS = [
  { label: "16:9", value: "16:9" as const },
  { label: "4:3", value: "4:3" as const },
  { label: "1:1", value: "1:1" as const },
  { label: "Auto", value: "auto" as const },
];

export const VideoEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useForm<VideoValues>({
    // biome-ignore lint/suspicious/noExplicitAny: VideoSchema .default() fields yield optional input type; cast to Resolver<T> recovers the concrete output type contract.
    resolver: zodResolver(VideoSchema) as unknown as Resolver<VideoValues>,
    defaultValues: {
      ...VIDEO_DEFAULTS,
      ...(vm.displayValue as Partial<VideoValues>),
    },
    mode: "onBlur",
  });
  const { register, handleSubmit, control } = form;
  useDraftSync(form.watch);

  return (
    <EditorShell
      title="Video"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Source URL">
        <TextField {...register("src")} placeholder="https://…/video.mp4" />
      </Field>
      <Field label="Poster image URL">
        <TextField {...register("poster")} placeholder="https://…/poster.jpg" />
      </Field>
      <Field label="Caption">
        <TextField {...register("caption")} placeholder="Video caption" />
      </Field>
      <Field label="Aspect ratio">
        <Controller
          control={control}
          name="aspect"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={ASPECT_OPTIONS}
            />
          )}
        />
      </Field>
      <Field label="Controls">
        <input
          type="checkbox"
          className="size-4 rounded-sm border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          {...register("controls")}
        />
      </Field>
      <Field label="Autoplay">
        <input
          type="checkbox"
          className="size-4 rounded-sm border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          {...register("autoplay")}
        />
      </Field>
      <Field label="Loop">
        <input
          type="checkbox"
          className="size-4 rounded-sm border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          {...register("loop")}
        />
      </Field>
    </EditorShell>
  );
};
