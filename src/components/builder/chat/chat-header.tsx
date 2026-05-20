"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { chatApi } from "@/data/chat/api";
import { useChatStore } from "@/services/stores";
import { ConfirmDestructiveDialog } from "../confirm-destructive-dialog";

const EMPTY_SESSIONS: never[] = [];

export function ChatHeader() {
  const planId = useChatStore((s) => s.planId);
  const sessions = useChatStore((s) =>
    planId ? (s.sessionsByPlanId[planId] ?? EMPTY_SESSIONS) : EMPTY_SESSIONS,
  );
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const upsertSession = useChatStore((s) => s.upsertSession);
  const removeSession = useChatStore((s) => s.removeSession);
  const selectSession = useChatStore((s) => s.selectSession);
  const current = sessions.find((s) => s.id === currentSessionId);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleNew = async () => {
    if (!planId) return;
    const session = await chatApi.createSession({ planId });
    upsertSession(session);
    selectSession(session.id);
  };

  const handleDeleteConfirmed = async () => {
    if (!current) return;
    await chatApi.deleteSession(current.id);
    removeSession(current.id);
    const next = sessions.find((s) => s.id !== current.id);
    selectSession(next?.id ?? null);
  };

  const handleDelete = () => {
    if (!current) return;
    setDeleteDialogOpen(true);
  };

  const handleModeToggle = async () => {
    if (!current) return;
    const nextMode = current.mode === "auto" ? "approval" : "auto";
    const updated = await chatApi.patchSession(current.id, { mode: nextMode });
    upsertSession(updated);
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5 border-b px-3 py-2">
      <select
        aria-label="Active session"
        className="min-w-0 flex-1 truncate rounded-md border bg-background px-1.5 py-1 text-xs"
        value={currentSessionId ?? ""}
        onChange={(e) => selectSession(e.target.value || null)}
      >
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title} {s.mode === "approval" ? "(approval)" : ""}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant={current?.mode === "approval" ? "default" : "outline"}
        className="h-7 px-2 text-caption"
        onClick={handleModeToggle}
        disabled={!current}
        title="Toggle Auto / Approval"
      >
        {current?.mode === "approval" ? "Approval" : "Auto"}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="size-7"
        onClick={handleNew}
        title="New chat"
      >
        <Plus className="size-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="size-7 text-destructive hover:text-destructive"
        onClick={handleDelete}
        disabled={!current}
        title="Delete chat"
      >
        <Trash2 className="size-3.5" />
      </Button>
      <ConfirmDestructiveDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="채팅 세션 삭제"
        description="이 채팅 세션을 영구 삭제합니다. 되돌릴 수 없습니다."
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
}
