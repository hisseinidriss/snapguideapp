import { useState, useEffect, useRef } from "react";
import { Plus, Globe, MoreVertical, Trash2, ArrowRight, BookOpen, UserCircle, Menu, Pencil, ImagePlus, LogOut, LayoutGrid, List } from "lucide-react";
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { db, storage } from "@/services/backend";
import { useAuth } from "@/contexts/AuthContext";
import type { App } from "@/types/tour";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => (localStorage.getItem("walkthru_view_mode") as "grid" | "list") || "grid");
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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const fetchApps = async () => {
    const { data, error } = await db.from("apps").select("*").order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setApps(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, []);

  const uploadIcon = async (file: File, appId: string): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${appId}/icon.${ext}`;
    const { error } = await storage.from("app-icons").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Icon upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: urlData } = storage.from("app-icons").getPublicUrl(path);
    return urlData.publicUrl + "?t=" + Date.now();
  };

  const handleIconSelect = (file: File | undefined) => {
    if (!file) return;
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const { data: inserted, error } = await db.from("apps").insert({ name: newName, url: newUrl, description: newDesc }).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    if (iconFile && inserted) {
      const iconUrl = await uploadIcon(iconFile, inserted.id);
      if (iconUrl) {
        await db.from("apps").update({ icon_url: iconUrl } as any).eq("id", inserted.id);
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
    const { error } = await db.from("apps").delete().eq("id", id);
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
    setIconPreview((app as any).icon_url || null);
    setIconFile(null);
  };

  const handleEdit = async () => {
    if (!editApp || !newName.trim()) return;
    let iconUrl = (editApp as any).icon_url;
    if (iconFile) {
      iconUrl = await uploadIcon(iconFile, editApp.id);
    }
    const { error } = await db.from("apps").update({ name: newName, url: newUrl, description: newDesc, icon_url: iconUrl } as any).eq("id", editApp.id);
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
            <img src="/favicon.png" alt="IsDB Logo" className="h-8 w-8 rounded-lg object-contain" />
            <h1 className="text-lg font-semibold">WalkThru</h1>
          </div>

          {/* Desktop nav */}
          <div className="hidden sm:flex gap-3 items-center">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-full px-4 shadow-sm">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <UserCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/account" className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/guide" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    User Guide
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { await signOut(); navigate("/auth"); }} className="text-destructive">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile nav */}
          <div className="flex sm:hidden gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="default">
                  <Plus className="h-4 w-4" />
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
                  <Button onClick={handleCreate} className="w-full">Create App</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 mt-4">
                  <Button variant="outline" asChild className="justify-start">
                    <Link to="/account"><UserCircle className="mr-2 h-4 w-4" />Account</Link>
                  </Button>
                  <Button variant="outline" asChild className="justify-start">
                    <Link to="/guide"><BookOpen className="mr-2 h-4 w-4" />User Guide</Link>
                  </Button>
                  <Button variant="destructive" onClick={async () => { await signOut(); navigate("/auth"); }} className="justify-start">
                    <LogOut className="mr-2 h-4 w-4" />Sign Out
                  </Button>
                </div>
                {user && (
                  <p className="text-xs text-muted-foreground mt-6 truncate">{user.email}</p>
                )}
              </SheetContent>
            </Sheet>
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
              Create your first application to start building guided business processes.
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
                  onClick={() => { setViewMode("grid"); localStorage.setItem("walkthru_view_mode", "grid"); }}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  onClick={() => { setViewMode("list"); localStorage.setItem("walkthru_view_mode", "list"); }}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {viewMode === "grid" ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {apps.map((app, i) => (
                  <Card key={app.id} className="p-5 hover:shadow-md transition-shadow animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="flex items-start justify-between mb-3">
                      {(app as any).icon_url ? (
                        <img src={(app as any).icon_url} alt={app.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-bold">{app.name.charAt(0).toUpperCase()}</span>
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
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/app/${app.id}`}>
                          Open
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {apps.map((app, i) => (
                  <Card key={app.id} className="p-4 hover:shadow-md transition-shadow animate-fade-in flex items-center gap-4" style={{ animationDelay: `${i * 50}ms` }}>
                    {(app as any).icon_url ? (
                      <img src={(app as any).icon_url} alt={app.name} className="h-9 w-9 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold text-sm">{app.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{app.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{app.url || app.description || "No description"}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" asChild>
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
