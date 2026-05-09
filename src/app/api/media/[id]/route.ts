import { NextResponse } from "next/server";
import { deleteMedia } from "@/services/third-party-facade/media-store";

export const runtime = "nodejs";

// DELETE /api/media/[id]
// Removes the media row and its associated file on disk.
// Returns 204 on success, 404 if the row did not exist.
// No GET on this route — raw bytes are at /api/media/[id]/raw (PR-1).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Reject obviously malformed ids before hitting the DB.
  if (!id || id.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing media id", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  let deleted: boolean;
  try {
    deleted = await deleteMedia(id);
  } catch {
    // deleteMedia can throw on unexpected DB or fs errors.
    // Do not surface raw error detail to the client.
    return NextResponse.json(
      { error: "Failed to delete media", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  if (!deleted) {
    return NextResponse.json(
      { error: "Media not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
