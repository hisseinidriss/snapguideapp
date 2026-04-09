import { useState, useEffect, useRef } from "react";
import { Plus, Globe, MoreVertical, Trash2, ArrowRight, Pencil, ImagePlus, LayoutGrid, List, Download } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appsApi } from "@/api/apps";
import { useAuth } from "@/contexts/AuthContext";
import type { App } from "@/types/app";
import { useToast } from "@/hooks/use-toast";
import { generateAppColor, generateAppAccent } from "@/lib/app-colors";

const Dashboard = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => (localStorage.getItem("snapguide_view_mode") as "grid" | "list") || "grid");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editApp, setEditApp] = useState<App | null>(null);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchApps = async () => {
    const { data, error } = await appsApi.list();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setApps(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, []);

  const uploadIcon = async (file: File, appId: string): Promise<string | null> => {
    const { data, error } = await appsApi.uploadIcon(appId, file);
    if (error) {
      toast({ title: "Icon upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    return data?.icon_url || null;
  };

  const handleIconSelect = (file: File | undefined) => {
    if (!file) return;
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const { data: inserted, error } = await appsApi.create({ name: newName, url: newUrl, description: newDesc });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    if (iconFile && inserted) {
      const iconUrl = await uploadIcon(iconFile, inserted.id);
      if (iconUrl) {
        await appsApi.update(inserted.id, { icon_url: iconUrl } as any);
      }
    }
    await fetchApps();
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setNewName(""); setNewUrl(""); setNewDesc("");
    setIconFile(null); setIconPreview(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await appsApi.delete(id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setApps((prev) => prev.filter((a) => a.id !== id));
  };

  const openEdit = (app: App) => {
    setEditApp(app);
    setNewName(app.name);
    setNewUrl(app.url || "");
    setNewDesc(app.description || "");
    setIconPreview(app.icon_url || null);
    setIconFile(null);
  };

  const handleEdit = async () => {
    if (!editApp || !newName.trim()) return;
    let iconUrl = editApp.icon_url;
    if (iconFile) {
      iconUrl = await uploadIcon(iconFile, editApp.id);
    }
    const { error } = await appsApi.update(editApp.id, { name: newName, url: newUrl, description: newDesc, icon_url: iconUrl } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await fetchApps();
    setEditApp(null);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SG</span>
            </div>
            <h1 className="text-lg font-semibold">SnapGuide</h1>
          </div>

          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              className="px-4 shadow-sm"
              onClick={() => {
                fetch("/snapguide-scribe.zip")
                  .then(r => { if (!r.ok) throw new Error("Download failed"); return r.blob(); })
                  .then(blob => {
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "snapguide-scribe.zip";
                    a.click();
                    URL.revokeObjectURL(a.href);
                  })
                  .catch(err => toast({ title: "Error", description: err.message, variant: "destructive" }));
              }}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Get Extension
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="px-4 shadow-sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  New App
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a new application</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input placeholder="App name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  <Input placeholder="https://yourapp.com (optional)" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
                  <Textarea placeholder="Brief description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} />
                  <div>
                    <Label className="text-sm mb-1.5 block">App Icon</Label>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleIconSelect(e.target.files?.[0])} />
                    <div className="flex items-center gap-3">
                      {iconPreview ? (
                        <img src={iconPreview} alt="Icon preview" className="h-10 w-10 rounded-lg object-cover border" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center">
                          <ImagePlus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        {iconPreview ? "Change" : "Upload"}
                      </Button>
                      {iconPreview && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setIconFile(null); setIconPreview(null); }}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button onClick={handleCreate} className="w-full">Create App</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container py-8 px-4">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No apps yet</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Create your first application to start documenting processes with SnapGuide.
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First App
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex justify-end mb-4">
              <div className="flex items-center border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  onClick={() => { setViewMode("grid"); localStorage.setItem("snapguide_view_mode", "grid"); }}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  onClick={() => { setViewMode("list"); localStorage.setItem("snapguide_view_mode", "list"); }}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {viewMode === "grid" ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {apps.map((app, i) => (
                  <Card key={app.id} className="p-5 hover:shadow-md transition-shadow animate-fade-in overflow-hidden relative" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="absolute inset-x-0 top-0 h-2 rounded-t-lg" style={{ backgroundColor: generateAppColor(app.name) }} />
                    <div className="flex items-start justify-between mb-3 pt-1">
                      {app.icon_url ? (
                        <img src={app.icon_url} alt={app.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: generateAppColor(app.name) }}>
                          <span className="font-bold" style={{ color: generateAppAccent(app.name) }}>{app.name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(app)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(app.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h3 className="font-semibold mb-1">{app.name}</h3>
                    {app.url && <p className="text-xs text-muted-foreground mb-2 truncate">{app.url}</p>}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{app.description || "No description"}</p>
                    <Button variant="ghost" size="sm" asChild style={{ color: generateAppAccent(app.name) }}>
                      <Link to={`/app/${app.id}`}>
                        Open
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {apps.map((app, i) => (
                  <Card key={app.id} className="p-4 hover:shadow-md transition-shadow animate-fade-in flex items-center gap-4" style={{ animationDelay: `${i * 50}ms`, borderLeft: `4px solid ${generateAppColor(app.name)}` }}>
                    {app.icon_url ? (
                      <img src={app.icon_url} alt={app.name} className="h-9 w-9 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: generateAppColor(app.name) }}>
                        <span className="font-bold text-sm" style={{ color: generateAppAccent(app.name) }}>{app.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{app.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{app.url || app.description || "No description"}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" asChild style={{ color: generateAppAccent(app.name) }}>
                        <Link to={`/app/${app.id}`}>
                          Open
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(app)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(app.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Edit App Dialog */}
      <Dialog open={!!editApp} onOpenChange={(o) => { if (!o) { setEditApp(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input placeholder="App name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input placeholder="https://yourapp.com (optional)" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
            <Textarea placeholder="Brief description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} />
            <div>
              <Label className="text-sm mb-1.5 block">App Icon</Label>
              <input ref={editFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleIconSelect(e.target.files?.[0])} />
              <div className="flex items-center gap-3">
                {iconPreview ? (
                  <img src={iconPreview} alt="Icon preview" className="h-10 w-10 rounded-lg object-cover border" />
                ) : (
                  <div className="h-10 w-10 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <ImagePlus className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => editFileInputRef.current?.click()}>
                  {iconPreview ? "Change" : "Upload"}
                </Button>
                {iconPreview && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setIconFile(null); setIconPreview(null); }}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <Button onClick={handleEdit} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
