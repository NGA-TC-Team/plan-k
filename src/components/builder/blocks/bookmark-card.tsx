"use client";

import { ExternalLink, Globe, Link } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BlockEntity } from "@/builder/types/entity";
import { useBookmarkPreviewQuery } from "@/data/bookmarks";
import { useBuilderDispatch } from "@/hooks/builder/use-builder-store.hook";

type Props = {
  block: BlockEntity;
};

type ContextMenuPos = { x: number; y: number } | null;

/**
 * Inline renderer for `link-card` blocks.
 *
 * - Left-click → opens URL in a new tab (noopener,noreferrer).
 * - Right-click → custom dropdown with "주소 복사" and "새 탭에서 열기".
 * - On mount (when title is empty and url is present), fires
 *   useBookmarkPreviewQuery and commits the result via UPDATE_BLOCK once.
 *
 * Visual design mirrors LinkCardDetail from extra.tsx:234.
 */
export function BookmarkCard({ block }: Props) {
  const dispatch = useBuilderDispatch();
  const url = (block.data.url as string) ?? "";
  const title = (block.data.title as string) ?? "";
  const description = (block.data.description as string) ?? "";
  const faviconUrl = (block.data.faviconUrl as string) ?? "";

  // Context menu position — null = closed.
  const [menuPos, setMenuPos] = useState<ContextMenuPos>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fetch OG meta only when url is present and title is empty (not yet hydrated).
  const shouldFetch = !!url && !title;
  const { data: preview } = useBookmarkPreviewQuery(shouldFetch ? url : "");

  // Commit fetched preview into the block — runs at most once per block id.
  const committedRef = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-shot — only runs when preview arrives for the first time; block.id and dispatch are stable within a mounted component
  useEffect(() => {
    if (!preview || committedRef.current || !shouldFetch) return;
    committedRef.current = true;
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: block.id,
      patch: {
        data: {
          ...block.data,
          title: preview.title,
          description: preview.description,
          faviconUrl: preview.faviconUrl,
        },
      },
    });
  }, [preview]);

  // Close context menu on outside click.
  useEffect(() => {
    if (!menuPos) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        menuRef.current &&
        e.target instanceof Node &&
        menuRef.current.contains(e.target)
      )
        return;
      setMenuPos(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuPos]);

  const openUrl = () => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  const copyUrl = async () => {
    setMenuPos(null);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API may be unavailable in certain environments — silent fail.
    }
  };

  // Resolve display values (use fetched preview if block data is empty).
  const displayTitle = title || preview?.title || "";
  const displayDescription = description || preview?.description || "";
  const displayFavicon = faviconUrl || preview?.faviconUrl || "";

  return (
    <div className="relative">
      {/* biome-ignore lint/a11y/useSemanticElements: <a> would conflict with right-click context menu behavior; keyboard handler is provided via onKeyDown */}
      <div
        role="link"
        tabIndex={0}
        onClick={openUrl}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openUrl();
          }
        }}
        onContextMenu={handleContextMenu}
        className="flex cursor-pointer items-start gap-3 rounded border p-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Favicon or fallback globe icon */}
        <div className="mt-0.5 flex-shrink-0">
          {displayFavicon ? (
            // biome-ignore lint/performance/noImgElement: tiny external favicon, no Next Image needed
            <img
              src={displayFavicon}
              alt=""
              className="h-4 w-4 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Globe className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Text content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium leading-snug">
              {displayTitle || (
                <span className="italic text-muted-foreground">
                  Untitled link
                </span>
              )}
            </span>
            <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" />
          </div>
          {displayDescription ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {displayDescription}
            </p>
          ) : null}
        </div>

        {/* Truncated URL */}
        {url ? (
          <span
            className="ml-2 hidden flex-shrink-0 truncate text-[10px] text-muted-foreground sm:block"
            style={{ maxWidth: "12rem" }}
          >
            {url}
          </span>
        ) : null}
      </div>

      {/* Context menu */}
      {menuPos ? (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onClick={copyUrl}
          >
            <Link className="h-3.5 w-3.5" />
            주소 복사
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => {
              setMenuPos(null);
              openUrl();
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />새 탭에서 열기
          </button>
        </div>
      ) : null}
    </div>
  );
}
