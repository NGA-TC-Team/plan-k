"use client";

import { ImageIcon, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUploadMediaMutation } from "@/data/media/mutations";
import { useMediaListQuery } from "@/data/media/queries";
import { MediaThumb } from "./thumb";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  /** Current ref value — "media:<id>" or raw URL or undefined */
  value?: string;
  /** Called with "media:<id>" when the user selects or uploads */
  onSelect: (ref: string) => void;
};

export function MediaPicker({
  open,
  onOpenChange,
  planId,
  value,
  onSelect,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-0 p-0"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle>Media library</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="library" className="flex min-h-0 flex-1 flex-col">
          <TabsList
            variant="line"
            className="shrink-0 rounded-none border-b px-4"
          >
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="library" className="min-h-0 flex-1">
            <LibraryTab
              planId={planId}
              value={value}
              onSelect={(ref) => {
                onSelect(ref);
                onOpenChange(false);
              }}
            />
          </TabsContent>
          <TabsContent value="upload" className="min-h-0 flex-1 p-4">
            <UploadTab
              planId={planId}
              onSelect={(ref) => {
                onSelect(ref);
                onOpenChange(false);
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Library tab ─────────────────────────────────────────────────────────────

function LibraryTab({
  planId,
  value,
  onSelect,
}: {
  planId: string;
  value?: string;
  onSelect: (ref: string) => void;
}) {
  const { data: items, isLoading, isError, error } = useMediaListQuery(planId);
  // v1: image-only filter. Other kinds shown in future phases.
  const images = (items ?? []).filter((m) => m.kind === "image");

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-destructive">
        <span>Failed to load media library.</span>
        <span className="text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "Unknown error"}
        </span>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <ImageIcon className="size-8 opacity-40" />
        <p>No images yet.</p>
        <p className="text-xs">
          Switch to the{" "}
          <span className="font-medium text-foreground">Upload</span> tab to add
          your first image.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full max-h-[55vh]">
      <div className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4">
        {images.map((item) => (
          <MediaThumb
            key={item.id}
            media={item}
            selected={value === `media:${item.id}`}
            onClick={() => onSelect(`media:${item.id}`)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

// ─── Upload tab ───────────────────────────────────────────────────────────────

function UploadTab({
  planId,
  onSelect,
}: {
  planId: string;
  onSelect: (ref: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const upload = useUploadMediaMutation(planId);

  const handleFile = (file: File) => {
    setUploadError(null);
    upload.mutate(file, {
      onSuccess: (res) => {
        toast.success(`Uploaded "${res.media.originalName}"`);
        onSelect(`media:${res.media.id}`);
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setUploadError(msg);
      },
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input value so the same file can be re-selected after an error.
    e.target.value = "";
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <button
        type="button"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
        className="flex h-36 w-full max-w-sm cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50"
      >
        {upload.isPending ? (
          <Loader2 className="size-8 animate-spin" />
        ) : (
          <Upload className="size-8" />
        )}
        <span>
          {upload.isPending ? "Uploading…" : "Click to choose an image"}
        </span>
        <span className="text-xs opacity-60">PNG, JPG, GIF, WebP, etc.</span>
      </button>

      {/* Hidden native file input — client-side size checking deferred to server */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleChange}
        disabled={upload.isPending}
      />

      {uploadError && (
        <p className="max-w-sm text-center text-sm text-destructive">
          {uploadError}
        </p>
      )}
    </div>
  );
}
