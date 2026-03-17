import { create } from "zustand";
import type { DesignItem, FurnitureItemDoc, RoomDesignDoc } from "../firebase/firestore";

export type EditorMode = "2d" | "3d";

export type RoomEditorState = {
  design: RoomDesignDoc | null;
  furniture: FurnitureItemDoc[];
  selectedItemId: string | null;
  editorMode: EditorMode;
  setDesign: (design: RoomDesignDoc | null) => void;
  setFurniture: (items: FurnitureItemDoc[]) => void;
  selectItem: (id: string | null) => void;
  setEditorMode: (mode: EditorMode) => void;
  addItem: (item: DesignItem) => void;
  updateItem: (itemId: string, patch: Partial<DesignItem>) => void;
  removeItem: (itemId: string) => void;
  replaceItems: (items: DesignItem[]) => void;
};

export const useRoomStore = create<RoomEditorState>((set, get) => ({
  design: null,
  furniture: [],
  selectedItemId: null,
  editorMode: "2d",
  setDesign: (design) => set({ design }),
  setFurniture: (items) => set({ furniture: items }),
  selectItem: (id) => set({ selectedItemId: id }),
  setEditorMode: (mode) => set({ editorMode: mode }),
  addItem: (item) => {
    const design = get().design;
    if (!design) return;
    set({ design: { ...design, items: [...design.items, item] }, selectedItemId: item.itemId });
  },
  updateItem: (itemId, patch) => {
    const design = get().design;
    if (!design) return;
    set({
      design: {
        ...design,
        items: design.items.map((it) => (it.itemId === itemId ? { ...it, ...patch } : it)),
      },
    });
  },
  removeItem: (itemId) => {
    const design = get().design;
    if (!design) return;
    const nextItems = design.items.filter((it) => it.itemId !== itemId);
    set({
      design: { ...design, items: nextItems },
      selectedItemId: get().selectedItemId === itemId ? null : get().selectedItemId,
    });
  },
  replaceItems: (items) => {
    const design = get().design;
    if (!design) return;
    set({ design: { ...design, items } });
  },
}));

