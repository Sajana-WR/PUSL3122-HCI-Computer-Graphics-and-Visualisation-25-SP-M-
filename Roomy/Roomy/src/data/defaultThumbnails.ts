import type { FurnitureCategory, RoomType } from "../firebase/firestore";

const categoryToBaseName: Record<FurnitureCategory, string> = {
  sofa: "sofa_modern_top",
  armchair: "armchair_top",
  coffee_table: "coffee_table_top",
  tv_stand: "tv_stand_top",
  bookshelf: "bookshelf_top",
  dining_table: "dining_table_top",
  dining_chair: "dining_chair_top",
  sideboard: "sideboard_top",
  cabinet: "cabinet_top",
  kitchen_island: "kitchen_island_top",
  stool: "stool_bar_top",
  refrigerator: "refrigerator_top",
  shelf: "wall_shelf_top",
  bed: "bed_queen_top",
  bedside_table: "bedside_table_top",
  wardrobe: "wardrobe_top",
  dresser: "dresser_top",
  office_desk: "office_desk_top",
  office_chair: "office_chair_top",
  drawer_unit: "drawer_unit_top",
};

export function defaultThumbnailPath(roomType: RoomType, category: FurnitureCategory) {
  const base = categoryToBaseName[category];
  // Prefer .png first, then .jpg (many assets added as .jpg)
  // The loader will try the provided path; if missing, our code falls back to generated SVG.
  return `/assets/furniture/${roomType}/${base}.jpg`;
}

const availableByRoom: Partial<Record<RoomType, ReadonlySet<FurnitureCategory>>> = {
  living_room: new Set(["sofa", "armchair", "coffee_table", "tv_stand"]),
  dining_room: new Set(["dining_table", "dining_chair", "sideboard", "cabinet"]),
  kitchen: new Set(["refrigerator"]),
  bedroom: new Set(["bed", "wardrobe"]),
  office: new Set(["office_desk", "office_chair"]),
};

export function hasRealThumbnail(roomType: RoomType, category: FurnitureCategory) {
  return availableByRoom[roomType]?.has(category) ?? false;
}
