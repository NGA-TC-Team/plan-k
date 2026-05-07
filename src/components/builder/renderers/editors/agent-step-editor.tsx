"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { useBuilderDispatch } from "@/hooks/builder/use-builder-store.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { AgentStepSchema, type AgentStepValues } from "./schemas";

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export const AgentStepEditor: BlockRenderer = ({ vm, handlers }) => {
  const dispatch = useBuilderDispatch();
  const initial = vm.displayValue as { role?: string; spec?: unknown };
  const { register, handleSubmit, watch, setError, formState } =
    useForm<AgentStepValues>({
      resolver: zodResolver(AgentStepSchema),
      defaultValues: {
        role: (initial.role as AgentStepValues["role"] | undefined) ?? "input",
        specJson: safeStringify(initial.spec),
      },
    });

  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    const sub = watch((value) => {
      const parsed = (() => {
        try {
          return {
            ok: true as const,
            data: JSON.parse(value.specJson ?? "{}"),
          };
        } catch (err) {
          return { ok: false as const, error: String(err) };
        }
      })();
      if (parsed.ok) {
        setParseError(null);
        dispatch({
          type: "CHANGE_DRAFT",
          value: { role: value.role, spec: parsed.data },
        });
      } else {
        setParseError(parsed.error);
      }
    });
    return () => sub.unsubscribe();
  }, [watch, dispatch]);

  return (
    <EditorShell
      title="Agent step"
      onSubmit={handleSubmit(() => {
        if (parseError) {
          setError("specJson", { message: parseError });
          return;
        }
        handlers.onCommitEdit();
      })}
      onCancel={handlers.onCancelEdit}
    >
      <div className="block space-y-1 text-xs">
        <span className="font-medium">Role</span>
        <select
          {...register("role")}
          className="w-full rounded border bg-background px-2 py-1 text-sm"
        >
          <option value="input">input</option>
          <option value="tool">tool</option>
          <option value="llm">llm</option>
          <option value="output">output</option>
        </select>
      </div>
      <div className="block space-y-1 text-xs">
        <span className="font-medium">Spec (JSON)</span>
        <Textarea
          rows={10}
          className="font-mono text-xs"
          {...register("specJson")}
        />
        {parseError ? (
          <span className="text-xs text-destructive">
            Invalid JSON: {parseError}
          </span>
        ) : null}
        {formState.errors.specJson ? (
          <span className="text-xs text-destructive">
            {formState.errors.specJson.message}
          </span>
        ) : null}
      </div>
    </EditorShell>
  );
};
