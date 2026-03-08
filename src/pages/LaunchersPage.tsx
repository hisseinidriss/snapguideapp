import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Crosshair, Circle, Square, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Launcher, Tour, LauncherType } from "@/types/tour";
import { useToast } from "@/hooks/use-toast";

const LAUNCHER_TYPES: { value: LauncherType; label: string; icon: typeof Circle; desc: string }[] = [
  { value: "beacon", label: "Beacon", icon: Circle, desc: "Pulsing dot that draws attention" },
  { value: "hotspot", label: "Hotspot", icon: Crosshair, desc: "Static indicator on an element" },
  { value: "button", label: "Button", icon: Square, desc: "Labeled button users click to start" },
];

const LaunchersPage = () => {
  const { appId } = useParams<{ appId: string }>();
  const { toast } = useToast();
  const [appName, setAppName] = useState("");
  const [launchers, setLaunchers] = useState<Launcher[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // New launcher form
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<LauncherType>("beacon");

  useEffect(() => {
    if (!appId) return;
    const load = async () => {
      const [appRes, launchersRes, toursRes] = await Promise.all([
        supabase.from("apps").select("name").eq("id", appId).single(),
        supabase.from("launchers").select("*").eq("app_id", appId).order("created_at"),
        supabase.from("tours").select("*").eq("app_id", appId).order("name"),
      ]);
      setAppName(appRes.data?.name || "");
      setLaunchers(launchersRes.data || []);
      setTours(toursRes.data || []);
      if (launchersRes.data?.length) setSelectedId(launchersRes.data[0].id);
      setLoading(false);
    };
    load();
  }, [appId]);

  const handleCreate = async () => {
    if (!newName.trim() || !appId) return;
    const { data, error } = await supabase
      .from("launchers")
      .insert({ app_id: appId, name: newName, type: newType })
      .select()
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (data) {
      setLaunchers((prev) => [...prev, data]);
      setSelectedId(data.id);
    }
    setNewName(""); setNewType("beacon"); setOpen(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("launchers").delete().eq("id", id);
    const next = launchers.filter((l) => l.id !== id);
    setLaunchers(next);
    if (selectedId === id) setSelectedId(next[0]?.id || null);
  };

  const updateLauncher = async (id: string, updates: Partial<Launcher>) => {
    setLaunchers((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    const cleanUpdates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (!["id", "created_at", "updated_at", "app_id"].includes(k)) cleanUpdates[k] = v;
    }
    await supabase.from("launchers").update(cleanUpdates).eq("id", id);
  };

  const selected = launchers.find((l) => l.id === selectedId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card shrink-0">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/app/${appId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold">Launchers & Beacons</h1>
            <p className="text-xs text-muted-foreground">{appName}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" />Add Launcher
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create a launcher</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="e.g. Help beacon" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {LAUNCHER_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setNewType(t.value)}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          newType === t.value ? "border-primary bg-primary/5" : "hover:bg-muted"
                        }`}
                      >
                        <t.icon className="h-5 w-5 mx-auto mb-1 text-primary" />
                        <p className="text-xs font-medium">{t.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full">Create Launcher</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Launcher List */}
        <div className="w-72 border-r bg-card overflow-y-auto shrink-0 p-2 space-y-1">
          {launchers.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No launchers yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Add a beacon or button to trigger tours.</p>
            </div>
          ) : (
            launchers.map((launcher) => (
              <button
                key={launcher.id}
                onClick={() => setSelectedId(launcher.id)}
                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                  selectedId === launcher.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                }`}
              >
                <div
                  className="h-4 w-4 rounded-full shrink-0"
                  style={{ backgroundColor: launcher.color || "#1e6b45", opacity: launcher.is_active ? 1 : 0.3 }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{launcher.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{launcher.type}{!launcher.is_active ? " · Inactive" : ""}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Launcher Editor */}
        <div className="flex-1 overflow-y-auto p-6">
          {selected ? (
            <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Edit Launcher</h2>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(selected.id)}>
                  <Trash2 className="mr-1 h-3 w-3" />Remove
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={selected.name} onChange={(e) => updateLauncher(selected.id, { name: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={selected.type} onValueChange={(v) => updateLauncher(selected.id, { type: v })}>
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
                  value={selected.selector}
                  onChange={(e) => updateLauncher(selected.id, { selector: e.target.value })}
                  placeholder=".help-btn or #sidebar-trigger"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Element to attach the launcher to. Leave empty for a floating button.</p>
              </div>

              <div className="space-y-2">
                <Label>Linked Tour</Label>
                <Select
                  value={selected.tour_id || "none"}
                  onValueChange={(v) => updateLauncher(selected.id, { tour_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No tour linked</SelectItem>
                    {tours.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selected.type === "button" && (
                <div className="space-y-2">
                  <Label>Button Label</Label>
                  <Input
                    value={selected.label || ""}
                    onChange={(e) => updateLauncher(selected.id, { label: e.target.value })}
                    placeholder="Help"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={selected.color || "#1e6b45"}
                    onChange={(e) => updateLauncher(selected.id, { color: e.target.value })}
                    className="h-10 w-14 rounded border cursor-pointer"
                  />
                  <Input
                    value={selected.color || "#1e6b45"}
                    onChange={(e) => updateLauncher(selected.id, { color: e.target.value })}
                    className="font-mono text-sm w-32"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Pulse Animation</Label>
                  <p className="text-xs text-muted-foreground">Add a pulsing glow effect</p>
                </div>
                <Switch checked={selected.pulse ?? true} onCheckedChange={(v) => updateLauncher(selected.id, { pulse: v })} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Include in embed script</p>
                </div>
                <Switch checked={selected.is_active ?? true} onCheckedChange={(v) => updateLauncher(selected.id, { is_active: v })} />
              </div>

              {/* Preview */}
              <Card className="p-4 bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Preview</p>
                <div className="relative bg-card rounded-lg p-8 border min-h-[100px] flex items-center justify-center">
                  {selected.type === "button" ? (
                    <button
                      className="px-4 py-2 rounded-full text-sm font-medium shadow-md"
                      style={{ backgroundColor: selected.color || "#1e6b45", color: "#fff" }}
                    >
                      {selected.label || "Help"}
                    </button>
                  ) : (
                    <div
                      className={`h-4 w-4 rounded-full ${selected.pulse ? "animate-pulse-soft" : ""}`}
                      style={{ backgroundColor: selected.color || "#1e6b45" }}
                    />
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Select a launcher to edit, or add a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LaunchersPage;
