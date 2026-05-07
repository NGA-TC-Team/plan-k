"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { HERO_DEFAULTS, HeroSchema, type HeroValues } from "./schemas";

export const HeroEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit, watch } = useForm<HeroValues>({
    resolver: zodResolver(HeroSchema),
    defaultValues: {
      ...HERO_DEFAULTS,
      ...(vm.displayValue as Partial<HeroValues>),
    },
  });
  useDraftSync(watch);
  return (
    <EditorShell
      title="Hero"
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <div className="block space-y-1 text-xs">
        <span className="font-medium">Title</span>
        <Input {...register("title")} placeholder="Hero title" />
      </div>
      <div className="block space-y-1 text-xs">
        <span className="font-medium">Subtitle</span>
        <Textarea
          rows={2}
          {...register("subtitle")}
          placeholder="Optional subtitle"
        />
      </div>
      <div className="block space-y-1 text-xs">
        <span className="font-medium">CTA label</span>
        <Input {...register("cta")} placeholder="Get started" />
      </div>
    </EditorShell>
  );
};
