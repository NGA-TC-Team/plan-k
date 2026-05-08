"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type Props = {
  children: string;
  className?: string;
  /** Pass `false` for compact contexts (callout, blockquote) — drops vertical
   *  padding and shrinks list margins via Tailwind typography modifiers. */
  compact?: boolean;
};

const components: Components = {
  // Open links in new tab; React-Markdown defaults are otherwise fine.
  a: ({ children, href, ...rest }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="underline underline-offset-2"
      {...rest}
    >
      {children}
    </a>
  ),
};

/**
 * GitHub/Notion-style Markdown renderer for docs `markdown` fields.
 * Uses Tailwind Typography (`prose`) for the visual baseline and `remark-gfm`
 * for tables, strikethrough, autolinks, and task lists.
 *
 * Block-level docs blocks (`table`, `bullet-list`, etc.) keep their structured
 * editors and should not pass through this component — only free-form
 * markdown fields (paragraph/text, callout body, blockquote body) do.
 */
export function MarkdownView({ children, className, compact = false }: Props) {
  return (
    <div
      className={cn(
        "prose prose-sm prose-zinc max-w-none",
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-pre:my-2 prose-pre:bg-muted/40 prose-pre:text-foreground",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em]",
        "prose-table:my-2 prose-th:text-left prose-th:bg-muted/40",
        compact && "prose-p:my-1 prose-ul:my-1 prose-ol:my-1",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
