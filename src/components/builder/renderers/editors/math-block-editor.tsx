"use client";

import { Field, TextAreaField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = { tex: string };

export const MathBlockEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit } = useBlockForm<Values>("math-block", vm);
  return (
    <EditorShell
      title="Math formula"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="TeX" hint="KaTeX display-mode">
        <TextAreaField
          rows={5}
          {...register("tex")}
          placeholder="\int_0^\infty f(x)\,dx"
          className="font-mono"
        />
      </Field>
    </EditorShell>
  );
};
