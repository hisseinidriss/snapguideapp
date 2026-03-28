// Main application component - defines all routes and wraps app with providers (Hissein 3-21-2026)
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

// React Query client instance for caching and state management - Hissein
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* AuthProvider wraps all routes to provide authentication context */}
    <AuthProvider>
      <TooltipProvider>
        {/* Toast notification providers for user feedback */}
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Redirect /auth to dashboard since auth is handled externally */}
            <Route path="/auth" element={<Navigate to="/" replace />} />
            {/* Core application routes */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/app/:appId" element={<AppDetail />} />
            <Route path="/app/:appId/tour/:tourId" element={<TourEditor />} />
            <Route path="/app/:appId/tour/:tourId/embed" element={<EmbedCode />} />
            <Route path="/app/:appId/launchers" element={<LaunchersPage />} />
            <Route path="/app/:appId/checklist/:checklistId" element={<ChecklistEditor />} />
            <Route path="/app/:appId/analytics" element={<AnalyticsDashboard />} />
            {/* Scribe recording page for capturing user interactions (3-15-2026) */}
            <Route path="/app/:appId/recording/:recordingId" element={<ScribeRecording />} />
            <Route path="/app/:appId/simulator" element={<ExtensionSimulator />} />
            {/* Report generation routes - Hissein */}
            <Route path="/report" element={<WalkThruReport />} />
            <Route path="/cab-report" element={<ExtensionCABReport />} />
            <Route path="/guide" element={<UserGuide />} />
            <Route path="/account" element={<Account />} />
            {/* Catch-all for unmatched routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;