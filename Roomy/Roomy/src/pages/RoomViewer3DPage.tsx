import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Move3D,
  Rotate3D,
  Save,
} from "lucide-react";
import { MeshStandardMaterial, type Texture } from "three";
import { AppShell } from "../components/layout/AppShell";
import { useAuth } from "../auth/useAuth";
import { useSearchParams } from "react-router-dom";
import {
  getRoomDesign,
  updateRoomDesign,
  type DesignItem,
  type RoomDesignDoc,
} from "../firebase/firestore";
import { furnitureSeed } from "../data/furnitureSeed";
import { furnitureThumbnailDataUri } from "../data/furnitureThumbnails";

function metersFromPx(n: number) {
  return n / 100;
}

function resolveCategory(item: DesignItem, design: RoomDesignDoc) {
  if (item.category) return item.category;
  const match = furnitureSeed.find(
    (fi) => fi.roomType === design.roomType && fi.name === item.itemName,
  );
  return match?.category ?? "sofa";
}

function normalizeTopLeftToCenter(design: RoomDesignDoc) {
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

function boxMaterials(params: {
  color: string;
  selected: boolean;
  texture: Texture;
}) {
  const side = new MeshStandardMaterial({
    color: params.selected ? "#334155" : params.color,
    roughness: 0.75,
    metalness: 0.05,
    emissive: params.selected ? 0x334155 : 0x000000,
    emissiveIntensity: params.selected ? 0.15 : 0,
  });
  const top = new MeshStandardMaterial({
    map: params.texture,
    roughness: 0.85,
    metalness: 0,
  });
  const bottom = new MeshStandardMaterial({
    color: "#0b1220",
    roughness: 1,
    metalness: 0,
  });
  return [side, side, top, bottom, side, side] as const;
}

function solidMaterial(color: string) {
  return new MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.02 });
}

function FurnitureModel({
  item,
  design,
  selected,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  item: DesignItem;
  design: RoomDesignDoc;
  selected: boolean;
  onSelect: () => void;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerCancel?: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const w = metersFromPx(item.width);
  const d = metersFromPx(item.depth);
  const h = Math.max(0.18, metersFromPx(item.height));
  const x = metersFromPx(item.x - design.roomWidth / 2);
  const z = metersFromPx(item.y - design.roomLength / 2);
  const rotY = (-item.rotation * Math.PI) / 180;

  const category = resolveCategory(item, design);
  const src = useMemo(() => {
    if (
      item.thumbnail &&
      (item.thumbnail.startsWith("http") || item.thumbnail.startsWith("/"))
    ) {
      return item.thumbnail;
    }
    return furnitureThumbnailDataUri({ category, color: item.color });
  }, [category, item.color, item.thumbnail]);
  const texture = useTexture(src);
  const topTexture = texture as unknown as Texture;

  const mainMaterials = useMemo(() => {
    return boxMaterials({ color: item.color, selected, texture: topTexture });
  }, [item.color, selected, topTexture]);

  const accent = useMemo(
    () => solidMaterial(selected ? "#1f2937" : "#0f172a"),
    [selected],
  );
  const secondary = useMemo(
    () => solidMaterial(selected ? "#475569" : "#111827"),
    [selected],
  );

  return (
    <group
      position={[x, 0, z]}
      rotation={[0, rotY, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        onPointerDown?.(e);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {category === "sofa" ? (
        <>
          <mesh position={[0, h * 0.18, 0]} material={mainMaterials}>
            <boxGeometry args={[w, h * 0.36, d]} />
          </mesh>
          <mesh position={[0, h * 0.46, -d * 0.35]} material={secondary}>
            <boxGeometry args={[w, h * 0.34, d * 0.3]} />
          </mesh>
          <mesh position={[w * 0.44, h * 0.32, 0]} material={secondary}>
            <boxGeometry args={[w * 0.12, h * 0.34, d]} />
          </mesh>
          <mesh position={[-w * 0.44, h * 0.32, 0]} material={secondary}>
            <boxGeometry args={[w * 0.12, h * 0.34, d]} />
          </mesh>
        </>
      ) : category === "armchair" ? (
        <>
          <mesh position={[0, h * 0.2, 0]} material={mainMaterials}>
            <boxGeometry args={[w, h * 0.4, d]} />
          </mesh>
          <mesh position={[0, h * 0.52, -d * 0.32]} material={secondary}>
            <boxGeometry args={[w, h * 0.34, d * 0.28]} />
          </mesh>
          <mesh position={[w * 0.44, h * 0.33, 0]} material={secondary}>
            <boxGeometry args={[w * 0.12, h * 0.38, d]} />
          </mesh>
          <mesh position={[-w * 0.44, h * 0.33, 0]} material={secondary}>
            <boxGeometry args={[w * 0.12, h * 0.38, d]} />
          </mesh>
        </>
      ) : category === "coffee_table" ||
        category === "dining_table" ||
        category === "office_desk" ? (
        <>
          <mesh position={[0, h * 0.45, 0]} material={mainMaterials}>
            <boxGeometry args={[w, h * 0.18, d]} />
          </mesh>
          <mesh position={[w * 0.42, h * 0.18, d * 0.42]} material={accent}>
            <boxGeometry args={[w * 0.08, h * 0.36, d * 0.08]} />
          </mesh>
          <mesh position={[-w * 0.42, h * 0.18, d * 0.42]} material={accent}>
            <boxGeometry args={[w * 0.08, h * 0.36, d * 0.08]} />
          </mesh>
          <mesh position={[w * 0.42, h * 0.18, -d * 0.42]} material={accent}>
            <boxGeometry args={[w * 0.08, h * 0.36, d * 0.08]} />
          </mesh>
          <mesh position={[-w * 0.42, h * 0.18, -d * 0.42]} material={accent}>
            <boxGeometry args={[w * 0.08, h * 0.36, d * 0.08]} />
          </mesh>
        </>
      ) : category === "dining_chair" || category === "office_chair" ? (
        <>
          <mesh position={[0, h * 0.26, 0]} material={mainMaterials}>
            <boxGeometry args={[w, h * 0.22, d]} />
          </mesh>
          <mesh position={[0, h * 0.55, -d * 0.35]} material={secondary}>
            <boxGeometry args={[w, h * 0.5, d * 0.18]} />
          </mesh>
          <mesh position={[w * 0.42, h * 0.12, d * 0.42]} material={accent}>
            <boxGeometry args={[w * 0.08, h * 0.24, d * 0.08]} />
          </mesh>
          <mesh position={[-w * 0.42, h * 0.12, d * 0.42]} material={accent}>
            <boxGeometry args={[w * 0.08, h * 0.24, d * 0.08]} />
          </mesh>
          <mesh position={[w * 0.42, h * 0.12, -d * 0.42]} material={accent}>
            <boxGeometry args={[w * 0.08, h * 0.24, d * 0.08]} />
          </mesh>
          <mesh position={[-w * 0.42, h * 0.12, -d * 0.42]} material={accent}>
            <boxGeometry args={[w * 0.08, h * 0.24, d * 0.08]} />
          </mesh>
        </>
      ) : category === "bed" ? (
        <>
          <mesh position={[0, h * 0.18, 0]} material={mainMaterials}>
            <boxGeometry args={[w, h * 0.36, d]} />
          </mesh>
          <mesh position={[-w * 0.2, h * 0.42, -d * 0.35]} material={secondary}>
            <boxGeometry args={[w * 0.32, h * 0.18, d * 0.22]} />
          </mesh>
          <mesh position={[w * 0.2, h * 0.42, -d * 0.35]} material={secondary}>
            <boxGeometry args={[w * 0.32, h * 0.18, d * 0.22]} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, h / 2, 0]} material={mainMaterials}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
      )}
    </group>
  );
}

function RoomScene({
  design,
  selectedId,
  onChangeItem,
  onSelectItem,
  mode,
  orbitEnabled,
  setOrbitEnabled,
  xrayWalls,
}: {
  design: RoomDesignDoc;
  selectedId: string | null;
  onChangeItem: (id: string, patch: Partial<DesignItem>) => void;
  onSelectItem: (id: string | null) => void;
  mode: "translate" | "rotate";
  orbitEnabled: boolean;
  setOrbitEnabled: (v: boolean) => void;
  xrayWalls: boolean;
}) {
  const roomW = metersFromPx(design.roomWidth);
  const roomL = metersFromPx(design.roomLength);
  const wallH = 2.6;
  const restoreOrbitRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    itemId: string;
    mode: "translate" | "rotate";
    offsetX: number;
    offsetZ: number;
    startClientX: number;
    startRotation: number;
    centerX?: number;
    centerZ?: number;
    lastAngle?: number;
    currentRotation?: number;
  } | null>(null);

  function floorHitXZ(e: ThreeEvent<PointerEvent>) {
    const origin = e.ray.origin;
    const direction = e.ray.direction;
    const dy = direction.y;
    if (Math.abs(dy) < 1e-6) return null;
    const t = -origin.y / dy;
    if (!Number.isFinite(t) || t < 0) return null;
    return {
      x: origin.x + direction.x * t,
      z: origin.z + direction.z * t,
    };
  }

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 4]} intensity={1.2} />

      {design.roomShape === "circular" ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <circleGeometry args={[Math.min(roomW, roomL) / 2, 64]} />
            <meshStandardMaterial
              color={design.floorColor}
              roughness={0.9}
              metalness={0}
            />
          </mesh>
          <mesh position={[0, wallH / 2, 0]} renderOrder={10}>
            <cylinderGeometry
              args={[
                Math.min(roomW, roomL) / 2,
                Math.min(roomW, roomL) / 2,
                wallH,
                64,
                1,
                true,
              ]}
            />
            <meshStandardMaterial
              color={design.wallColor}
              roughness={0.95}
              transparent={xrayWalls}
              opacity={xrayWalls ? 0.22 : 1}
              depthWrite={!xrayWalls}
            />
          </mesh>
        </>
      ) : design.roomShape === "open_plan" ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[roomW, roomL]} />
            <meshStandardMaterial
              color={design.floorColor}
              roughness={0.9}
              metalness={0}
            />
          </mesh>
        </>
      ) : design.roomShape === "l_shaped" ? (
        <>
          {(() => {
            const leftWidth = roomW * 0.6;
            const bottomLength = roomL * 0.6;
            return (
              <>
                <mesh
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[-roomW / 2 + leftWidth / 2, 0, 0]}
                >
                  <planeGeometry args={[leftWidth, roomL]} />
                  <meshStandardMaterial
                    color={design.floorColor}
                    roughness={0.9}
                    metalness={0}
                  />
                </mesh>
                <mesh
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[0, 0, -roomL / 2 + bottomLength / 2]}
                >
                  <planeGeometry args={[roomW, bottomLength]} />
                  <meshStandardMaterial
                    color={design.floorColor}
                    roughness={0.9}
                    metalness={0}
                  />
                </mesh>
              </>
            );
          })()}
        </>
      ) : (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[roomW, roomL]} />
            <meshStandardMaterial
              color={design.floorColor}
              roughness={0.9}
              metalness={0}
            />
          </mesh>
          <mesh position={[0, wallH / 2, -roomL / 2]} renderOrder={10}>
            <boxGeometry args={[roomW, wallH, 0.08]} />
            <meshStandardMaterial
              color={design.wallColor}
              roughness={0.95}
              transparent={xrayWalls}
              opacity={xrayWalls ? 0.22 : 1}
              depthWrite={!xrayWalls}
            />
          </mesh>
          <mesh position={[0, wallH / 2, roomL / 2]} renderOrder={10}>
            <boxGeometry args={[roomW, wallH, 0.08]} />
            <meshStandardMaterial
              color={design.wallColor}
              roughness={0.95}
              transparent={xrayWalls}
              opacity={xrayWalls ? 0.22 : 1}
              depthWrite={!xrayWalls}
            />
          </mesh>
          <mesh position={[-roomW / 2, wallH / 2, 0]} renderOrder={10}>
            <boxGeometry args={[0.08, wallH, roomL]} />
            <meshStandardMaterial
              color={design.wallColor}
              roughness={0.95}
              transparent={xrayWalls}
              opacity={xrayWalls ? 0.22 : 1}
              depthWrite={!xrayWalls}
            />
          </mesh>
          <mesh position={[roomW / 2, wallH / 2, 0]} renderOrder={10}>
            <boxGeometry args={[0.08, wallH, roomL]} />
            <meshStandardMaterial
              color={design.wallColor}
              roughness={0.95}
              transparent={xrayWalls}
              opacity={xrayWalls ? 0.22 : 1}
              depthWrite={!xrayWalls}
            />
          </mesh>
        </>
      )}

      {design.items.map((it) => {
        const selected = it.itemId === selectedId;
        const w = metersFromPx(it.width);
        const d = metersFromPx(it.depth);
        const minX = -roomW / 2 + w / 2;
        const maxX = roomW / 2 - w / 2;
        const minZ = -roomL / 2 + d / 2;
        const maxZ = roomL / 2 - d / 2;

        const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
          const btn = e.nativeEvent.button ?? 0;
          const intendedMode: "translate" | "rotate" =
            btn === 2 ? "rotate" : mode;

          const el = (e.nativeEvent.target ?? null) as
            | null
            | (Element & {
                setPointerCapture?: (id: number) => void;
              });
          el?.setPointerCapture?.(e.pointerId);

          restoreOrbitRef.current = orbitEnabled;
          if (orbitEnabled) setOrbitEnabled(false);

          if (intendedMode === "translate") {
            const hit = floorHitXZ(e);
            if (!hit) return;
            const curX = metersFromPx(it.x - design.roomWidth / 2);
            const curZ = metersFromPx(it.y - design.roomLength / 2);
            dragRef.current = {
              pointerId: e.pointerId,
              itemId: it.itemId,
              mode: "translate",
              offsetX: curX - hit.x,
              offsetZ: curZ - hit.z,
              startClientX: e.nativeEvent.clientX ?? 0,
              startRotation: it.rotation,
            };
            return;
          }

          const hit = floorHitXZ(e);
          const curX = metersFromPx(it.x - design.roomWidth / 2);
          const curZ = metersFromPx(it.y - design.roomLength / 2);
          const angle = hit ? Math.atan2(hit.z - curZ, hit.x - curX) : 0;
          dragRef.current = {
            pointerId: e.pointerId,
            itemId: it.itemId,
            mode: "rotate",
            offsetX: 0,
            offsetZ: 0,
            startClientX: e.nativeEvent.clientX ?? 0,
            startRotation: it.rotation,
            centerX: curX,
            centerZ: curZ,
            lastAngle: hit ? angle : undefined,
            currentRotation: it.rotation,
          };
        };

        const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
          const drag = dragRef.current;
          if (!drag) return;
          if (drag.itemId !== it.itemId) return;
          if (drag.pointerId !== e.pointerId) return;

          if (drag.mode === "translate") {
            const hit = floorHitXZ(e);
            if (!hit) return;
            let x = Math.min(Math.max(hit.x + drag.offsetX, minX), maxX);
            let z = Math.min(Math.max(hit.z + drag.offsetZ, minZ), maxZ);
            if (design.roomShape === "circular") {
              const r = Math.min(roomW, roomL) / 2;
              const allowed = Math.max(0.05, r - Math.max(w, d) / 2);
              const dist = Math.hypot(x, z);
              if (dist > allowed) {
                const k = allowed / dist;
                x *= k;
                z *= k;
              }
            } else if (design.roomShape === "l_shaped") {
              const leftWidth = roomW * 0.6;
              const bottomLength = roomL * 0.6;
              const borderX = -roomW / 2 + leftWidth;
              const borderZ = -roomL / 2 + bottomLength;
              const inForbidden = x > borderX && z < borderZ;
              if (inForbidden) {
                const dx = x - borderX;
                const dz = borderZ - z;
                if (dx > dz) {
                  z = borderZ;
                } else {
                  x = borderX;
                }
              }
            }
            const newX = Math.round((x + roomW / 2) * 100);
            const newY = Math.round((z + roomL / 2) * 100);
            onChangeItem(it.itemId, { x: newX, y: newY });
            return;
          }

          const hit = floorHitXZ(e);
          if (
            hit &&
            typeof drag.centerX === "number" &&
            typeof drag.centerZ === "number" &&
            typeof drag.lastAngle === "number" &&
            typeof drag.currentRotation === "number"
          ) {
            const angle = Math.atan2(
              hit.z - drag.centerZ,
              hit.x - drag.centerX,
            );
            const rawDelta = angle - drag.lastAngle;
            const delta = Math.atan2(Math.sin(rawDelta), Math.cos(rawDelta));
            const next = drag.currentRotation + (delta * 180) / Math.PI;
            drag.lastAngle = angle;
            drag.currentRotation = next;
            const normalized = ((next % 360) + 360) % 360;
            onChangeItem(it.itemId, { rotation: normalized });
            return;
          }

          const dx = (e.nativeEvent.clientX ?? 0) - drag.startClientX;
          const next = drag.startRotation + dx * 0.35;
          const normalized = ((next % 360) + 360) % 360;
          onChangeItem(it.itemId, { rotation: normalized });
        };

        const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
          const drag = dragRef.current;
          if (!drag) return;
          if (drag.pointerId !== e.pointerId) return;
          dragRef.current = null;
          if (restoreOrbitRef.current) setOrbitEnabled(true);
          restoreOrbitRef.current = false;
        };

        const handlePointerCancel = (e: ThreeEvent<PointerEvent>) => {
          if (dragRef.current?.pointerId !== e.pointerId) return;
          dragRef.current = null;
          if (restoreOrbitRef.current) setOrbitEnabled(true);
          restoreOrbitRef.current = false;
        };

        return (
          <FurnitureModel
            key={it.itemId}
            item={it}
            design={design}
            selected={selected}
            onSelect={() => onSelectItem(it.itemId)}
            onPointerDown={selected ? handlePointerDown : undefined}
            onPointerMove={selected ? handlePointerMove : undefined}
            onPointerUp={selected ? handlePointerUp : undefined}
            onPointerCancel={selected ? handlePointerCancel : undefined}
          />
        );
      })}

      <OrbitControls makeDefault enabled={orbitEnabled} />
    </>
  );
}

export function RoomViewer3DPage() {
  const { designId } = useParams<{ designId: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [design, setDesign] = useState<RoomDesignDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"translate" | "rotate">("translate");
  const [orbitEnabled, setOrbitEnabled] = useState<boolean>(false);
  const [xrayWalls, setXrayWalls] = useState<boolean>(true);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "m") setMode("translate");
      if (e.key.toLowerCase() === "r") setMode("rotate");
      if (e.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const title = useMemo(
    () => (design ? `3D • ${design.roomName}` : "3D Viewer"),
    [design],
  );

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
        if (!cancelled) {
          const normalized = normalizeTopLeftToCenter(d);
          setDesign(normalized);
          const fromQuery = search.get("item");
          if (
            fromQuery &&
            normalized.items.some((i) => i.itemId === fromQuery)
          ) {
            setSelectedId(fromQuery);
          }
        }
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
    };
  }, [designId, user?.uid, search]);

  return (
    <AppShell title={title}>
      <div className="grid gap-4">
        <div className="rm-card flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(designId ? `/editor/${designId}` : "/")}
              className="rm-btn-outline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to 2D
            </button>
            <div className="ml-1">
              <div className="text-sm font-semibold text-slate-900">
                {design?.roomName ?? "Room"}
              </div>
              <div className="text-xs text-slate-500">Orbit • Zoom • Pan</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOrbitEnabled((v) => !v)}
              className={[
                "rm-btn border",
                !orbitEnabled
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white",
              ].join(" ")}
            >
              <Lock className="h-4 w-4" />
              Camera Lock
            </button>
            <button
              type="button"
              onClick={() => setXrayWalls((v) => !v)}
              className={[
                "rm-btn border",
                xrayWalls
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white",
              ].join(" ")}
            >
              {xrayWalls ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              X-ray walls
            </button>
            <button
              type="button"
              onClick={() => setMode("translate")}
              className={[
                "rm-btn border",
                mode === "translate"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white",
              ].join(" ")}
              disabled={!selectedId}
            >
              <Move3D className="h-4 w-4" />
              Move
            </button>
            <button
              type="button"
              onClick={() => setMode("rotate")}
              className={[
                "rm-btn border",
                mode === "rotate"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white",
              ].join(" ")}
              disabled={!selectedId}
            >
              <Rotate3D className="h-4 w-4" />
              Rotate
            </button>
            <div className="hidden sm:block text-xs font-medium text-slate-500">
              Shortcuts: M=Move, R=Rotate, Esc=Deselect
            </div>
            <button
              type="button"
              onClick={async () => {
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
              }}
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

        {loading || !design ? (
          <div className="rm-card p-6 text-sm text-slate-600">Loading…</div>
        ) : (
          <div className="rm-card overflow-hidden bg-white/50">
            <div className="h-[680px]">
              <Canvas
                camera={{ position: [3.5, 3.2, 3.5], fov: 50 }}
                onPointerMissed={() => setSelectedId(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                }}
              >
                <RoomScene
                  design={design}
                  selectedId={selectedId}
                  mode={mode}
                  orbitEnabled={orbitEnabled}
                  setOrbitEnabled={setOrbitEnabled}
                  xrayWalls={xrayWalls}
                  onSelectItem={(id) => setSelectedId(id)}
                  onChangeItem={(id, patch) =>
                    setDesign((prev) =>
                      prev
                        ? {
                            ...prev,
                            items: prev.items.map((it) =>
                              it.itemId === id ? { ...it, ...patch } : it,
                            ),
                          }
                        : prev,
                    )
                  }
                />
              </Canvas>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
