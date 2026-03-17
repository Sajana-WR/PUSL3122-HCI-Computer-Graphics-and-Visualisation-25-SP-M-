import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Group,
  Image as KonvaImage,
  Layer,
  Rect,
  Circle as KonvaCircle,
  Stage,
  Transformer,
} from "react-konva";
import Konva from "konva";
import {
  ArrowLeft,
  Save,
  Trash2,
  RotateCw,
  Palette,
  Cuboid,
} from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { useAuth } from "../auth/useAuth";
import {
  getRoomDesign,
  listFurnitureItems,
  seedFurnitureItems,
  updateRoomDesign,
  type DesignItem,
  type FurnitureItemDoc,
  type RoomDesignDoc,
} from "../firebase/firestore";
import { furnitureSeed } from "../data/furnitureSeed";
import { furnitureThumbnailDataUri } from "../data/furnitureThumbnails";
import { useHtmlImage } from "../hooks/useHtmlImage";
import { useRoomStore } from "../store/roomStore";
import { defaultThumbnailPath, hasRealThumbnail } from "../data/defaultThumbnails";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function makeItemId(base: string) {
  return `${base}_${Math.random().toString(16).slice(2, 8)}${Date.now().toString(16).slice(-4)}`;
}

function computeScale(params: {
  roomWidth: number;
  roomLength: number;
  canvasWidth: number;
  canvasHeight: number;
  roomPadding: number;
}) {
  const usableW = params.canvasWidth - params.roomPadding * 2;
  const usableH = params.canvasHeight - params.roomPadding * 2;
  const s = Math.min(usableW / params.roomWidth, usableH / params.roomLength);
  return clamp(s, 0.1, 2.2);
}

function computeScaleFitHeight(params: {
  roomLength: number;
  canvasHeight: number;
  roomPadding: number;
}) {
  const usableH = params.canvasHeight - params.roomPadding * 2;
  const s = usableH / params.roomLength;
  return clamp(s, 0.1, 2.2);
}

function computeRoomRect(params: {
  roomWidth: number;
  roomLength: number;
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
}) {
  const w = params.roomWidth * params.scale;
  const h = params.roomLength * params.scale;
  const x = (params.canvasWidth - w) / 2;
  const y = (params.canvasHeight - h) / 2;
  return { x, y, w, h };
}

function normalizeDesign(
  design: RoomDesignDoc,
  canvasWidth: number,
  canvasHeight: number,
  roomPadding: number,
) {
  const scale = computeScale({
    roomWidth: design.roomWidth,
    roomLength: design.roomLength,
    canvasWidth,
    canvasHeight,
    roomPadding,
  });
  const roomRect = computeRoomRect({
    roomWidth: design.roomWidth,
    roomLength: design.roomLength,
    canvasWidth,
    canvasHeight,
    scale,
  });

  const looksLikeCanvasCoords = design.items.some((it) => {
    return (
      it.x + it.width > design.roomWidth + 20 ||
      it.y + it.depth > design.roomLength + 20
    );
  });

  if (!looksLikeCanvasCoords) {
    const looksLikeTopLeft = design.items.some(
      (it) =>
        it.x + it.width <= design.roomWidth + 2 &&
        it.y + it.depth <= design.roomLength + 2,
    );
    if (!looksLikeTopLeft) return design;
    return {
      ...design,
      items: design.items.map((it) => ({
        ...it,
        x: it.x + it.width / 2,
        y: it.y + it.depth / 2,
      })),
    };
  }

  return {
    ...design,
    items: design.items.map((it) => {
      const xTopLeft = (it.x - roomRect.x) / scale;
      const yTopLeft = (it.y - roomRect.y) / scale;
      const w = it.width / scale;
      const d = it.depth / scale;
      return {
        ...it,
        x: xTopLeft + w / 2,
        y: yTopLeft + d / 2,
        width: w,
        depth: d,
      };
    }),
  };
}

function resolveCategoryForItem(item: DesignItem, design: RoomDesignDoc) {
  if (item.category) return item.category;
  const match = furnitureSeed.find(
    (fi) => fi.roomType === design.roomType && fi.name === item.itemName,
  );
  return match?.category ?? "sofa";
}

function PlacedItem2D({
  item,
  design,
  roomRect,
  scale,
  selected,
  onSelect,
  onChange,
}: {
  item: DesignItem;
  design: RoomDesignDoc;
  roomRect: { x: number; y: number; w: number; h: number };
  scale: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<DesignItem>) => void;
}) {
  const category = resolveCategoryForItem(item, design);
  const src = useMemo(() => {
    if (
      item.thumbnail &&
      (item.thumbnail.startsWith("http") || item.thumbnail.startsWith("/"))
    ) {
      return item.thumbnail;
    }
    const fallback = defaultThumbnailPath(design.roomType, category);
    return (
      fallback ?? furnitureThumbnailDataUri({ category, color: item.color })
    );
  }, [category, item.color, item.thumbnail, design.roomType]);
  const image = useHtmlImage(src ?? null);

  const canvasW = Math.max(12, item.width * scale);
  const canvasH = Math.max(12, item.depth * scale);
  const canvasX = roomRect.x + item.x * scale;
  const canvasY = roomRect.y + item.y * scale;

  return (
    <Group
      id={`item_${item.itemId}`}
      x={canvasX}
      y={canvasY}
      rotation={item.rotation}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={(e) => {
        const node = e.target as Konva.Group;
        const x = (node.x() - roomRect.x) / scale;
        const y = (node.y() - roomRect.y) / scale;
        const halfW = item.width / 2;
        const halfD = item.depth / 2;
        if (design.roomShape === "circular") {
          const cx = design.roomWidth / 2;
          const cy = design.roomLength / 2;
          const r = Math.min(design.roomWidth, design.roomLength) / 2;
          const margin = Math.max(halfW, halfD);
          const allowed = Math.max(10, r - margin);
          let dx = x - cx;
          let dy = y - cy;
          const dist = Math.hypot(dx, dy);
          if (dist > allowed) {
            const k = allowed / dist;
            dx *= k;
            dy *= k;
          }
          const nx = cx + dx;
          const ny = cy + dy;
          node.x(roomRect.x + nx * scale);
          node.y(roomRect.y + ny * scale);
          onChange({ x: nx, y: ny });
        } else if (design.roomShape === "l_shaped") {
          const leftWidth = design.roomWidth * 0.6;
          const bottomHeight = design.roomLength * 0.6;
          let nx = clamp(x, halfW, design.roomWidth - halfW);
          let ny = clamp(y, halfD, design.roomLength - halfD);
          const inForbidden =
            nx > leftWidth && ny < design.roomLength - bottomHeight;
          if (inForbidden) {
            const dx = nx - leftWidth;
            const dy = design.roomLength - bottomHeight - ny;
            if (dx > dy) {
              ny = design.roomLength - bottomHeight;
            } else {
              nx = leftWidth;
            }
          }
          node.x(roomRect.x + nx * scale);
          node.y(roomRect.y + ny * scale);
          onChange({ x: nx, y: ny });
        } else {
          const clampedX = clamp(x, halfW, design.roomWidth - halfW);
          const clampedY = clamp(y, halfD, design.roomLength - halfD);
          node.x(roomRect.x + clampedX * scale);
          node.y(roomRect.y + clampedY * scale);
          onChange({ x: clampedX, y: clampedY });
        }
      }}
      onTransformEnd={(e) => {
        const node = e.target as Konva.Group;
        const nextRotation = node.rotation();
        const nextWidth = Math.max(20, item.width * node.scaleX());
        const nextDepth = Math.max(20, item.depth * node.scaleY());
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          rotation: nextRotation,
          width: nextWidth,
          depth: nextDepth,
        });
      }}
    >
      <Rect
        x={-canvasW / 2}
        y={-canvasH / 2}
        width={canvasW}
        height={canvasH}
        fill={image ? "transparent" : item.color}
        stroke={selected ? "#2563eb" : "rgba(15,23,42,0.28)"}
        strokeWidth={selected ? 3 : 1}
        cornerRadius={14}
      />
      {image ? (
        <KonvaImage
          x={-canvasW / 2}
          y={-canvasH / 2}
          width={canvasW}
          height={canvasH}
          image={image}
          listening={false}
        />
      ) : null}
    </Group>
  );
}

export function RoomEditorPage() {
  const { designId } = useParams<{ designId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    design,
    setDesign,
    furniture,
    setFurniture,
    selectedItemId,
    selectItem,
    addItem,
    updateItem,
    removeItem,
  } = useRoomStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!design || !selectedItemId) return null;
    return design.items.find((i) => i.itemId === selectedItemId) ?? null;
  }, [design, selectedItemId]);

  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  const roomPadding = 24;
  const normalizeCanvasWidth = 1100;
  const normalizeCanvasHeight = 640;
  const [canvasHeight] = useState(normalizeCanvasHeight);

  const scale = useMemo(() => {
    if (!design) return 1;
    return computeScaleFitHeight({
      roomLength: design.roomLength,
      canvasHeight,
      roomPadding,
    });
  }, [canvasHeight, design, roomPadding]);

  const stageWidth = useMemo(() => {
    if (!design) return normalizeCanvasWidth;
    return Math.ceil(design.roomWidth * scale + roomPadding * 2);
  }, [design, roomPadding, scale]);

  const roomRect = useMemo(() => {
    if (!design) return null;
    return computeRoomRect({
      roomWidth: design.roomWidth,
      roomLength: design.roomLength,
      canvasWidth: stageWidth,
      canvasHeight,
      scale,
    });
  }, [canvasHeight, stageWidth, design, scale]);

  useEffect(() => {
    if (!transformerRef.current) return;
    if (!selectedItemId) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;
    const node = stage.findOne(`#item_${selectedItemId}`);
    if (node) {
      transformerRef.current.nodes([node as unknown as Konva.Node]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedItemId, design?.items?.length]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!designId) return;
      setLoading(true);
      setError(null);
      try {
        const d = await getRoomDesign(designId);
        if (!d) throw new Error("Design not found");
        if (user?.uid && d.userId !== user.uid)
          throw new Error("Access denied");
        if (!cancelled)
          setDesign(
            normalizeDesign(
              d,
              normalizeCanvasWidth,
              normalizeCanvasHeight,
              roomPadding,
            ),
          );
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load design",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
      setDesign(null);
      selectItem(null);
    };
  }, [canvasHeight, designId, roomPadding, selectItem, setDesign, user?.uid]);

  useEffect(() => {
    let cancelled = false;
    async function loadFurniture(d: RoomDesignDoc | null) {
      if (!d) return;
      try {
        let items = await listFurnitureItems(d.roomType);
        if (items.length === 0) {
          await seedFurnitureItems(furnitureSeed);
          items = await listFurnitureItems(d.roomType);
        }
        const withImages = items.filter((it) => {
          if (it.thumbnail && (it.thumbnail.startsWith("http") || it.thumbnail.startsWith("/"))) {
            return true;
          }
          return hasRealThumbnail(it.roomType, it.category);
        });
        if (withImages.length === 0) {
          await seedFurnitureItems(furnitureSeed);
          const seeded = await listFurnitureItems(d.roomType);
          const seededWithImages = seeded.filter((it) => {
            if (it.thumbnail && (it.thumbnail.startsWith("http") || it.thumbnail.startsWith("/"))) {
              return true;
            }
            return hasRealThumbnail(it.roomType, it.category);
          });
          if (!cancelled) setFurniture(seededWithImages);
          return;
        }
        if (!cancelled) setFurniture(withImages);
      } catch {
        if (!cancelled)
          setFurniture(furnitureSeed.filter((i) => i.roomType === d.roomType));
      }
    }
    void loadFurniture(design);
    return () => {
      cancelled = true;
    };
  }, [design, setFurniture]);

  function placeNewItem(fi: FurnitureItemDoc) {
    if (!design) return;
    const id = makeItemId(fi.id);
    const item: DesignItem = {
      itemId: id,
      itemName: fi.name,
      category: fi.category,
      thumbnail:
        fi.thumbnail &&
        (fi.thumbnail.startsWith("http") || fi.thumbnail.startsWith("/"))
          ? fi.thumbnail
          : defaultThumbnailPath(fi.roomType, fi.category),
      x: design.roomWidth / 2,
      y: design.roomLength / 2,
      z: 0,
      width: fi.width,
      depth: fi.depth,
      height: fi.height,
      rotation: 0,
      scale: 1,
      color: fi.defaultColor,
    };
    addItem(item);
  }

  async function saveDesign() {
    if (!designId || !design) return;
    setSaving(true);
    setError(null);
    try {
      await updateRoomDesign(designId, { items: design.items });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Editor">
      <div className="grid gap-4">
        <div className="rm-card flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rm-btn-outline"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
            <div className="ml-1">
              <div className="text-sm font-semibold text-slate-900">
                {design?.roomName ?? "Room"}
              </div>
              <div className="text-xs text-slate-500">
                {design
                  ? `${design.roomType.replaceAll("_", " ")} • ${design.roomWidth}×${design.roomLength}`
                  : ""}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/viewer3d/${designId ?? ""}${
                    selectedItemId ? `?item=${selectedItemId}` : ""
                  }`,
                )
              }
              className="rm-btn-outline"
              disabled={!designId}
            >
              <Cuboid className="h-4 w-4" />
              3D view
            </button>
            <button
              type="button"
              onClick={() => saveDesign()}
              disabled={saving || !designId || !design}
              className="rm-btn-primary"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 backdrop-blur">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rm-card p-6 text-sm text-slate-600">Loading…</div>
        ) : (
          <div className="grid gap-4 items-start lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(280px,320px)]">
            <div className="rm-card p-4">
              <div className="text-sm font-semibold text-slate-900">
                Furniture
              </div>
              <div className="mt-1 text-xs text-slate-500">Click to add</div>

              <div className="mt-4 grid gap-2">
                {furniture.map((fi) => (
                  <button
                    key={fi.id}
                    type="button"
                    onClick={() => placeNewItem(fi)}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:bg-slate-50"
                  >
                    <img
                      src={
                        fi.thumbnail &&
                        (fi.thumbnail.startsWith("http") ||
                          fi.thumbnail.startsWith("/"))
                          ? fi.thumbnail
                          : defaultThumbnailPath(fi.roomType, fi.category)
                      }
                      alt={fi.name}
                      className="h-10 w-14 flex-none rounded-lg border border-slate-200 bg-white object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {fi.name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {fi.category.replaceAll("_", " ")}
                      </span>
                    </span>
                    <span className="flex-none text-xs font-medium text-slate-500">
                      {fi.width}×{fi.depth}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rm-card min-w-0 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">
                  2D canvas
                </div>
                <button
                  type="button"
                  onClick={() => selectItem(null)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  Deselect
                </button>
              </div>

              <div
                ref={canvasContainerRef}
                className="rm-card overflow-x-auto bg-slate-50/60"
              >
                <Stage
                  width={stageWidth}
                  height={canvasHeight}
                  ref={(r) => {
                    stageRef.current = r;
                  }}
                  onMouseDown={(e) => {
                    if (e.target === e.target.getStage()) selectItem(null);
                  }}
                >
                  <Layer>
                    {roomRect && design ? (
                      design.roomShape === "circular" ? (
                        <>
                          {(() => {
                            const centerX = roomRect.x + roomRect.w / 2;
                            const centerY = roomRect.y + roomRect.h / 2;
                            const baseR = Math.min(roomRect.w, roomRect.h) / 2;
                            const inset = 12;
                            const r1 = Math.max(0, baseR - inset);
                            const r2 = Math.max(0, baseR - inset - 10);
                            return (
                              <>
                                <KonvaCircle
                                  x={centerX}
                                  y={centerY}
                                  radius={r1}
                                  fill={design.floorColor}
                                  stroke="#0f172a"
                                  strokeWidth={2}
                                  shadowColor="rgba(15, 23, 42, 0.25)"
                                  shadowBlur={18}
                                  shadowOffsetX={0}
                                  shadowOffsetY={8}
                                  shadowOpacity={0.14}
                                />
                                <KonvaCircle
                                  x={centerX}
                                  y={centerY}
                                  radius={r2}
                                  stroke={design.wallColor}
                                  strokeWidth={10}
                                  listening={false}
                                />
                              </>
                            );
                          })()}
                        </>
                      ) : design.roomShape === "l_shaped" ? (
                        <>
                          {(() => {
                            const vx = roomRect.x;
                            const vy = roomRect.y;
                            const vw = Math.round(roomRect.w * 0.6);
                            const vh = roomRect.h;
                            const hx = roomRect.x;
                            const hy =
                              roomRect.y + Math.round(roomRect.h * 0.4);
                            const hw = roomRect.w;
                            const hh = Math.round(roomRect.h * 0.6);
                            return (
                              <>
                                <Rect
                                  x={vx}
                                  y={vy}
                                  width={vw}
                                  height={vh}
                                  fill={design.floorColor}
                                  stroke="#0f172a"
                                  strokeWidth={2}
                                  shadowColor="rgba(15, 23, 42, 0.25)"
                                  shadowBlur={18}
                                  shadowOffsetX={0}
                                  shadowOffsetY={8}
                                  shadowOpacity={0.14}
                                />
                                <Rect
                                  x={hx}
                                  y={hy}
                                  width={hw}
                                  height={hh}
                                  fill={design.floorColor}
                                  stroke="#0f172a"
                                  strokeWidth={2}
                                  shadowColor="rgba(15, 23, 42, 0.25)"
                                  shadowBlur={18}
                                  shadowOffsetX={0}
                                  shadowOffsetY={8}
                                  shadowOpacity={0.14}
                                />
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          <Rect
                            x={roomRect.x}
                            y={roomRect.y}
                            width={roomRect.w}
                            height={roomRect.h}
                            fill={design.floorColor}
                            stroke="#0f172a"
                            strokeWidth={2}
                            cornerRadius={24}
                            shadowColor="rgba(15, 23, 42, 0.25)"
                            shadowBlur={18}
                            shadowOffsetX={0}
                            shadowOffsetY={8}
                            shadowOpacity={0.14}
                          />
                          <Rect
                            x={roomRect.x + 10}
                            y={roomRect.y + 10}
                            width={roomRect.w - 20}
                            height={roomRect.h - 20}
                            stroke={design.wallColor}
                            strokeWidth={10}
                            cornerRadius={18}
                            listening={false}
                          />
                        </>
                      )
                    ) : null}

                    {roomRect && design
                      ? design.items.map((it) => (
                          <PlacedItem2D
                            key={it.itemId}
                            item={it}
                            design={design}
                            roomRect={roomRect}
                            scale={scale}
                            selected={it.itemId === selectedItemId}
                            onSelect={() => selectItem(it.itemId)}
                            onChange={(patch) => updateItem(it.itemId, patch)}
                          />
                        ))
                      : null}

                    <Transformer
                      ref={(r) => {
                        transformerRef.current = r;
                      }}
                      rotateEnabled
                      enabledAnchors={[
                        "top-left",
                        "top-right",
                        "bottom-left",
                        "bottom-right",
                        "middle-left",
                        "middle-right",
                        "top-center",
                        "bottom-center",
                      ]}
                      boundBoxFunc={(_, newBox) => {
                        if (newBox.width < 20 || newBox.height < 20) return _;
                        return newBox;
                      }}
                    />
                  </Layer>
                </Stage>
              </div>
            </div>

            <div className="rm-card p-4">
              <div className="text-sm font-semibold text-slate-900">
                Properties
              </div>
              <div className="mt-1 text-xs text-slate-500">Selected item</div>

              {!selected ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Select a furniture item to edit its properties.
                </div>
              ) : (
                <div className="mt-4 grid gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">
                      {selected.itemName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {selected.itemId}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <RotateCw className="h-4 w-4" />
                        Rotation
                      </div>
                      <div className="text-xs text-slate-500">
                        {Math.round(selected.rotation)}°
                      </div>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={selected.rotation}
                      onChange={(e) =>
                        updateItem(selected.itemId, {
                          rotation: Number(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Palette className="h-4 w-4" />
                      Color
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={selected.color}
                        onChange={(e) =>
                          updateItem(selected.itemId, { color: e.target.value })
                        }
                        className="h-11 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                      />
                      <input
                        value={selected.color}
                        onChange={(e) =>
                          updateItem(selected.itemId, { color: e.target.value })
                        }
                        className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(selected.itemId)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete item
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
