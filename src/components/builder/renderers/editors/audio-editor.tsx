"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type Resolver, useForm } from "react-hook-form";
import {
  AudioSchema,
  AUDIO_DEFAULTS,
  type AudioValues,
} from "@/components/builder/renderers/editors/schemas";
import { Field, TextField } from "@/components/builder/fields";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";

export const AudioEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useForm<AudioValues>({
    // biome-ignore lint/suspicious/noExplicitAny: AudioSchema .default() fields yield optional input type; cast to Resolver<T> recovers the concrete output type contract.
    resolver: zodResolver(AudioSchema) as unknown as Resolver<AudioValues>,
    defaultValues: {
      ...AUDIO_DEFAULTS,
      ...(vm.displayValue as Partial<AudioValues>),
    },
    mode: "onBlur",
  });
  const { register, handleSubmit } = form;
  useDraftSync(form.watch);

  return (
    <EditorShell
      title="Audio"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Source URL">
        <TextField {...register("src")} placeholder="https://…/audio.mp3" />
      </Field>
      <Field label="Title">
        <TextField {...register("title")} placeholder="Track title" />
      </Field>
      <Field label="Controls">
        <input
          type="checkbox"
          className="size-4 rounded-sm border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          {...register("controls")}
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
