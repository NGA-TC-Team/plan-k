"use client";

import { File, FileAudio, FileText, FileVideo, ImageIcon } from "lucide-react";
import type React from "react";
import type { MediaItem } from "@/data/media/types";
import { useMediaUrl } from "@/hooks/builder/use-media-url.hook";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  selected?: boolean;
  onClick?: () => void;
  /** Number of blocks that currently reference this media item. Omit or 0 = no badge. */
  count?: number;
  /**
   * Optional slot for the count badge area.
   * When provided, replaces the default <span> badge so the caller can inject
   * a popover trigger (or any interactive element) without coupling thumb to
   * the popover implementation.
   * Rendered only when count > 0 AND countBadge is defined.
   * If omitted, falls back to the built-in read-only <span> badge.
   */
  countBadge?: React.ReactNode;
};

/**
 * 1:1 aspect-ratio thumbnail card for a single MediaItem.
 *
 * - image kind  → resolved URL via useMediaUrl + <img>
 * - video/audio/doc/other → lucide fallback icon (no src attempt)
 * - selected → ring-2 ring-primary highlight
 * - count > 0 → small badge at bottom-right showing number of block usages
 * - title attr → "<originalName> (<KB> KB)"
 */
export function MediaThumb({
  media,
  selected,
  onClick,
  count,
  countBadge,
}: Props) {
  const url = useMediaUrl(`media:${media.id}`);
  const kb = Math.round(media.sizeBytes / 1024);
  const titleAttr = `${media.originalName} (${kb} KB)`;

  return (
    <button
      type="button"
      title={titleAttr}
      onClick={onClick}
      className={cn(
        "group relative aspect-square w-full overflow-hidden rounded-md border bg-muted transition-all hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "ring-2 ring-primary border-primary",
      )}
    >
      {media.kind === "image" && url ? (
        // biome-ignore lint/performance/noImgElement: thumbnails are always local /api/media/<id>/raw — next/image optimization is out of scope for local-only product.
        <img
          src={url}
          alt={media.originalName}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <FallbackIcon kind={media.kind} />
      )}
      {selected && (
        <div className="absolute inset-0 bg-primary/10" aria-hidden />
      )}
      {typeof count === "number" && count > 0 && (
        // Slot: if caller provides countBadge (e.g. a popover trigger), render
        // it; otherwise fall back to the read-only <span>.
        // stopPropagation must be handled by the injected element if needed.
        <div className="absolute bottom-1 right-1">
          {countBadge !== undefined ? (
            countBadge
          ) : (
            <span
              title={`Used in ${count} block${count === 1 ? "" : "s"}`}
              className="rounded bg-black/60 px-1 py-0.5 text-caption font-medium leading-none text-white"
            >
              {count}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function FallbackIcon({ kind }: { kind: MediaItem["kind"] }) {
  const Icon =
    kind === "video"
      ? FileVideo
      : kind === "audio"
        ? FileAudio
        : kind === "doc"
          ? FileText
          : kind === "image"
            ? ImageIcon
            : File;

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Icon className="size-8 text-muted-foreground/60" />
    </div>
  );
}
