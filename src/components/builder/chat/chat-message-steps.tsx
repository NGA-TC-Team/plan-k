"use client";

import {
  Brain,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { ChatMessageStep } from "@/services/stores";

// Renders the assistant's intermediate progress (thinking, tool calls, tool
// results) as a collapsible block above the final text. Auto-expanded while
// streaming and auto-collapses on completion. User toggles override the
// automatic behavior so the panel doesn't snap closed mid-read.

export function ChatMessageSteps({
  steps,
  streaming,
}: {
  steps: ChatMessageStep[];
  streaming: boolean;
}) {
  const [userOverride, setUserOverride] = useState(false);
  const [expanded, setExpanded] = useState(streaming);

  useEffect(() => {
    if (userOverride) return;
    setExpanded(streaming);
  }, [streaming, userOverride]);

  if (steps.length === 0) return null;

  const onToggle = () => {
    setUserOverride(true);
    setExpanded((v) => !v);
  };

  return (
    <div className="mb-2 rounded-md border border-border/60 bg-muted/30 text-caption">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1 px-2 py-1.5 text-left text-muted-foreground hover:text-foreground"
      >
        {expanded ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        <span className="font-medium">
          {steps.length} {steps.length === 1 ? "step" : "steps"}
        </span>
        {streaming ? (
          <span className="ml-1 inline-flex items-center gap-1 text-caption text-primary">
            <span className="size-1 animate-pulse rounded-full bg-primary" />
            running
          </span>
        ) : null}
      </button>
      {expanded ? (
        <ol className="space-y-1.5 border-t border-border/60 px-2 py-1.5">
          {steps.map((step, idx) => (
            <StepRow key={stepKey(step, idx)} step={step} />
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function StepRow({ step }: { step: ChatMessageStep }) {
  if (step.kind === "thinking") {
    return (
      <li className="flex gap-1.5">
        <Brain className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
        <span className="line-clamp-3 italic text-muted-foreground">
          {step.text}
        </span>
      </li>
    );
  }
  if (step.kind === "tool_call") {
    const inputSummary = summarizeInput(step.input);
    return (
      <li className="flex gap-1.5">
        <Wrench className="mt-0.5 size-3 shrink-0 text-primary" />
        <span className="break-all text-foreground">
          <span className="font-mono font-medium">{step.name}</span>
          {inputSummary ? (
            <span className="text-muted-foreground"> ({inputSummary})</span>
          ) : null}
        </span>
      </li>
    );
  }
  // tool_result
  const Icon = step.ok ? CircleCheck : CircleAlert;
  return (
    <li className="flex gap-1.5">
      <Icon
        className={cn(
          "mt-0.5 size-3 shrink-0",
          step.ok ? "text-success" : "text-destructive",
        )}
      />
      <span className="line-clamp-2 text-muted-foreground">
        {step.summary || (step.ok ? "ok" : "error")}
      </span>
    </li>
  );
}

function stepKey(step: ChatMessageStep, idx: number): string {
  if (step.kind === "tool_call") return `call:${step.callId}`;
  if (step.kind === "tool_result") return `result:${step.callId}`;
  // thinking blocks are append-only; index is stable for the lifetime of the message
  return `think:${idx}`;
}

function summarizeInput(input: unknown): string {
  if (input == null) return "";
  if (typeof input === "string") return input.slice(0, 80);
  try {
    const json = JSON.stringify(input);
    return json.length > 80 ? `${json.slice(0, 77)}…` : json;
  } catch {
    return "";
  }
}
