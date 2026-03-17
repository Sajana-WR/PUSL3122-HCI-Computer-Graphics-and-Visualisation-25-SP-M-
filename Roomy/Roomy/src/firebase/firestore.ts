import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { getFirebase } from "./firebase";

export type UserProfileDoc = {
  uid: string;
  fullName: string;
  email: string;
  createdAt: Timestamp;
};

export type RoomType =
  | "living_room"
  | "dining_room"
  | "kitchen"
  | "bedroom"
  | "office";

export type RoomShape =
  | "rectangle"
  | "square"
  | "l_shaped"
  | "circular"
  | "open_plan";

export type DesignItem = {
  itemId: string;
  itemName: string;
  category?: FurnitureCategory;
  thumbnail?: string;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  scale: number;
  color: string;
};

export type RoomDesignDoc = {
  id: string;
  userId: string;
  roomName: string;
  roomType: RoomType;
  roomShape: RoomShape;
  roomWidth: number;
  roomLength: number;
  wallColor: string;
  floorColor: string;
  items: DesignItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type FurnitureCategory =
  | "sofa"
  | "armchair"
  | "coffee_table"
  | "tv_stand"
  | "bookshelf"
  | "dining_table"
  | "dining_chair"
  | "sideboard"
  | "cabinet"
  | "kitchen_island"
  | "stool"
  | "refrigerator"
  | "shelf"
  | "bed"
  | "bedside_table"
  | "wardrobe"
  | "dresser"
  | "office_desk"
  | "office_chair"
  | "drawer_unit";

export type FurnitureItemDoc = {
  id: string;
  name: string;
  roomType: RoomType;
  category: FurnitureCategory;
  width: number;
  depth: number;
  height: number;
  thumbnail?: string;
  colorOptions: string[];
  defaultColor: string;
};

function servicesOrThrow() {
  const services = getFirebase();
  if (!services) {
    throw new Error(
      "Firebase is not configured. Set VITE_FIREBASE_* env vars and restart the dev server.",
    );
  }
  return services;
}

function isFirestoreIndexError(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  const message = (err as { message?: unknown }).message;
  return (
    code === "failed-precondition" &&
    typeof message === "string" &&
    message.toLowerCase().includes("requires an index")
  );
}

export async function upsertUserProfile(params: {
  uid: string;
  fullName: string;
  email: string;
}) {
  const { db } = servicesOrThrow();
  const ref = doc(db, "users", params.uid);
  await setDoc(
    ref,
    {
      uid: params.uid,
      fullName: params.fullName,
      email: params.email,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function listRoomDesignsForUser(userId: string, max = 25) {
  const { db } = servicesOrThrow();
  try {
    const q = query(
      collection(db, "roomDesigns"),
      where("userId", "==", userId),
      orderBy("updatedAt", "desc"),
      limit(max),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as RoomDesignDoc);
  } catch (err) {
    if (!isFirestoreIndexError(err)) throw err;
    const q = query(collection(db, "roomDesigns"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => d.data() as RoomDesignDoc);
    docs.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
    return docs.slice(0, max);
  }
}

export async function getRoomDesign(designId: string) {
  const { db } = servicesOrThrow();
  const snap = await getDoc(doc(db, "roomDesigns", designId));
  return snap.exists() ? (snap.data() as RoomDesignDoc) : null;
}

export async function createRoomDesign(
  userId: string,
  params: Omit<
    RoomDesignDoc,
    "id" | "userId" | "items" | "createdAt" | "updatedAt"
  >,
) {
  const { db } = servicesOrThrow();
  const ref = doc(collection(db, "roomDesigns"));
  const id = ref.id;
  await setDoc(ref, {
    id,
    userId,
    ...params,
    items: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function updateRoomDesign(
  designId: string,
  patch: Partial<Omit<RoomDesignDoc, "id" | "userId" | "createdAt">>,
) {
  const { db } = servicesOrThrow();
  const ref = doc(db, "roomDesigns", designId);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

export async function deleteRoomDesign(designId: string) {
  const { db } = servicesOrThrow();
  await deleteDoc(doc(db, "roomDesigns", designId));
}

export async function listFurnitureItems(roomType?: RoomType) {
  const { db } = servicesOrThrow();
  const base = collection(db, "furnitureItems");
  const q = roomType
    ? query(base, where("roomType", "==", roomType))
    : query(base);
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as FurnitureItemDoc);
}

export async function hasAnyFurnitureItems() {
  const { db } = servicesOrThrow();
  const q = query(collection(db, "furnitureItems"), limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function seedFurnitureItems(items: FurnitureItemDoc[]) {
  const { db } = servicesOrThrow();
  await Promise.all(
    items.map((it) => setDoc(doc(db, "furnitureItems", it.id), it)),
  );
}
