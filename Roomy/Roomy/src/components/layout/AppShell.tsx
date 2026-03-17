import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LogOut, Sofa } from "lucide-react";
import { useAuth } from "../../auth/useAuth";

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col text-slate-900">
      <div className="sticky top-0 z-10 border-b border-white/40 bg-white/55 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-indigo-700 text-white shadow-sm ring-1 ring-white/30">
              <Sofa className="h-5 w-5" />
            </span>
            <span className="text-lg">Roomify</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 md:flex">
              <span className="rm-pill">{title}</span>
              {user?.email ? (
                <span className="text-sm font-medium text-slate-600">
                  {user.email}
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => signOut()}
              className="rm-btn-outline"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-7xl px-4 pb-8 pt-2">
        <div className="rm-card flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
          <div className="text-sm font-semibold text-slate-900">Roomify</div>
          <div className="text-sm text-slate-600">
            © {new Date().getFullYear()} • Design in 2D, explore in 3D
          </div>
        </div>
      </footer>
    </div>
  );
}
