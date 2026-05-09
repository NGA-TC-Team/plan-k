"use client";

import { Field, ImageRefField, NumberField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  imageRef: string;
  alt: string;
  caption: string;
  width?: number;
};

export const FigureEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<Values>("figure", vm);
  return (
    <EditorShell
      title="Figure"
      isPending={vm.isPending}
      onSubmit={form.handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <ImageRefField
        form={form}
        srcName="imageRef"
        altName="alt"
        captionName="caption"
      />
      <Field label="Width (px)" hint="Optional">
        <NumberField
          min={1}
          {...form.register("width", {
            setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
          })}
        />
      </Field>
    </EditorShell>
  );
};
