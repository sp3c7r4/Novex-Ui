import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { OAuthSuccess } from "@/features/auth/OAuthSuccess";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { AgentPage } from "@/features/agent/AgentPage";
// import Me from "./test/me";

export default function App() {
  return (
    <ThemeProvider>
      
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/oauth-success" element={<OAuthSuccess />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/:workspaceId"
              element={
                <ProtectedRoute>
                  <AgentPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster
            position="top-right"
            theme="dark"
            toastOptions={{
              classNames: {
                toast: "border-border bg-card text-card-foreground",
              },
            }}
          />
        </BrowserRouter>
    </ThemeProvider>
  );
}
