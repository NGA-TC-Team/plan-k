"use client";

import { Check, Copy } from "lucide-react";
import { type ComponentProps, type ReactNode, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre: ({ children, ...props }) => (
            <CodeBlock {...props}>{children}</CodeBlock>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({
  children,
  ...rest
}: ComponentProps<"pre"> & { children?: ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    const text = ref.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard may be unavailable
    }
  };
  return (
    <div className="relative my-2 rounded-md border bg-muted/40">
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy code"
        className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 text-[9px] text-muted-foreground transition-colors hover:text-foreground"
      >
        {copied ? (
          <Check className="size-2.5" />
        ) : (
          <Copy className="size-2.5" />
        )}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
      <pre ref={ref} className="overflow-x-auto p-2 text-[11px]" {...rest}>
        {children}
      </pre>
    </div>
  );
}
