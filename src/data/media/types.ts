// Camel-case mirror of the `media` DB row (MediaRow from @/db/schema).
// Keep in sync with the schema definition in src/db/schema.ts.
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
};

export type UploadMediaInput = {
  planId: string;
  file: File;
};
