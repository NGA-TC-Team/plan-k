import { createContext } from "react";
import type { createBuilderStore } from "@/builder/store";

export type BuilderStoreHook = ReturnType<typeof createBuilderStore>;

export const BuilderContext = createContext<BuilderStoreHook | null>(null);
