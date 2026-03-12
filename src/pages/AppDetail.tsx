import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Code, Pencil, Crosshair, Sparkles, Loader2, Upload, Circle, Square, Zap, Download, HelpCircle, CheckCircle2, ClipboardList, BarChart3, Menu, ShieldCheck, AlertTriangle, XCircle, CheckCircle, FileText, Video as VideoIcon, GripVertical, MoreVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { generateChromeExtension, type BrowserTarget } from "@/lib/chrome-extension-generator";
import { validateChromeExtension, type ValidationReport } from "@/lib/chrome-extension-validator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import type { Tour, Launcher, LauncherType, Checklist } from "@/types/tour";
import type { ProcessRecording } from "@/types/recording";
import { useToast } from "@/hooks/use-toast";

const LAUNCHER_TYPES: { value: LauncherType; label: string; icon: typeof Circle; desc: string }[] = [
  { value: "beacon", label: "Beacon", icon: Circle, desc: "Pulsing dot that draws attention" },
  { value: "hotspot", label: "Hotspot", icon: Crosshair, desc: "Static indicator on an element" },
  { value: "button", label: "Button", icon: Square, desc: "Labeled button users click to start" },
];
interface SortableTourCardProps {
  tour: Tour;
  index: number;
  stepCount: number;
  editingTourId: string | null;
  editingTourName: string;
  setEditingTourId: (id: string | null) => void;
  setEditingTourName: (name: string) => void;
  handleRenameProcess: (id: string) => void;
  handleAutoGenerate: (id: string) => void;
  handleDeleteProcess: (id: string) => void;
  generating: boolean;
  navigate: (path: string) => void;
  appId: string;
}

const SortableTourCard = ({ tour, index, stepCount, editingTourId, editingTourName, setEditingTourId, setEditingTourName, handleRenameProcess, handleAutoGenerate, handleDeleteProcess, generating, navigate, appId }: SortableTourCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tour.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <Card ref={setNodeRef} style={style} className="p-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none">
            <GripVertical className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            {editingTourId === tour.id ? (
              <Input
                autoFocus
                value={editingTourName}
                onChange={(e) => setEditingTourName(e.target.value)}
                onBlur={() => handleRenameProcess(tour.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameProcess(tour.id);
                  if (e.key === "Escape") setEditingTourId(null);
                }}
                className="h-8 text-sm font-medium"
              />
            ) : (
              <h3
                className="font-medium truncate cursor-pointer hover:text-primary transition-colors"
                onDoubleClick={() => { setEditingTourId(tour.id); setEditingTourName(tour.name); }}
              >
                {tour.name}
              </h3>
            )}
            <p className="text-sm text-muted-foreground">
              {stepCount} step{stepCount !== 1 ? "s" : ""} · Updated {new Date(tour.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/app/${appId}/tour/${tour.id}`)}>
              <Pencil className="mr-2 h-4 w-4" />Edit Steps
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAutoGenerate(tour.id)} disabled={generating}>
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate Steps with AI
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/app/${appId}/tour/${tour.id}/embed`)}>
              <Code className="mr-2 h-4 w-4" />Source Code
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteProcess(tour.id)}>
              <Trash2 className="mr-2 h-4 w-4" />Delete Tour
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
};

const AppDetail = () => {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appName, setAppName] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [tours, setTours] = useState<Tour[]>([]);
  const [launchers, setLaunchers] = useState<Launcher[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [recordings, setRecordings] = useState<ProcessRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [processName, setProcessName] = useState("");
  const [stepCounts, setStepCounts] = useState<Record<string, number>>({});
  const [generatingFromManual, setGeneratingFromManual] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validating, setValidating] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);

  const [editingTourId, setEditingTourId] = useState<string | null>(null);
  const [editingTourName, setEditingTourName] = useState("");

  useEffect(() => {
    if (!appId) return;
    const load = async () => {
      const [appRes, toursRes, launchersRes, checklistsRes, recordingsRes] = await Promise.all([
        supabase.from("apps").select("*").eq("id", appId).single(),
        supabase.from("tours").select("*").eq("app_id", appId).order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
        supabase.from("launchers").select("*").eq("app_id", appId).order("created_at", { ascending: false }),
        supabase.from("checklists").select("*").eq("app_id", appId).order("created_at", { ascending: false }),
        supabase.from("process_recordings").select("*").eq("app_id", appId).order("created_at", { ascending: false }),
      ]);
      if (appRes.data) { setAppName(appRes.data.name); setAppUrl(appRes.data.url || ""); }
      setTours(toursRes.data || []);
      setLaunchers(launchersRes.data || []);
      setChecklists(checklistsRes.data || []);
      setRecordings((recordingsRes.data || []) as unknown as ProcessRecording[]);

      if (toursRes.data?.length) {
        const ids = toursRes.data.map((t) => t.id);
        const { data: steps } = await supabase.from("tour_steps").select("tour_id").in("tour_id", ids);
        const counts: Record<string, number> = {};
        steps?.forEach((s) => { counts[s.tour_id] = (counts[s.tour_id] || 0) + 1; });
        setStepCounts(counts);
      }
      setLoading(false);
    };
    load();
  }, [appId]);

  const handleCreateProcess = async () => {
    if (!processName.trim() || !appId) return;
    const maxOrder = tours.reduce((max, t) => Math.max(max, t.sort_order ?? 0), -1);
    const { error } = await supabase.from("tours").insert({ app_id: appId, name: processName, sort_order: maxOrder + 1 });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    const { data } = await supabase.from("tours").select("*").eq("app_id", appId).order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    setTours(data || []);
    setProcessName(""); setOpen(false);
  };

  const handleDeleteProcess = async (id: string) => {
    await supabase.from("tours").delete().eq("id", id);
    setTours((prev) => prev.filter((t) => t.id !== id));
  };

  const handleRenameProcess = async (id: string) => {
    if (!editingTourName.trim()) { setEditingTourId(null); return; }
    const { error } = await supabase.from("tours").update({ name: editingTourName.trim() }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { setTours((prev) => prev.map((t) => t.id === id ? { ...t, name: editingTourName.trim() } : t)); }
    setEditingTourId(null);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tours.findIndex((t) => t.id === active.id);
    const newIndex = tours.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...tours];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setTours(reordered);
    const updates = reordered.map((t, i) => supabase.from("tours").update({ sort_order: i }).eq("id", t.id));
    await Promise.all(updates);
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appId) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload a file under 10MB.", variant: "destructive" });
      return;
    }
    setGeneratingFromManual(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("generate-tour-from-manual", {
        body: { fileBase64: base64, fileName: file.name, mimeType: file.type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const processes = data.processes || [];
      if (processes.length === 0) {
        toast({ title: "No processes found", description: "Could not extract business processes from this document.", variant: "destructive" });
        return;
      }
      let totalSteps = 0;
      for (const proc of processes) {
        const { data: tourData, error: tourErr } = await supabase
          .from("tours").insert({ app_id: appId, name: proc.name }).select().single();
        if (tourErr || !tourData) continue;
        const stepInserts = (proc.steps || []).map((s: any, i: number) => ({
          tour_id: tourData.id, title: s.title, content: s.content,
          selector: s.selector || "", placement: s.placement || "center", sort_order: i,
        }));
        if (stepInserts.length > 0) {
          await supabase.from("tour_steps").insert(stepInserts);
          totalSteps += stepInserts.length;
        }
      }
      const { data: refreshed } = await supabase.from("tours").select("*").eq("app_id", appId).order("created_at", { ascending: false });
      setTours(refreshed || []);
      if (refreshed?.length) {
        const ids = refreshed.map((t) => t.id);
        const { data: allSteps } = await supabase.from("tour_steps").select("tour_id").in("tour_id", ids);
        const counts: Record<string, number> = {};
        allSteps?.forEach((s) => { counts[s.tour_id] = (counts[s.tour_id] || 0) + 1; });
        setStepCounts(counts);
      }
      toast({ title: "Processes created!", description: `${processes.length} process${processes.length !== 1 ? "es" : ""} with ${totalSteps} total steps extracted.` });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message || "Failed to extract processes from manual.", variant: "destructive" });
    } finally {
      setGeneratingFromManual(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!appName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">App not found</h2>
          <Button variant="ghost" asChild><Link to="/">Go back</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="text-sm font-semibold">{appName}</h1>
              <p className="text-xs text-muted-foreground">{appUrl || "No URL configured"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Desktop buttons */}
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/app/${appId}/analytics`)}>
                <BarChart3 className="mr-2 h-4 w-4" />Analytics
              </Button>
              <Button variant="outline" size="sm" onClick={async () => {
                setValidating(true);
                try {
                  const report = await validateChromeExtension(appId!, appName, appUrl);
                  setValidationReport(report);
                  setValidationDialogOpen(true);
                } catch (e) {
                  toast({ title: "Validation failed", description: String(e), variant: "destructive" });
                } finally {
                  setValidating(false);
                }
              }} disabled={validating}>
                {validating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Validate
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download Extension
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {([
                    { browser: 'chrome' as BrowserTarget, label: 'Chrome Extension' },
                    { browser: 'edge' as BrowserTarget, label: 'Edge Extension' },
                    { browser: 'firefox' as BrowserTarget, label: 'Firefox Extension' },
                  ]).map(({ browser, label }) => (
                    <DropdownMenuItem key={browser} onClick={() => generateChromeExtension(appId!, appName, appUrl, { supabaseUrl: import.meta.env.VITE_SUPABASE_URL, supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, browser)}>
                      <Download className="mr-2 h-4 w-4" />{label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/app/${appId}/analytics`)}>
                    <BarChart3 className="mr-2 h-4 w-4" />Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => {
                    setValidating(true);
                    try {
                      const report = await validateChromeExtension(appId!, appName, appUrl);
                      setValidationReport(report);
                      setValidationDialogOpen(true);
                    } catch (e) {
                      toast({ title: "Validation failed", description: String(e), variant: "destructive" });
                    } finally {
                      setValidating(false);
                    }
                  }}>
                    <ShieldCheck className="mr-2 h-4 w-4" />Validate
                  </DropdownMenuItem>
                  {([
                    { browser: 'chrome' as BrowserTarget, label: 'Chrome Extension' },
                    { browser: 'edge' as BrowserTarget, label: 'Edge Extension' },
                    { browser: 'firefox' as BrowserTarget, label: 'Firefox Extension' },
                  ]).map(({ browser, label }) => (
                    <DropdownMenuItem key={browser} onClick={() => generateChromeExtension(appId!, appName, appUrl, { supabaseUrl: import.meta.env.VITE_SUPABASE_URL, supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, browser)}>
                      <Download className="mr-2 h-4 w-4" />{label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Validation Report Dialog */}
      <Dialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {validationReport?.passed ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              Extension Validation {validationReport?.passed ? "Passed" : "Failed"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {validationReport?.results.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {r.status === "pass" && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />}
                {r.status === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />}
                {r.status === "error" && <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                <span className={r.status === "error" ? "text-destructive" : r.status === "warning" ? "text-yellow-600" : "text-muted-foreground"}>
                  {r.message}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <main className="container py-8 px-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 mb-6">
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.doc,.docx,.txt,.md"
            className="hidden"
            onChange={handleManualUpload}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={generatingFromManual}>
            {generatingFromManual ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import from Manual
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Create Business Process</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create a new business process</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Process Name</Label>
                  <Input placeholder="e.g. Employee Onboarding" value={processName} onChange={(e) => setProcessName(e.target.value)} />
                </div>
                <Button onClick={handleCreateProcess} className="w-full" disabled={!processName.trim()}>Create Business Process</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {tours.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
            <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
              <HelpCircle className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No processes yet</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Create your first business process to get started. You can also import from a manual or documentation.
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tours.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {tours.map((tour, i) => (
                  <SortableTourCard
                    key={tour.id}
                    tour={tour}
                    index={i}
                    stepCount={stepCounts[tour.id] || 0}
                    editingTourId={editingTourId}
                    editingTourName={editingTourName}
                    setEditingTourId={setEditingTourId}
                    setEditingTourName={setEditingTourName}
                    handleRenameProcess={handleRenameProcess}
                    handleDeleteProcess={handleDeleteProcess}
                    navigate={navigate}
                    appId={appId!}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>
    </div>
  );
};

export default AppDetail;