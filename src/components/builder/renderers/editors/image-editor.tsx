"use client";

import { Controller } from "react-hook-form";
import {
  EnumChips,
  Field,
  ImageRefField,
  NumberField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  imageRef: string;
  alt: string;
  caption: string;
  width?: number;
  height?: number;
  fit: "cover" | "contain";
};

const FIT = [
  { label: "Cover", value: "cover" as const },
  { label: "Contain", value: "contain" as const },
];

export const ImageEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<Values>("image", vm);
  const { register, handleSubmit, control } = form;
  const numberOpts = {
    setValueAs: (v: unknown) => (v === "" || v == null ? undefined : Number(v)),
  };
  return (
    <EditorShell
      title="Image"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <ImageRefField
        form={form}
        srcName="imageRef"
        altName="alt"
        captionName="caption"
      />
      <Field label="Width (px)">
        <NumberField min={1} {...register("width", numberOpts)} />
      </Field>
      <Field label="Height (px)">
        <NumberField min={1} {...register("height", numberOpts)} />
      </Field>
      <Field label="Fit">
        <Controller
          control={control}
          name="fit"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={FIT}
            />
          )}
        />
      </Field>
    </EditorShell>
  );
};
