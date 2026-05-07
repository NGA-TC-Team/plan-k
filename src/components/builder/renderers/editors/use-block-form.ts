"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type DefaultValues,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
  useForm,
} from "react-hook-form";
import type { z } from "zod";
import { manifestFor } from "@/builder/blocks/registry";
import type { BlockKind } from "@/builder/types/entity";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { RendererProps } from "../types";

/**
 * Standard editor wiring shared by every dedicated editor: pull schema +
 * defaults from the manifest, seed RHF, hook draft sync. Per-editor markup
 * just uses `form.register` + `form.control`.
 *
 * The manifest schema is `z.ZodTypeAny` (the aggregate erases per-kind T).
 * We re-cast through `Resolver<T>` here so each editor can pass its own
 * concrete `Values` type without per-call casts.
 */
export function useBlockForm<T extends FieldValues>(
  kind: BlockKind,
  vm: RendererProps["vm"],
): UseFormReturn<T> {
  const manifest = manifestFor(kind);
  const resolver = zodResolver(
    // biome-ignore lint/suspicious/noExplicitAny: schema is heterogeneously typed across kinds; the editor's `T` parameter recovers the contract at the call site.
    manifest.schema as unknown as z.ZodType<any, FieldValues>,
  ) as Resolver<T>;
  const form = useForm<T>({
    resolver,
    defaultValues: {
      ...(manifest.defaults as object),
      ...(vm.displayValue as object),
    } as DefaultValues<T>,
    mode: "onBlur",
  });
  useDraftSync(form.watch);
  return form;
}
