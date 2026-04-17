import { useState, useEffect, useRef } from "react";
import { Plus, Globe, MoreVertical, Trash2, ArrowRight, Pencil, ImagePlus, LayoutGrid, List, Download } from "lucide-react";
import isdbLogo from "@/assets/isdb-logo.jpg";
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Frosted glass header */}
      <header className="sticky top-0 z-20 border-b border-border/40 bg-card/70 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src={isdbLogo} alt="IsDB Logo" className="h-9 w-9 rounded-xl object-cover ring-2 ring-primary/10" />
            <div>
              <h1 className="text-lg font-bold tracking-tight">SnapGuide</h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5 uppercase tracking-wider">Process Documentation</p>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              className="px-4 shadow-sm rounded-full"
              onClick={() => {
                fetch("/snapguide-extension.zip")
                  .then(r => { if (!r.ok) throw new Error("Download failed"); return r.blob(); })
                  .then(blob => {
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "snapguide-extension.zip";
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
                <Button size="sm" className="px-4 shadow-md rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
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

      <main className="container py-10 px-4">
        {/* Hero */}
        {!loading && (
          <div className="mb-10 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Workspace</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Your Applications</h2>
                <p className="text-muted-foreground mt-2 max-w-xl">
                  Turn any application into step-by-step guided processes in minutes. Capture, edit, and deploy interactive walkthroughs effortlessly.
                </p>
              </div>
              {apps.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
                    {apps.length} app{apps.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 ring-8 ring-primary/5">
              <Globe className="h-9 w-9 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No apps yet</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Create your first application to start documenting processes with SnapGuide.
            </p>
            <Button onClick={() => setOpen(true)} className="rounded-full px-6 shadow-md">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First App
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex justify-end mb-5">
              <div className="flex items-center border rounded-full overflow-hidden bg-card shadow-sm">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => { setViewMode("grid"); localStorage.setItem("snapguide_view_mode", "grid"); }}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => { setViewMode("list"); localStorage.setItem("snapguide_view_mode", "list"); }}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {viewMode === "grid" ? (
              <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {apps.map((app, i) => (
                  <Card
                    key={app.id}
                    className="group relative p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 animate-fade-in overflow-hidden border-border/50 bg-card/80 backdrop-blur"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {/* Primary green glow */}
                    <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary opacity-10 group-hover:opacity-20 transition-opacity blur-2xl" />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-4">
                        {app.icon_url ? (
                          <img src={app.icon_url} alt={app.name} className="h-12 w-12 rounded-2xl object-cover shadow-md ring-2 ring-background" />
                        ) : (
                          <div className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-md ring-2 ring-background bg-primary/10">
                            <span className="font-bold text-lg text-primary">
                              {app.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      <h3 className="font-bold text-lg mb-1 tracking-tight">{app.name}</h3>
                      {app.url && <p className="text-xs text-muted-foreground mb-2 truncate flex items-center gap-1"><Globe className="h-3 w-3" />{app.url}</p>}
                      <p className="text-sm text-muted-foreground mb-5 line-clamp-2 min-h-[2.5rem]">{app.description || "No description provided"}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="rounded-full -ml-2 group/btn text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Link to={`/app/${app.id}`}>
                          Open workspace
                          <ArrowRight className="ml-1 h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {apps.map((app, i) => (
                  <Card
                    key={app.id}
                    className="group p-4 hover:shadow-lg hover:bg-card transition-all animate-fade-in flex items-center gap-4 border-border/50 bg-card/70 backdrop-blur border-l-4 border-l-primary"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {app.icon_url ? (
                      <img src={app.icon_url} alt={app.name} className="h-10 w-10 rounded-xl object-cover shrink-0 shadow-sm" />
                    ) : (
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-primary/10">
                        <span className="font-bold text-sm text-primary">{app.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{app.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{app.url || app.description || "No description"}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" asChild className="rounded-full text-primary hover:text-primary hover:bg-primary/10">
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
