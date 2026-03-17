import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export function SignupPage() {
  const { user, loading, firebaseConfigured, signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <div className="text-3xl font-extrabold tracking-tight">Roomify</div>
          <div className="mt-1 text-sm text-slate-600">
            Create an account to save designs.
          </div>
        </div>

        <form
          onSubmit={async (e: FormEvent) => {
            e.preventDefault();
            setError(null);
            try {
              if (password !== confirmPassword) {
                setError("Passwords do not match");
                return;
              }
              await signUp({ fullName, email, password });
            } catch (err) {
              setError(err instanceof Error ? err.message : "Signup failed");
            }
          }}
          className="rm-card grid gap-4 p-5"
        >
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Full name</span>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rm-input"
            />
          </label>

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

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">
              Confirm password
            </span>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? "Loading…" : "Create account"}
          </button>

          <div className="text-sm text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-slate-900">
              Log in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
