import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import AppDetail from "./pages/AppDetail";
import TourEditor from "./pages/TourEditor";
import EmbedCode from "./pages/EmbedCode";
import LaunchersPage from "./pages/LaunchersPage";
import ChecklistEditor from "./pages/ChecklistEditor";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import UserGuide from "./pages/UserGuide";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import ScribeRecording from "./pages/ScribeRecording";
import ExtensionSimulator from "./pages/ExtensionSimulator";
import WalkThruReport from "./pages/WalkThruReport";
import ExtensionCABReport from "./pages/ExtensionCABReport";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Navigate to="/" replace />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/app/:appId" element={<AppDetail />} />
            <Route path="/app/:appId/tour/:tourId" element={<TourEditor />} />
            <Route path="/app/:appId/tour/:tourId/embed" element={<EmbedCode />} />
            <Route path="/app/:appId/launchers" element={<LaunchersPage />} />
            <Route path="/app/:appId/checklist/:checklistId" element={<ChecklistEditor />} />
            <Route path="/app/:appId/analytics" element={<AnalyticsDashboard />} />
            <Route path="/app/:appId/recording/:recordingId" element={<ScribeRecording />} />
            <Route path="/app/:appId/simulator" element={<ExtensionSimulator />} />
            <Route path="/report" element={<WalkThruReport />} />
            <Route path="/cab-report" element={<ExtensionCABReport />} />
            <Route path="/guide" element={<UserGuide />} />
            <Route path="/account" element={<Account />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;