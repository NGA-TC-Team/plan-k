// Centralized keymap registry. Stays in sync with `decide-shortcut.ts` +
// `useGlobalShortcuts`. Used to render the `?` help sheet so the user can
// discover what's bound without reading source code.

export type ShortcutEntry = {
  /** Tokens are joined with " + " in the UI. Use canonical Mac symbols. */
  keys: string[];
  label: string;
  /** Used for grouping in the help sheet. */
  group: "global" | "navigation" | "edit" | "selection";
  /** True if the shortcut works while typing. */
  whileTyping?: boolean;
};

export const KEYMAP: ShortcutEntry[] = [
  // Global
  {
    keys: ["?"],
    label: "단축키 도움말 열기",
    group: "global",
  },
  {
    keys: ["⌘", "K"],
    label: "커맨드 팔레트 열기",
    group: "global",
  },

  // Edit
  {
    keys: ["⌘", "Z"],
    label: "되돌리기 (Undo)",
    group: "edit",
  },
  {
    keys: ["⌘", "⇧", "Z"],
    label: "다시 실행 (Redo)",
    group: "edit",
  },
  {
    keys: ["⌘", "Y"],
    label: "다시 실행 (Redo, 대체)",
    group: "edit",
  },
  {
    keys: ["Enter"],
    label: "선택한 블록 편집 시작 / 편집 커밋",
    group: "edit",
  },
  {
    keys: ["⌘", "Enter"],
    label: "편집 커밋 (입력 중에도 동작)",
    group: "edit",
    whileTyping: true,
  },
  {
    keys: ["Esc"],
    label: "편집 취소",
    group: "edit",
    whileTyping: true,
  },

  // Selection
  {
    keys: ["⌘", "A"],
    label: "현재 컨테이너의 모든 블록 선택",
    group: "selection",
  },
  {
    keys: ["Click"],
    label: "빈 캔버스 클릭 → 선택 해제",
    group: "selection",
  },
  {
    keys: ["Drag"],
    label: "빈 캔버스 드래그 → 사각형 영역 선택 (마퀴)",
    group: "selection",
  },
  {
    keys: ["Shift", "Click"],
    label: "범위 선택 (이전 선택부터 클릭한 블록까지)",
    group: "selection",
  },
  {
    keys: ["⌘", "Click"],
    label: "선택 토글 (다중 선택)",
    group: "selection",
  },
  {
    keys: ["Delete"],
    label: "선택한 블록 삭제 (다중 선택 시 모두)",
    group: "selection",
  },
  {
    keys: ["Backspace"],
    label: "선택한 블록 삭제",
    group: "selection",
  },
  {
    keys: ["⌘", "C"],
    label: "선택한 블록 복사",
    group: "selection",
  },
  {
    keys: ["⌘", "V"],
    label: "클립보드 블록 붙여넣기",
    group: "selection",
  },
  {
    keys: ["⌘", "D"],
    label: "선택한 블록 복제",
    group: "selection",
  },
];

export const KEYMAP_GROUP_LABEL: Record<ShortcutEntry["group"], string> = {
  global: "전역",
  navigation: "탐색",
  edit: "편집",
  selection: "선택",
};
