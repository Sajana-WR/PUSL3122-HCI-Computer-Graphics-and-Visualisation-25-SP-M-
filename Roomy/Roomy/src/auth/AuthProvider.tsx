import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebase, hasFirebaseConfig } from "../firebase/firebase";
import { upsertUserProfile } from "../firebase/firestore";
import { AuthContext, type AuthContextValue } from "./authContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const firebaseConfigured = hasFirebaseConfig();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) return;

    const services = getFirebase();
    if (!services) return;

    const unsubscribe = onAuthStateChanged(services.auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseConfigured]);

  const value = useMemo<AuthContextValue>(() => {
    const services = getFirebase();

    const requireAuth = () => {
      if (!services) {
        throw new Error(
          "Firebase is not configured. Set VITE_FIREBASE_* env vars and restart the dev server.",
        );
      }
      return services.auth;
    };

    return {
      user,
      loading,
      firebaseConfigured,
      signUp: async ({ fullName, email, password }) => {
        const cred = await createUserWithEmailAndPassword(
          requireAuth(),
          email,
          password,
        );
        await upsertUserProfile({
          uid: cred.user.uid,
          fullName,
          email: cred.user.email ?? email,
        });
      },
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(requireAuth(), email, password);
      },
      signOut: async () => {
        await firebaseSignOut(requireAuth());
      },
    };
  }, [firebaseConfigured, loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
