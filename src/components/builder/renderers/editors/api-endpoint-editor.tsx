"use client";

import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray } from "react-hook-form";
import {
  EnumChips,
  Field,
  NumberField,
  TextAreaField,
  TextField,
} from "@/components/builder/fields";
import { Button } from "@/components/ui/button";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

const METHOD_OPTIONS = [
  { label: "GET", value: "GET" as const },
  { label: "POST", value: "POST" as const },
  { label: "PUT", value: "PUT" as const },
  { label: "PATCH", value: "PATCH" as const },
  { label: "DELETE", value: "DELETE" as const },
];

type Values = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  auth: string;
  request: string;
  response: string;
  errors: { status: number; reason: string }[];
};

export const ApiEndpointEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<Values>("api-endpoint", vm);
  const { register, handleSubmit, control } = form;
  const errorArray = useFieldArray({
    control,
    name: "errors",
  });

  return (
    <EditorShell
      title="API endpoint"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Method">
        <Controller
          control={control}
          name="method"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={METHOD_OPTIONS}
            />
          )}
        />
      </Field>
      <Field label="Path">
        <TextField
          {...register("path")}
          placeholder="/v1/orders/:id"
          className="font-mono"
        />
      </Field>
      <Field label="Summary">
        <TextField
          {...register("summary")}
          placeholder="Brief description of the endpoint"
        />
      </Field>
      <Field label="Auth">
        <TextField {...register("auth")} placeholder="Bearer token / API key" />
      </Field>
      <Field label="Request example" hint="JSON, body, or query string">
        <TextAreaField
          rows={5}
          {...register("request")}
          className="font-mono text-xs"
          placeholder={'{ "id": "uuid" }'}
        />
      </Field>
      <Field label="Response example">
        <TextAreaField
          rows={5}
          {...register("response")}
          className="font-mono text-xs"
          placeholder={'{ "ok": true }'}
        />
      </Field>
      <Field label="Errors">
        <div className="space-y-1">
          {errorArray.fields.map((f, i) => (
            <div key={f.id} className="flex items-center gap-1">
              <NumberField
                {...register(`errors.${i}.status` as const, {
                  valueAsNumber: true,
                })}
                min={100}
                max={599}
                className="w-20"
              />
              <TextField
                {...register(`errors.${i}.reason` as const)}
                placeholder="Reason"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => errorArray.remove(i)}
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => errorArray.append({ status: 400, reason: "" })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add error
          </Button>
        </div>
      </Field>
    </EditorShell>
  );
};
