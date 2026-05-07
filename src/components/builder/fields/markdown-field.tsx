"use client";

import { forwardRef } from "react";
import { Textarea } from "@/components/ui/textarea";

type Props = React.ComponentProps<typeof Textarea>;

/**
 * Markdown editor stub. Currently a plain textarea; this component is the
 * stable swap-point for a richer markdown editor (e.g. lexical, prosemirror)
 * later without touching every block editor that uses it.
 */
export const MarkdownField = forwardRef<HTMLTextAreaElement, Props>(
  function MarkdownField({ rows = 6, className, ...props }, ref) {
    return (
      <Textarea
        ref={ref}
        rows={rows}
        className={className}
        placeholder="Markdown / freeform"
        {...props}
      />
    );
  },
);
