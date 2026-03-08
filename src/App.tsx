import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AppDetail from "./pages/AppDetail";
import TourEditor from "./pages/TourEditor";
import EmbedCode from "./pages/EmbedCode";
import LaunchersPage from "./pages/LaunchersPage";
import ChecklistEditor from "./pages/ChecklistEditor";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import UserGuide from "./pages/UserGuide";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/app/:appId" element={<AppDetail />} />
          <Route path="/app/:appId/tour/:tourId" element={<TourEditor />} />
          <Route path="/app/:appId/tour/:tourId/embed" element={<EmbedCode />} />
          <Route path="/app/:appId/launchers" element={<LaunchersPage />} />
          <Route path="/app/:appId/checklist/:checklistId" element={<ChecklistEditor />} />
          <Route path="/app/:appId/analytics" element={<AnalyticsDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
