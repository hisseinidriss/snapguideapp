import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Code, Pencil, Crosshair, Sparkles, Loader2, Upload, Circle, Square, Zap, Download, HelpCircle, CheckCircle2, ClipboardList, BarChart3, Menu, ShieldCheck, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { generateChromeExtension } from "@/lib/chrome-extension-generator";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import type { Tour, Launcher, LauncherType, Checklist } from "@/types/tour";
import { useToast } from "@/hooks/use-toast";

const LAUNCHER_TYPES: { value: LauncherType; label: string; icon: typeof Circle; desc: string }[] = [
  { value: "beacon", label: "Beacon", icon: Circle, desc: "Pulsing dot that draws attention" },
  { value: "hotspot", label: "Hotspot", icon: Crosshair, desc: "Static indicator on an element" },
  { value: "button", label: "Button", icon: Square, desc: "Labeled button users click to start" },
];

const AppDetail = () => {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appName, setAppName] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [tours, setTours] = useState<Tour[]>([]);
  const [launchers, setLaunchers] = useState<Launcher[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
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

  const [checklistOpen, setChecklistOpen] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState("");

  const [launcherOpen, setLauncherOpen] = useState(false);
  const [newLauncherName, setNewLauncherName] = useState("");
  const [newLauncherType, setNewLauncherType] = useState<LauncherType>("beacon");
  const [selectedLauncherId, setSelectedLauncherId] = useState<string | null>(null);

  useEffect(() => {
    if (!appId) return;
    const load = async () => {
      const [appRes, toursRes, launchersRes, checklistsRes] = await Promise.all([
        supabase.from("apps").select("*").eq("id", appId).single(),
        supabase.from("tours").select("*").eq("app_id", appId).order("created_at", { ascending: false }),
        supabase.from("launchers").select("*").eq("app_id", appId).order("created_at", { ascending: false }),
        supabase.from("checklists").select("*").eq("app_id", appId).order("created_at", { ascending: false }),
      ]);
      if (appRes.data) { setAppName(appRes.data.name); setAppUrl(appRes.data.url || ""); }
      setTours(toursRes.data || []);
      setLaunchers(launchersRes.data || []);
      setChecklists(checklistsRes.data || []);

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
    const { error } = await supabase.from("tours").insert({ app_id: appId, name: processName });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    const { data } = await supabase.from("tours").select("*").eq("app_id", appId).order("created_at", { ascending: false });
    setTours(data || []);
    setProcessName(""); setOpen(false);
  };

  const handleDeleteProcess = async (id: string) => {
    await supabase.from("tours").delete().eq("id", id);
    setTours((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAutoGenerate = async (tourId: string) => {
    if (!appUrl) {
      toast({ title: "No URL", description: "This app has no URL configured. Edit the app to add one.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const tour = tours.find((t) => t.id === tourId);
      const { data, error } = await supabase.functions.invoke("generate-tour-steps", {
        body: { url: appUrl, tourName: tour?.name || "Onboarding" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const steps = data.steps || [];
      if (steps.length === 0) {
        toast({ title: "No steps generated", description: "AI couldn't generate steps from this page.", variant: "destructive" });
        return;
      }
      const inserts = steps.map((s: any, i: number) => ({
        tour_id: tourId, title: s.title, content: s.content,
        selector: s.selector || "", placement: s.placement || "bottom", sort_order: i,
      }));
      const { error: insertError } = await supabase.from("tour_steps").insert(inserts);
      if (insertError) throw insertError;
      toast({ title: "Steps generated!", description: `${steps.length} steps were created from your page content.` });
      setStepCounts((prev) => ({ ...prev, [tourId]: (prev[tourId] || 0) + steps.length }));
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
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

  const handleCreateLauncher = async () => {
    if (!newLauncherName.trim() || !appId) return;
    const { data, error } = await supabase
      .from("launchers").insert({ app_id: appId, name: newLauncherName, type: newLauncherType }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (data) {
      setLaunchers((prev) => [data, ...prev]);
      setSelectedLauncherId(data.id);
    }
    setNewLauncherName(""); setNewLauncherType("beacon"); setLauncherOpen(false);
  };

  const handleDeleteLauncher = async (id: string) => {
    await supabase.from("launchers").delete().eq("id", id);
    const next = launchers.filter((l) => l.id !== id);
    setLaunchers(next);
    if (selectedLauncherId === id) setSelectedLauncherId(next[0]?.id || null);
  };

  const updateLauncher = async (id: string, updates: Partial<Launcher>) => {
    setLaunchers((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    const cleanUpdates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (!["id", "created_at", "updated_at", "app_id"].includes(k)) cleanUpdates[k] = v;
    }
    await supabase.from("launchers").update(cleanUpdates).eq("id", id);
  };

  const handleCreateChecklist = async () => {
    if (!newChecklistName.trim() || !appId) return;
    const { data, error } = await supabase
      .from("checklists").insert({ app_id: appId, name: newChecklistName }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (data) setChecklists((prev) => [data, ...prev]);
    setNewChecklistName(""); setChecklistOpen(false);
  };

  const handleDeleteChecklist = async (id: string) => {
    await supabase.from("checklists").delete().eq("id", id);
    setChecklists((prev) => prev.filter((c) => c.id !== id));
  };

  const selectedLauncher = launchers.find((l) => l.id === selectedLauncherId);

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
        <div className="container flex h-16 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{appName}</h1>
            {appUrl && <p className="text-xs text-muted-foreground truncate">{appUrl}</p>}
          </div>
          
          {/* Desktop actions */}
          <div className="hidden md:flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Installation instructions">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Install Chrome Extension</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Follow these steps to install the downloaded extension in Google Chrome:
                  </p>
                  <ol className="space-y-3">
                    {[
                      { step: "Click the \"Chrome Extension\" button to download the ZIP file." },
                      { step: "Extract/unzip the downloaded file to a folder on your computer." },
                      { step: "Open Chrome and navigate to chrome://extensions" },
                      { step: "Enable \"Developer mode\" using the toggle in the top-right corner." },
                      { step: "Click \"Load unpacked\" and select the extracted folder." },
                      { step: "The extension icon will appear in your toolbar. Visit your app URL to see it in action!" },
                    ].map((item, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{item.step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={() => navigate(`/app/${appId}/analytics`)}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
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
              }}
              disabled={validating}
            >
              {validating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Validate
            </Button>
            <Button variant="outline" size="sm" onClick={() => generateChromeExtension(appId!, appName, appUrl)}>
              <Download className="mr-2 h-4 w-4" />
              Chrome Extension
            </Button>
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
                  <ShieldCheck className="mr-2 h-4 w-4" />Validate Extension
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => generateChromeExtension(appId!, appName, appUrl)}>
                  <Download className="mr-2 h-4 w-4" />Chrome Extension
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          {validationReport?.passed && (
            <div className="pt-4">
              <Button className="w-full" onClick={() => { setValidationDialogOpen(false); generateChromeExtension(appId!, appName, appUrl); }}>
                <Download className="mr-2 h-4 w-4" />
                Download Extension
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <main className="container py-8 px-4">
        <Tabs defaultValue="processes" className="w-full">
          <TabsList className="mb-6 w-full sm:w-auto">
            <TabsTrigger value="processes" className="text-xs sm:text-sm">Processes ({tours.length})</TabsTrigger>
            <TabsTrigger value="checklists" className="text-xs sm:text-sm">Checklists ({checklists.length})</TabsTrigger>
            <TabsTrigger value="extensions" className="text-xs sm:text-sm">Extensions ({launchers.length})</TabsTrigger>
          </TabsList>

          {/* === Business Processes Tab === */}
          <TabsContent value="processes">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 mb-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                className="hidden"
                onChange={handleManualUpload}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={generatingFromManual} className="w-full sm:w-auto">
                {generatingFromManual ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Extracting...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" />Upload Manual</>
                )}
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />New Business Process</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create a new business process</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <Input placeholder="Process name (e.g. Add New Record)" value={processName} onChange={(e) => setProcessName(e.target.value)} />
                    <Button onClick={handleCreateProcess} className="w-full">Create Process</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {tours.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
                <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                  <Pencil className="h-8 w-8 text-accent" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">No business processes yet</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  Upload a user manual to auto-extract processes, or create one manually.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={generatingFromManual}>
                    {generatingFromManual ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Extracting...</>
                    ) : (
                      <><Upload className="mr-2 h-4 w-4" />Upload Manual</>
                    )}
                  </Button>
                  <Button onClick={() => setOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />Create Manually
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {tours.map((tour, i) => (
                  <Card key={tour.id} className="p-4 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-medium truncate">{tour.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {stepCounts[tour.id] || 0} step{(stepCounts[tour.id] || 0) !== 1 ? "s" : ""} · Updated {new Date(tour.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => handleAutoGenerate(tour.id)} disabled={generating}>
                          {generating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                          <span className="hidden sm:inline">AI Generate</span>
                          <span className="sm:hidden">AI</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/app/${appId}/tour/${tour.id}/embed`)}>
                          <Code className="mr-1 h-3 w-3" /><span className="hidden sm:inline">Embed</span>
                        </Button>
                        <Button size="sm" onClick={() => navigate(`/app/${appId}/tour/${tour.id}`)}>
                          <Pencil className="mr-1 h-3 w-3" />Edit
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteProcess(tour.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* === Checklists Tab === */}
          <TabsContent value="checklists">
            <div className="flex items-center justify-end mb-6">
              <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />New Checklist</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create a checklist</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <Input placeholder="e.g. New Employee Onboarding" value={newChecklistName} onChange={(e) => setNewChecklistName(e.target.value)} />
                    <Button onClick={handleCreateChecklist} className="w-full">Create Checklist</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {checklists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
                <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                  <ClipboardList className="h-8 w-8 text-accent" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">No checklists yet</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  Group your business processes into checklists so users can track their progress through multi-step workflows.
                </p>
                <Button onClick={() => setChecklistOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />Create Checklist
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {checklists.map((checklist, i) => (
                  <Card key={checklist.id} className="p-4 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${checklist.is_active ? "bg-success" : "bg-muted-foreground/30"}`} />
                        <div>
                          <h3 className="font-medium">{checklist.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {checklist.is_active ? "Active" : "Inactive"} · Updated {new Date(checklist.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => navigate(`/app/${appId}/checklist/${checklist.id}`)}>
                          <Pencil className="mr-1 h-3 w-3" />Edit
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteChecklist(checklist.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* === Extensions Tab === */}
          <TabsContent value="extensions">
            <div className="flex items-center justify-end mb-6">
              <Dialog open={launcherOpen} onOpenChange={setLauncherOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />Add Extension</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create an extension</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input placeholder="e.g. Help beacon" value={newLauncherName} onChange={(e) => setNewLauncherName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {LAUNCHER_TYPES.map((t) => (
                          <button
                            key={t.value}
                            onClick={() => setNewLauncherType(t.value)}
                            className={`p-3 rounded-lg border text-center transition-colors ${
                              newLauncherType === t.value ? "border-primary bg-primary/5" : "hover:bg-muted"
                            }`}
                          >
                            <t.icon className="h-5 w-5 mx-auto mb-1 text-primary" />
                            <p className="text-xs font-medium">{t.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleCreateLauncher} className="w-full">Create Extension</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {launchers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
                <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                  <Zap className="h-8 w-8 text-accent" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">No extensions yet</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  Add beacons, hotspots, or buttons to trigger business processes in your app.
                </p>
                <Button onClick={() => setLauncherOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />Add Extension
                </Button>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Extension list */}
                <div className="flex lg:flex-col gap-2 lg:w-64 overflow-x-auto lg:overflow-x-visible shrink-0">
                  {launchers.map((launcher) => (
                    <button
                      key={launcher.id}
                      onClick={() => setSelectedLauncherId(launcher.id)}
                      className={`text-left p-3 rounded-lg flex items-center gap-3 transition-colors shrink-0 lg:w-full ${
                        selectedLauncherId === launcher.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent"
                      }`}
                    >
                      <div
                        className="h-4 w-4 rounded-full shrink-0"
                        style={{ backgroundColor: launcher.color || "#1e6b45", opacity: launcher.is_active ? 1 : 0.3 }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{launcher.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{launcher.type}{!launcher.is_active ? " · Inactive" : ""}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Extension editor */}
                <div className="flex-1">
                  {selectedLauncher ? (
                    <Card className="p-6 animate-fade-in">
                      <div className="max-w-lg space-y-5">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-semibold">Edit Extension</h2>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteLauncher(selectedLauncher.id)}>
                            <Trash2 className="mr-1 h-3 w-3" />Remove
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input value={selectedLauncher.name} onChange={(e) => updateLauncher(selectedLauncher.id, { name: e.target.value })} />
                        </div>

                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select value={selectedLauncher.type} onValueChange={(v) => updateLauncher(selectedLauncher.id, { type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {LAUNCHER_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label} — {t.desc}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>CSS Selector</Label>
                          <Input
                            value={selectedLauncher.selector}
                            onChange={(e) => updateLauncher(selectedLauncher.id, { selector: e.target.value })}
                            placeholder=".help-btn or #sidebar-trigger"
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">Element to attach the extension to.</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Linked Process</Label>
                          <Select
                            value={selectedLauncher.tour_id || "none"}
                            onValueChange={(v) => updateLauncher(selectedLauncher.id, { tour_id: v === "none" ? null : v })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No process linked</SelectItem>
                              {tours.map((t) => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedLauncher.type === "button" && (
                          <div className="space-y-2">
                            <Label>Button Label</Label>
                            <Input
                              value={selectedLauncher.label || ""}
                              onChange={(e) => updateLauncher(selectedLauncher.id, { label: e.target.value })}
                              placeholder="Help"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Color</Label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={selectedLauncher.color || "#1e6b45"}
                              onChange={(e) => updateLauncher(selectedLauncher.id, { color: e.target.value })}
                              className="h-10 w-14 rounded border cursor-pointer"
                            />
                            <Input
                              value={selectedLauncher.color || "#1e6b45"}
                              onChange={(e) => updateLauncher(selectedLauncher.id, { color: e.target.value })}
                              className="font-mono text-sm w-32"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Pulse Animation</Label>
                            <p className="text-xs text-muted-foreground">Add a pulsing glow effect</p>
                          </div>
                          <Switch checked={selectedLauncher.pulse ?? true} onCheckedChange={(v) => updateLauncher(selectedLauncher.id, { pulse: v })} />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Active</Label>
                            <p className="text-xs text-muted-foreground">Include in embed script</p>
                          </div>
                          <Switch checked={selectedLauncher.is_active ?? true} onCheckedChange={(v) => updateLauncher(selectedLauncher.id, { is_active: v })} />
                        </div>

                        <Card className="p-4 bg-muted/50">
                          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Preview</p>
                          <div className="relative bg-card rounded-lg p-8 border min-h-[100px] flex items-center justify-center">
                            {selectedLauncher.type === "button" ? (
                              <button
                                className="px-4 py-2 rounded-full text-sm font-medium shadow-md"
                                style={{ backgroundColor: selectedLauncher.color || "#1e6b45", color: "#fff" }}
                              >
                                {selectedLauncher.label || "Help"}
                              </button>
                            ) : (
                              <div
                                className={`h-4 w-4 rounded-full ${selectedLauncher.pulse ? "animate-pulse-soft" : ""}`}
                                style={{ backgroundColor: selectedLauncher.color || "#1e6b45" }}
                              />
                            )}
                          </div>
                        </Card>
                      </div>
                    </Card>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground">
                      <p>Select an extension to edit, or add a new one.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AppDetail;
