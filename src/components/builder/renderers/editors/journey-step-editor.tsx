"use client";

import {
  Field,
  NumberField,
  TextAreaField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  step: number;
  persona: string;
  action: string;
  system: string;
  outcome: string;
  painPoint: string;
};

export const JourneyStepEditor: BlockRenderer = ({ vm, handlers }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useBlockForm<Values>("journey-step", vm);

  return (
    <EditorShell
      title="Journey step"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <div className="flex gap-2">
        <Field label="Step #" className="w-20">
          <NumberField {...register("step", { valueAsNumber: true })} min={1} />
        </Field>
        <Field label="Persona" className="flex-1">
          <TextField {...register("persona")} placeholder="Owner / Admin / …" />
        </Field>
      </div>
      <Field
        label="Action"
        error={errors.action?.message}
        hint="What the user does"
      >
        <TextAreaField rows={2} {...register("action")} />
      </Field>
      <Field label="System response" hint="What the product does back">
        <TextAreaField rows={2} {...register("system")} />
      </Field>
      <Field label="Outcome" hint="State change after this step">
        <TextAreaField rows={2} {...register("outcome")} />
      </Field>
      <Field label="Pain point" hint="What frustrates the user here (optional)">
        <TextAreaField rows={2} {...register("painPoint")} />
      </Field>
    </EditorShell>
  );
};
