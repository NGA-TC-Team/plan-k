"use client";

import { Controller } from "react-hook-form";
import { EnumChips, Field, TextField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type ActionKind = "none" | "screen" | "url";
type Action =
  | { kind: "none" }
  | { kind: "screen"; screenId: string }
  | { kind: "url"; href: string };

type Values = {
  label: string;
  icon: string;
  position: "br" | "bl" | "center";
  action: Action;
};

const POSITION = [
  { label: "BR", value: "br" as const },
  { label: "BL", value: "bl" as const },
  { label: "Center", value: "center" as const },
];

const ACTION_KIND = [
  { label: "None", value: "none" as const },
  { label: "Screen", value: "screen" as const },
  { label: "URL", value: "url" as const },
];

export const FabEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<Values>("fab", vm);
  const { register, handleSubmit, control, watch, setValue } = form;
  const actionKind = (watch("action.kind") ?? "none") as ActionKind;
  return (
    <EditorShell
      title="FAB"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Label">
        <TextField {...register("label")} />
      </Field>
      <Field label="Icon">
        <TextField {...register("icon")} placeholder="lucide icon name" />
      </Field>
      <Field label="Position">
        <Controller
          control={control}
          name="position"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={POSITION}
            />
          )}
        />
      </Field>
      <Field label="Action">
        <EnumChips
          value={actionKind}
          onChange={(value) => {
            if (value === "none") setValue("action", { kind: "none" });
            else if (value === "screen")
              setValue("action", { kind: "screen", screenId: "" });
            else setValue("action", { kind: "url", href: "" });
          }}
          options={ACTION_KIND}
        />
      </Field>
      {actionKind === "screen" ? (
        <Field label="Target screen id">
          <TextField {...register("action.screenId" as const)} />
        </Field>
      ) : null}
      {actionKind === "url" ? (
        <Field label="Target URL">
          <TextField {...register("action.href" as const)} />
        </Field>
      ) : null}
    </EditorShell>
  );
};
