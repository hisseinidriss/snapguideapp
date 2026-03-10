import { useState, useEffect } from "react";
import { Plus, Globe, MoreVertical, Trash2, ArrowRight, BookOpen, UserCircle, Menu } from "lucide-react";
import { Link } from "react-router-dom";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { App } from "@/types/tour";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchApps = async () => {
    const { data, error } = await supabase.from("apps").select("*").order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setApps(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("apps").insert({ name: newName, url: newUrl, description: newDesc });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await fetchApps();
    setNewName(""); setNewUrl(""); setNewDesc("");
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("apps").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setApps((prev) => prev.filter((a) => a.id !== id));
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
          <div className="hidden sm:flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/guide">
                <BookOpen className="mr-2 h-4 w-4" />
                User Guide
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/account">
                <UserCircle className="mr-2 h-4 w-4" />
                Account
              </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
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
                  <Button onClick={handleCreate} className="w-full">Create App</Button>
                </div>
              </DialogContent>
            </Dialog>
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
                    <Link to="/guide"><BookOpen className="mr-2 h-4 w-4" />User Guide</Link>
                  </Button>
                  <Button variant="outline" asChild className="justify-start">
                    <Link to="/account"><UserCircle className="mr-2 h-4 w-4" />Account</Link>
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
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map((app, i) => (
              <Card key={app.id} className="p-5 hover:shadow-md transition-shadow animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">{app.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
        )}
      </main>
    </div>
  );
};

export default Dashboard;
