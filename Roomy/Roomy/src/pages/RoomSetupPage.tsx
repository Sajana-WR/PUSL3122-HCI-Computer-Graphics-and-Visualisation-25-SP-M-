import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { useAuth } from "../auth/useAuth";
import {
  createRoomDesign,
  type RoomShape,
  type RoomType,
} from "../firebase/firestore";
import { furnitureSeed } from "../data/furnitureSeed";
import { furnitureThumbnailDataUri } from "../data/furnitureThumbnails";

const roomTypes: { label: string; value: RoomType }[] = [
  { label: "Living room", value: "living_room" },
  { label: "Dining room", value: "dining_room" },
  { label: "Kitchen", value: "kitchen" },
  { label: "Bedroom", value: "bedroom" },
  { label: "Office", value: "office" },
];

const roomShapes: { label: string; value: RoomShape }[] = [
  { label: "Rectangle", value: "rectangle" },
  { label: "Square", value: "square" },
  { label: "L-shaped", value: "l_shaped" },
  { label: "Circular", value: "circular" },
  { label: "Open plan", value: "open_plan" },
];

type Step = 1 | 2 | 3;

export function RoomSetupPage() {
  const { user, firebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const userId = user?.uid ?? null;

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [roomName, setRoomName] = useState("My Room");
  const [roomType, setRoomType] = useState<RoomType>("living_room");
  const [roomShape, setRoomShape] = useState<RoomShape>("rectangle");
  const [roomWidth, setRoomWidth] = useState(420);
  const [roomLength, setRoomLength] = useState(300);
  const [wallColor, setWallColor] = useState("#e2e8f0");
  const [floorColor, setFloorColor] = useState("#cbd5e1");

  const diameter = useMemo(
    () => Math.min(roomWidth, roomLength),
    [roomLength, roomWidth],
  );
  const squareSide = useMemo(
    () => Math.min(roomWidth, roomLength),
    [roomLength, roomWidth],
  );

  const canContinueStep1 = useMemo(() => {
    const sizeOk =
      roomShape === "circular"
        ? Number.isFinite(diameter) && diameter >= 120
        : roomShape === "square"
          ? Number.isFinite(squareSide) && squareSide >= 120
          : Number.isFinite(roomWidth) &&
            Number.isFinite(roomLength) &&
            roomWidth >= 120 &&
            roomLength >= 120;
    return roomName.trim().length > 1 && sizeOk;
  }, [diameter, squareSide, roomLength, roomName, roomShape, roomWidth]);

  useEffect(() => {
    if (roomShape !== "circular") return;
    const d = Math.max(120, Math.min(roomWidth, roomLength));
    if (roomWidth !== d) setRoomWidth(d);
    if (roomLength !== d) setRoomLength(d);
  }, [roomLength, roomShape, roomWidth]);

  useEffect(() => {
    if (roomShape !== "square") return;
    const s = Math.max(120, Math.min(roomWidth, roomLength));
    if (roomWidth !== s) setRoomWidth(s);
    if (roomLength !== s) setRoomLength(s);
  }, [roomLength, roomShape, roomWidth]);

  const roomFurniture = useMemo(() => {
    return furnitureSeed.filter((i) => i.roomType === roomType);
  }, [roomType]);

  const steps = useMemo(
    () => [
      {
        id: 1 as const,
        title: "Room Basics",
        subtitle: "Name, type, shape, size",
      },
      {
        id: 2 as const,
        title: "Global Style",
        subtitle: "Walls and floor colors",
      },
      { id: 3 as const, title: "Review", subtitle: "Confirm and continue" },
    ],
    [],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!firebaseConfigured || !userId) return;
    setSubmitting(true);
    setError(null);
    try {
      const designId = await createRoomDesign(userId, {
        roomName: roomName.trim(),
        roomType,
        roomShape,
        roomWidth,
        roomLength,
        wallColor,
        floorColor,
      });
      navigate(`/editor/${designId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create design");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Room setup">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rm-card p-5">
          <div className="text-sm font-semibold text-slate-900">Setup</div>
          <div className="mt-1 text-sm text-slate-600">
            Define the room before placing furniture.
          </div>

          <div className="mt-5 grid gap-3">
            {steps.map((s) => {
              const active = s.id === step;
              const done = s.id < step;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={[
                    "rounded-2xl border px-4 py-3 text-left transition",
                    active
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : done
                        ? "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div
                    className={
                      active
                        ? "mt-1 text-xs text-white/80"
                        : "mt-1 text-xs text-slate-500"
                    }
                  >
                    {s.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={onSubmit} className="rm-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-semibold tracking-tight">
                {step === 1
                  ? "Room Basics"
                  : step === 2
                    ? "Global Style"
                    : "Review"}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {step === 1
                  ? "Choose a room type, shape, and dimensions."
                  : step === 2
                    ? "Pick a wall and floor color."
                    : "Confirm your choices before entering the editor."}
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Room name
                </span>
                <input
                  className="rm-input"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Room type
                </span>
                <select
                  className="rm-input"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value as RoomType)}
                >
                  {roomTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Room shape
                </span>
                <select
                  className="rm-input"
                  value={roomShape}
                  onChange={(e) => setRoomShape(e.target.value as RoomShape)}
                >
                  {roomShapes.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              {roomShape === "circular" ? (
                <label className="grid gap-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">
                    Diameter
                  </span>
                  <input
                    type="number"
                    min={120}
                    className="rm-input"
                    value={diameter}
                    onChange={(e) => {
                      const d = Number(e.target.value);
                      setRoomWidth(d);
                      setRoomLength(d);
                    }}
                  />
                </label>
              ) : roomShape === "square" ? (
                <label className="grid gap-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">
                    Side
                  </span>
                  <input
                    type="number"
                    min={120}
                    className="rm-input"
                    value={squareSide}
                    onChange={(e) => {
                      const s = Number(e.target.value);
                      setRoomWidth(s);
                      setRoomLength(s);
                    }}
                  />
                </label>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      Width
                    </span>
                    <input
                      type="number"
                      min={120}
                      className="rm-input"
                      value={roomWidth}
                      onChange={(e) => setRoomWidth(Number(e.target.value))}
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      Length
                    </span>
                    <input
                      type="number"
                      min={120}
                      className="rm-input"
                      value={roomLength}
                      onChange={(e) => setRoomLength(Number(e.target.value))}
                    />
                  </label>
                </div>
              )}

              <div className="rm-card sm:col-span-2 bg-slate-50/60 p-4">
                <div className="text-sm font-semibold text-slate-900">Tip</div>
                <div className="mt-1 text-sm text-slate-600">
                  Use realistic values (e.g. 420×300) to make furniture feel
                  properly scaled.
                </div>
              </div>

              <div className="rm-card sm:col-span-2 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Furniture for this room type
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      These items will be available in the editor.
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {roomFurniture.map((it) => {
                    const src =
                      it.thumbnail &&
                      (it.thumbnail.startsWith("http") ||
                        it.thumbnail.startsWith("/"))
                        ? it.thumbnail
                        : furnitureThumbnailDataUri({
                            category: it.category,
                            color: it.defaultColor,
                          });
                    return (
                      <div
                        key={it.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <img
                            src={src}
                            alt={it.name}
                            className="h-24 w-full object-cover"
                          />
                        </div>
                        <div className="mt-3 flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {it.name}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              {it.category.replaceAll("_", " ")}
                            </div>
                          </div>
                          <div className="text-xs font-medium text-slate-500">
                            {it.width}×{it.depth}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Wall color
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={wallColor}
                    onChange={(e) => setWallColor(e.target.value)}
                    className="h-11 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                  />
                  <input
                    value={wallColor}
                    onChange={(e) => setWallColor(e.target.value)}
                    className="rm-input flex-1"
                  />
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Floor color
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={floorColor}
                    onChange={(e) => setFloorColor(e.target.value)}
                    className="h-11 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                  />
                  <input
                    value={floorColor}
                    onChange={(e) => setFloorColor(e.target.value)}
                    className="rm-input flex-1"
                  />
                </div>
              </label>

              <div className="sm:col-span-2">
                <div className="rm-card p-5">
                  <div className="text-sm font-semibold text-slate-900">
                    Preview
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="text-xs font-medium text-slate-500">
                        Walls
                      </div>
                      <div
                        className="mt-3 h-16 rounded-xl border border-slate-200"
                        style={{ background: wallColor }}
                      />
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="text-xs font-medium text-slate-500">
                        Floor
                      </div>
                      <div
                        className="mt-3 h-16 rounded-xl border border-slate-200"
                        style={{ background: floorColor }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mt-6 grid gap-4">
              <div className="rm-card bg-slate-50/60 p-5">
                <div className="text-sm font-semibold text-slate-900">
                  Summary
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Name</span>
                    <span className="font-medium">{roomName}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Type</span>
                    <span className="font-medium">
                      {roomType.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Shape</span>
                    <span className="font-medium">
                      {roomShape.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Size</span>
                    <span className="font-medium">
                      {roomShape === "circular"
                        ? `⌀ ${diameter}`
                        : roomShape === "square"
                          ? `${squareSide} × ${squareSide}`
                          : `${roomWidth} × ${roomLength}`}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Wall</span>
                    <span className="font-medium">{wallColor}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Floor</span>
                    <span className="font-medium">{floorColor}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                setStep((prev) => (prev === 1 ? 1 : ((prev - 1) as Step)))
              }
              className="rm-btn-outline px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={step === 1}
            >
              Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !canContinueStep1) return;
                  setStep((prev) => (prev + 1) as Step);
                }}
                className="rm-btn-primary px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  (step === 1 && !canContinueStep1) ||
                  !firebaseConfigured ||
                  !userId
                }
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || !firebaseConfigured || !userId}
                className="rm-btn-primary px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Continue to editor"}
              </button>
            )}
          </div>
        </form>
      </div>
    </AppShell>
  );
}
