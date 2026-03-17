import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { AppShell } from "../components/layout/AppShell";
import {
  deleteRoomDesign,
  listFurnitureItems,
  listRoomDesignsForUser,
  seedFurnitureItems,
  type RoomDesignDoc,
} from "../firebase/firestore";
import { furnitureSeed } from "../data/furnitureSeed";
import { hasRealThumbnail } from "../data/defaultThumbnails";

export function DashboardPage() {
  const { user, firebaseConfigured } = useAuth();
  const navigate = useNavigate();

  const userId = user?.uid ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [designs, setDesigns] = useState<RoomDesignDoc[]>([]);
  const [seeding, setSeeding] = useState(false);

  const isReady = useMemo(
    () => firebaseConfigured && !!userId,
    [firebaseConfigured, userId],
  );

  const refresh = useCallback(async () => {
    if (!isReady || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const items = await listRoomDesignsForUser(userId);
      setDesigns(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load designs");
    } finally {
      setLoading(false);
    }
  }, [isReady, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-6">
        <div className="rm-card p-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="text-2xl font-semibold tracking-tight">
                Your designs
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Create, edit, and visualize room layouts in 2D and 3D.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/room-setup")}
                className="rm-btn-primary px-4 py-2.5"
              >
                <Plus className="h-4 w-4" />
                Create room
              </button>
              <button
                type="button"
                disabled={!isReady || seeding}
                onClick={async () => {
                  if (!isReady) return;
                  setSeeding(true);
                  setError(null);
                  try {
                    const items = await listFurnitureItems();
                    const hasAnyWithImages =
                      items.length > 0 &&
                      items.some((it) => {
                        if (
                          it.thumbnail &&
                          (it.thumbnail.startsWith("http") ||
                            it.thumbnail.startsWith("/"))
                        ) {
                          return true;
                        }
                        return hasRealThumbnail(it.roomType, it.category);
                      });
                    if (!hasAnyWithImages) {
                      await seedFurnitureItems(furnitureSeed);
                    }
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Seeding failed",
                    );
                  } finally {
                    setSeeding(false);
                  }
                }}
                className="rm-btn-outline px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {seeding ? "Seeding…" : "Seed furniture"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Recent projects</div>
            <Link
              to="/room-setup"
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              New design
            </Link>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rm-card-solid p-6 text-sm text-slate-600">
              Loading…
            </div>
          ) : designs.length === 0 ? (
            <div className="rm-card p-6">
              <div className="text-base font-semibold">No designs yet</div>
              <div className="mt-1 text-sm text-slate-600">
                Create your first room design to start placing furniture.
              </div>
              <button
                type="button"
                onClick={() => navigate("/room-setup")}
                className="rm-btn-primary mt-4 px-4 py-2.5"
              >
                <Plus className="h-4 w-4" />
                Create room
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {designs.map((d) => (
                <div
                  key={d.id}
                  className="group rm-card-solid p-5 transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold tracking-tight">
                        {d.roomName}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {d.roomType.replaceAll("_", " ")} •{" "}
                        {d.roomShape.replaceAll("_", " ")} • {d.roomWidth}×
                        {d.roomLength}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 opacity-0 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 group-hover:opacity-100"
                      onClick={async () => {
                        setError(null);
                        try {
                          await deleteRoomDesign(d.id);
                          await refresh();
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Delete failed",
                          );
                        }
                      }}
                      aria-label="Delete design"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/editor/${d.id}`)}
                      className="rm-btn-primary px-4 py-2"
                    >
                      Open editor
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/viewer3d/${d.id}`)}
                      className="rm-btn-outline px-4 py-2"
                    >
                      3D view
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
