import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Code, Pencil, Crosshair, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Tour, Launcher } from "@/types/tour";
import { useToast } from "@/hooks/use-toast";

const AppDetail = () => {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appName, setAppName] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [tours, setTours] = useState<Tour[]>([]);
  const [launchers, setLaunchers] = useState<Launcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [tourName, setTourName] = useState("");
  const [tourCounts, setTourCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!appId) return;
    const load = async () => {
      const [appRes, toursRes, launchersRes] = await Promise.all([
        supabase.from("apps").select("*").eq("id", appId).single(),
        supabase.from("tours").select("*").eq("app_id", appId).order("created_at", { ascending: false }),
        supabase.from("launchers").select("*").eq("app_id", appId).order("created_at", { ascending: false }),
      ]);
      if (appRes.data) { setAppName(appRes.data.name); setAppUrl(appRes.data.url || ""); }
      setTours(toursRes.data || []);
      setLaunchers(launchersRes.data || []);

      // Get step counts
      if (toursRes.data?.length) {
        const ids = toursRes.data.map((t) => t.id);
        const { data: steps } = await supabase.from("tour_steps").select("tour_id").in("tour_id", ids);
        const counts: Record<string, number> = {};
        steps?.forEach((s) => { counts[s.tour_id] = (counts[s.tour_id] || 0) + 1; });
        setTourCounts(counts);
      }
      setLoading(false);
    };
    load();
  }, [appId]);

  const handleCreateTour = async () => {
    if (!tourName.trim() || !appId) return;
    const { error } = await supabase.from("tours").insert({ app_id: appId, name: tourName });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    const { data } = await supabase.from("tours").select("*").eq("app_id", appId).order("created_at", { ascending: false });
    setTours(data || []);
    setTourName(""); setOpen(false);
  };

  const handleDeleteTour = async (tourId: string) => {
    await supabase.from("tours").delete().eq("id", tourId);
    setTours((prev) => prev.filter((t) => t.id !== tourId));
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
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{appName}</h1>
            {appUrl && <p className="text-xs text-muted-foreground">{appUrl}</p>}
          </div>
          <Button variant="outline" onClick={() => navigate(`/app/${appId}/launchers`)}>
            <Crosshair className="mr-2 h-4 w-4" />
            Launchers ({launchers.length})
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Tour
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create a new tour</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Input placeholder="Tour name (e.g. Onboarding)" value={tourName} onChange={(e) => setTourName(e.target.value)} />
                <Button onClick={handleCreateTour} className="w-full">Create Tour</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container py-8">
        {tours.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
            <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
              <Pencil className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No tours yet</h2>
            <p className="text-muted-foreground max-w-md mb-6">Create your first tour to guide users through {appName}.</p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Tour
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {tours.map((tour, i) => (
              <Card key={tour.id} className="p-4 flex items-center justify-between animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div>
                  <h3 className="font-medium">{tour.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {tourCounts[tour.id] || 0} step{(tourCounts[tour.id] || 0) !== 1 ? "s" : ""} · Updated {new Date(tour.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/app/${appId}/tour/${tour.id}/embed`)}>
                    <Code className="mr-1 h-3 w-3" />Embed
                  </Button>
                  <Button size="sm" onClick={() => navigate(`/app/${appId}/tour/${tour.id}`)}>
                    <Pencil className="mr-1 h-3 w-3" />Edit
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTour(tour.id)}>
                    <Trash2 className="h-4 w-4" />
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

export default AppDetail;
