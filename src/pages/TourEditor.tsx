import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Plus, GripVertical, ChevronUp, ChevronDown, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { TourStep } from "@/types/tour";
import StepEditorPanel from "@/components/StepEditorPanel";
import LivePreview from "@/components/LivePreview";
import ElementPickerDialog from "@/components/ElementPickerDialog";
import { useToast } from "@/hooks/use-toast";

const TourEditor = () => {
  const { appId, tourId } = useParams<{ appId: string; tourId: string }>();
  const { toast } = useToast();
  const [tourName, setTourName] = useState("");
  const [appName, setAppName] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [previewActive, setPreviewActive] = useState(false);
  const [previewStepIndex, setPreviewStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appId || !tourId) return;
    const load = async () => {
      const [appRes, tourRes, stepsRes] = await Promise.all([
        supabase.from("apps").select("name, url").eq("id", appId).single(),
        supabase.from("tours").select("name").eq("id", tourId).single(),
        supabase.from("tour_steps").select("*").eq("tour_id", tourId).order("sort_order"),
      ]);
      setAppName(appRes.data?.name || "");
      setAppUrl(appRes.data?.url || "");
      setTourName(tourRes.data?.name || "");
      setSteps(stepsRes.data || []);
      if (stepsRes.data?.length) setSelectedStepId(stepsRes.data[0].id);
      setLoading(false);
    };
    load();
  }, [appId, tourId]);

  const addStep = async () => {
    if (!tourId) return;
    const { data, error } = await supabase
      .from("tour_steps")
      .insert({ tour_id: tourId, title: "New Step", content: "Describe what happens here.", sort_order: steps.length })
      .select()
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (data) { setSteps((prev) => [...prev, data]); setSelectedStepId(data.id); }
  };

  const removeStep = async (id: string) => {
    await supabase.from("tour_steps").delete().eq("id", id);
    const newSteps = steps.filter((s) => s.id !== id);
    setSteps(newSteps);
    if (selectedStepId === id) setSelectedStepId(newSteps[0]?.id || null);
    for (let i = 0; i < newSteps.length; i++) {
      await supabase.from("tour_steps").update({ sort_order: i }).eq("id", newSteps[i].id);
    }
  };

  const updateStep = useCallback(async (id: string, updates: Partial<TourStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    const { sort_order, ...dbUpdates } = updates as any;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dbUpdates)) {
      if (k !== 'id' && k !== 'created_at' && k !== 'updated_at' && k !== 'tour_id') {
        cleanUpdates[k] = v;
      }
    }
    if (sort_order !== undefined) cleanUpdates.sort_order = sort_order;
    if (Object.keys(cleanUpdates).length > 0) {
      await supabase.from("tour_steps").update(cleanUpdates).eq("id", id);
    }
  }, []);

  const moveStep = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSteps(newSteps);
    await Promise.all([
      supabase.from("tour_steps").update({ sort_order: index }).eq("id", newSteps[index].id),
      supabase.from("tour_steps").update({ sort_order: newIndex }).eq("id", newSteps[newIndex].id),
    ]);
  };

  const selectedStep = steps.find((s) => s.id === selectedStepId);

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
          <h2 className="text-xl font-semibold mb-2">Tour not found</h2>
          <Button variant="ghost" asChild><Link to="/">Go back</Link></Button>
        </div>
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
            <h1 className="text-sm font-semibold truncate">{tourName}</h1>
            <p className="text-xs text-muted-foreground">{appName}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Step List */}
        <div className="w-64 border-r bg-card overflow-y-auto shrink-0 flex flex-col">
          <div className="p-3 border-b">
            <Button onClick={addStep} size="sm" className="w-full">
              <Plus className="mr-1 h-3 w-3" />Add Step
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setSelectedStepId(step.id)}
                className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2 transition-colors ${
                  selectedStepId === step.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                }`}
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{step.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{step.selector || "Center modal"}</p>
                </div>
                <div className="flex flex-col shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); moveStep(index, "up"); }} className="p-0.5 hover:text-primary" disabled={index === 0}>
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); moveStep(index, "down"); }} className="p-0.5 hover:text-primary" disabled={index === steps.length - 1}>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </button>
            ))}
            {steps.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No steps yet.</p>
            )}
          </div>
        </div>

        {/* Step Editor */}
        <div className="w-80 border-r overflow-y-auto shrink-0 p-4">
          {selectedStep ? (
            <StepEditorPanel
              step={selectedStep}
              stepIndex={steps.indexOf(selectedStep)}
              totalSteps={steps.length}
              onUpdate={updateStep}
              onRemove={removeStep}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              <p>Select a step to edit.</p>
            </div>
          )}
        </div>

        {/* Live Preview */}
        <LivePreview
          appUrl={appUrl}
          steps={steps}
          previewActive={previewActive}
          previewStepIndex={previewStepIndex}
          onNext={() => setPreviewStepIndex((i) => Math.min(i + 1, steps.length - 1))}
          onPrev={() => setPreviewStepIndex((i) => Math.max(i - 1, 0))}
          onClose={() => setPreviewActive(false)}
          onStart={() => { setPreviewStepIndex(0); setPreviewActive(true); }}
        />
      </div>
    </div>
  );
};

export default TourEditor;
