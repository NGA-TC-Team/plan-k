"use client";

import { File, FileAudio, FileText, FileVideo, ImageIcon } from "lucide-react";
import type { MediaItem } from "@/data/media/types";
import { useMediaUrl } from "@/hooks/builder/use-media-url.hook";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  selected?: boolean;
  onClick?: () => void;
};

/**
 * 1:1 aspect-ratio thumbnail card for a single MediaItem.
 *
 * - image kind  → resolved URL via useMediaUrl + <img>
 * - video/audio/doc/other → lucide fallback icon (no src attempt)
 * - selected → ring-2 ring-primary highlight
 * - title attr → "<originalName> (<KB> KB)"
 */
export function MediaThumb({ media, selected, onClick }: Props) {
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
