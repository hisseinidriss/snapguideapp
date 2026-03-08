import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Code, Pencil } from "lucide-react";
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
import { getApp, createTour, deleteTour } from "@/lib/tour-store";

const AppDetail = () => {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState(() => getApp(appId || ""));
  const [open, setOpen] = useState(false);
  const [tourName, setTourName] = useState("");

  if (!app) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">App not found</h2>
          <Button variant="ghost" asChild>
            <Link to="/">Go back</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleCreateTour = () => {
    if (!tourName.trim()) return;
    createTour(app.id, tourName);
    setApp(getApp(app.id));
    setTourName("");
    setOpen(false);
  };

  const handleDeleteTour = (tourId: string) => {
    deleteTour(app.id, tourId);
    setApp(getApp(app.id));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{app.name}</h1>
            {app.url && (
              <p className="text-xs text-muted-foreground">{app.url}</p>
            )}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Tour
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new tour</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input
                  placeholder="Tour name (e.g. Onboarding)"
                  value={tourName}
                  onChange={(e) => setTourName(e.target.value)}
                />
                <Button onClick={handleCreateTour} className="w-full">
                  Create Tour
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container py-8">
        {app.tours.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
            <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
              <Pencil className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No tours yet</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Create your first tour to guide users through {app.name}.
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Tour
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {app.tours.map((tour, i) => (
              <Card
                key={tour.id}
                className="p-4 flex items-center justify-between animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div>
                  <h3 className="font-medium">{tour.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {tour.steps.length} step{tour.steps.length !== 1 ? "s" : ""}{" "}
                    · Updated {new Date(tour.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(`/app/${app.id}/tour/${tour.id}/embed`)
                    }
                  >
                    <Code className="mr-1 h-3 w-3" />
                    Embed
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate(`/app/${app.id}/tour/${tour.id}`)
                    }
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDeleteTour(tour.id)}
                  >
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
