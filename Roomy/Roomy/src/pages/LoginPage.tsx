import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

type LocationState = {
  from?: string;
};

export function LoginPage() {
  const { user, loading, firebaseConfigured, signIn } = useAuth();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    const state = location.state as LocationState | null;
    return state?.from ?? "/";
  }, [location.state]);

  if (!loading && user) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <div className="text-3xl font-extrabold tracking-tight">Roomify</div>
          <div className="mt-1 text-sm text-slate-600">
            Log in to start designing rooms.
          </div>
        </div>

        {!firebaseConfigured ? (
          <div className="rm-card mb-4 p-4">
            <div className="text-sm font-semibold text-slate-900">
              Firebase not configured
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN,
              VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET,
              VITE_FIREBASE_MESSAGING_SENDER_ID, and VITE_FIREBASE_APP_ID in
              your Vite environment, then restart the dev server.
            </div>
          </div>
        ) : null}

        <form
          onSubmit={async (e: FormEvent) => {
            e.preventDefault();
            setError(null);
            try {
              await signIn(email, password);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Login failed");
            }
          }}
          className="rm-card grid gap-4 p-5"
        >
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rm-input"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rm-input"
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-700 backdrop-blur">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !firebaseConfigured}
            className="rm-btn-primary h-11"
          >
            {loading ? "Loading…" : "Log in"}
          </button>

          <div className="text-sm text-slate-600">
            No account?{" "}
            <Link to="/signup" className="font-semibold text-slate-900">
              Create one
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
