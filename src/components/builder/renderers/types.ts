import type { ReactNode } from "react";
import type { BlockViewModel } from "@/builder/projection";

export type BlockHandlers = {
  onSelect: () => void;
  onBeginEdit: () => void;
  onCancelEdit: () => void;
  onCommitEdit: () => void;
  onDelete: () => void;
};

export type RendererProps = {
  vm: BlockViewModel;
  handlers: BlockHandlers;
};

export type BlockRenderer = (props: RendererProps) => ReactNode;
