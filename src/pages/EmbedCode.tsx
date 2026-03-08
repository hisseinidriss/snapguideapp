import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { generateEmbedScript } from "@/lib/tour-store";
import type { TourStep, Launcher } from "@/types/tour";

const EmbedCode = () => {
  const { appId, tourId } = useParams<{ appId: string; tourId: string }>();
  const [copied, setCopied] = useState(false);
  const [tourName, setTourName] = useState("");
  const [appName, setAppName] = useState("");
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [launchers, setLaunchers] = useState<Launcher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appId || !tourId) return;
    const load = async () => {
      const [appRes, tourRes, stepsRes, launchersRes] = await Promise.all([
        supabase.from("apps").select("name").eq("id", appId).single(),
        supabase.from("tours").select("name").eq("id", tourId).single(),
        supabase.from("tour_steps").select("*").eq("tour_id", tourId).order("sort_order"),
        supabase.from("launchers").select("*").eq("app_id", appId),
      ]);
      setAppName(appRes.data?.name || "");
      setTourName(tourRes.data?.name || "");
      setSteps(stepsRes.data || []);
      setLaunchers(launchersRes.data || []);
      setLoading(false);
    };
    load();
  }, [appId, tourId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!tourName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Process not found</h2>
          <Button variant="ghost" asChild><Link to="/">Go back</Link></Button>
        </div>
      </div>
    );
  }

  const script = generateEmbedScript(steps, launchers);

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/app/${appId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-sm font-semibold">Embed Code</h1>
            <p className="text-xs text-muted-foreground">{tourName} · {appName}</p>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-3xl">
        <div className="animate-fade-in">
          <h2 className="text-xl font-semibold mb-2">Embed your tour</h2>
          <p className="text-muted-foreground mb-6">
            Copy the script below and paste it into your application's HTML, just before the closing{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code> tag.
            {launchers.length > 0 && (
              <span className="block mt-2 text-sm text-accent">
                ✨ This embed includes {launchers.filter(l => l.is_active).length} active launcher(s).
              </span>
            )}
          </p>

          <Card className="relative">
            <div className="absolute top-3 right-3">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <><Check className="mr-1 h-3 w-3 text-success" />Copied</>
                ) : (
                  <><Copy className="mr-1 h-3 w-3" />Copy</>
                )}
              </Button>
            </div>
            <pre className="p-5 overflow-x-auto text-xs font-mono leading-relaxed text-foreground/80">
              {script}
            </pre>
          </Card>

          {steps.length === 0 && (
            <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-warning font-medium">⚠ This tour has no steps yet. Add steps in the editor before embedding.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EmbedCode;
