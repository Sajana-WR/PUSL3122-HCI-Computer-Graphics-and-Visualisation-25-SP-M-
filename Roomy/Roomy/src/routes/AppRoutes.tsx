import { Route, Routes } from "react-router-dom";
import { RequireAuth } from "./RequireAuth";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { SignupPage } from "../pages/SignupPage";
import { RoomSetupPage } from "../pages/RoomSetupPage";
import { RoomEditorPage } from "../pages/RoomEditorPage";
import { RoomViewer3DPage } from "../pages/RoomViewer3DPage";
import { NotFoundPage } from "../pages/NotFoundPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />

      <Route
        path="/room-setup"
        element={
          <RequireAuth>
            <RoomSetupPage />
          </RequireAuth>
        }
      />
      <Route
        path="/editor/:designId"
        element={
          <RequireAuth>
            <RoomEditorPage />
          </RequireAuth>
        }
      />
      <Route
        path="/viewer3d/:designId"
        element={
          <RequireAuth>
            <RoomViewer3DPage />
          </RequireAuth>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
