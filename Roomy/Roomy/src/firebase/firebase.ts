import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

function readFirebaseConfig(): FirebaseConfig | null {
  const env = import.meta.env;

  const apiKey = env.VITE_FIREBASE_API_KEY as string | undefined;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
  const projectId = env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined;
  const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID as
    | string
    | undefined;
  const appId = env.VITE_FIREBASE_APP_ID as string | undefined;
  const measurementId = env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined;

  if (
    !apiKey ||
    !authDomain ||
    !projectId ||
    !storageBucket ||
    !messagingSenderId ||
    !appId
  ) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
  };
}

let cached: FirebaseServices | null = null;

export function getFirebase(): FirebaseServices | null {
  if (cached) return cached;

  const config = readFirebaseConfig();
  if (!config) return null;

  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);

  cached = { app, auth, db };
  return cached;
}

export function hasFirebaseConfig(): boolean {
  return readFirebaseConfig() !== null;
}
