import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import AppDetail from "./pages/AppDetail";
import TourEditor from "./pages/TourEditor";
import EmbedCode from "./pages/EmbedCode";
import LaunchersPage from "./pages/LaunchersPage";
import ChecklistEditor from "./pages/ChecklistEditor";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import UserGuide from "./pages/UserGuide";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import ScribeRecording from "./pages/ScribeRecording";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/app/:appId" element={<ProtectedRoute><AppDetail /></ProtectedRoute>} />
            <Route path="/app/:appId/tour/:tourId" element={<ProtectedRoute><TourEditor /></ProtectedRoute>} />
            <Route path="/app/:appId/tour/:tourId/embed" element={<ProtectedRoute><EmbedCode /></ProtectedRoute>} />
            <Route path="/app/:appId/launchers" element={<ProtectedRoute><LaunchersPage /></ProtectedRoute>} />
            <Route path="/app/:appId/checklist/:checklistId" element={<ProtectedRoute><ChecklistEditor /></ProtectedRoute>} />
            <Route path="/app/:appId/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
            <Route path="/app/:appId/recording/:recordingId" element={<ProtectedRoute><ScribeRecording /></ProtectedRoute>} />
            <Route path="/guide" element={<ProtectedRoute><UserGuide /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
