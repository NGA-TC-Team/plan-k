"use client";

import { Controller } from "react-hook-form";
import {
  EnumChips,
  Field,
  SwitchField,
  TextField,
} from "@/components/builder/fields";
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
  variant: "primary" | "secondary" | "ghost" | "destructive";
  size: "sm" | "md" | "lg";
  action: Action;
  icon: string;
  disabled: boolean;
};

const VARIANT = [
  { label: "Primary", value: "primary" as const },
  { label: "Secondary", value: "secondary" as const },
  { label: "Ghost", value: "ghost" as const },
  { label: "Destructive", value: "destructive" as const },
];

const SIZE = [
  { label: "Sm", value: "sm" as const },
  { label: "Md", value: "md" as const },
  { label: "Lg", value: "lg" as const },
];

const ACTION_KIND = [
  { label: "None", value: "none" as const },
  { label: "Screen", value: "screen" as const },
  { label: "URL", value: "url" as const },
];

export const ButtonEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<Values>("button", vm);
  const { register, handleSubmit, control, watch, setValue } = form;
  const actionKind = (watch("action.kind") ?? "none") as ActionKind;
  return (
    <EditorShell
      title="Button"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Label">
        <TextField {...register("label")} />
      </Field>
      <Field label="Variant">
        <Controller
          control={control}
          name="variant"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={VARIANT}
            />
          )}
        />
      </Field>
      <Field label="Size">
        <Controller
          control={control}
          name="size"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={SIZE}
            />
          )}
        />
      </Field>
      <Field label="Action">
        <EnumChips
          value={actionKind}
          onChange={(value) => {
            // Replace the entire `action` value to keep the discriminated
            // union honest — RHF would otherwise leave stale leaf fields.
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
          <TextField
            {...register("action.href" as const)}
            placeholder="https://… or /path"
          />
        </Field>
      ) : null}
      <Field label="Icon" hint="lucide icon name">
        <TextField {...register("icon")} />
      </Field>
      <div className="flex items-center gap-2 text-xs">
        <SwitchField {...register("disabled")} id="button-disabled" />
        <label htmlFor="button-disabled">Disabled</label>
      </div>
    </EditorShell>
  );
};
