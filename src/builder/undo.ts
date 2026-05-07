import type { AppState, HistoryFrame } from "./types/state";

export const HISTORY_DEPTH_DEFAULT = 100;

export function recordHistory(
  state: AppState,
  frame: HistoryFrame,
  depth: number = HISTORY_DEPTH_DEFAULT,
): AppState {
  const past = [...state.historyPast, frame];
  const trimmed = past.length > depth ? past.slice(-depth) : past;
  return {
    ...state,
    historyPast: trimmed,
    historyFuture: [],
  };
}

export function popUndo(
  state: AppState,
): { state: AppState; frame: HistoryFrame } | null {
  if (state.historyPast.length === 0) return null;
  const past = state.historyPast.slice();
  const frame = past.pop();
  if (!frame) return null;
  return {
    state: {
      ...state,
      historyPast: past,
      historyFuture: [...state.historyFuture, frame],
    },
    frame,
  };
}

export function popRedo(
  state: AppState,
): { state: AppState; frame: HistoryFrame } | null {
  if (state.historyFuture.length === 0) return null;
  const future = state.historyFuture.slice();
  const frame = future.pop();
  if (!frame) return null;
  return {
    state: {
      ...state,
      historyFuture: future,
      historyPast: [...state.historyPast, frame],
    },
    frame,
  };
}
