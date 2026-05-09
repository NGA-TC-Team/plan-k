// Camel-case mirror of the `media` DB row (MediaRow from @/db/schema).
// Keep in sync with the schema definition in src/db/schema.ts.
// `useCount` is a computed field (not a DB column) — the number of refs rows
// that point to this media item (kind="media", dstId="media:<id>").
export type MediaItem = {
  id: string;
  planId: string;
  kind: "image" | "video" | "audio" | "doc" | "other";
  mimeType: string;
  originalName: string;
  storagePath: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  sourceUrl: string | null;
  sourceChatAttachmentId: string | null;
  createdAt: string; // ISO string from JSON serialisation of timestamp_ms
  useCount: number; // number of blocks that currently reference this media item
};

export type UploadMediaInput = {
  planId: string;
  file: File;
};
