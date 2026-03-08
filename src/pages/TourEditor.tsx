import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Plus, GripVertical, Trash2, Eye, ChevronUp, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { TourStep, Placement } from "@/types/tour";
import StepPreview from "@/components/StepPreview";
import { useToast } from "@/hooks/use-toast";

const PLACEMENTS: { value: Placement; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "center", label: "Center" },
];

const TourEditor = () => {
  const { appId, tourId } = useParams<{ appId: string; tourId: string }>();
  const { toast } = useToast();
  const [tourName, setTourName] = useState("");
  const [appName, setAppName] = useState("");
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStepIndex, setPreviewStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appId || !tourId) return;
    const load = async () => {
      const [appRes, tourRes, stepsRes] = await Promise.all([
        supabase.from("apps").select("name").eq("id", appId).single(),
        supabase.from("tours").select("name").eq("id", tourId).single(),
        supabase.from("tour_steps").select("*").eq("tour_id", tourId).order("sort_order"),
      ]);
      setAppName(appRes.data?.name || "");
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
    // Reorder remaining
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
          <Button variant="outline" size="sm" onClick={() => { setPreviewStepIndex(0); setPreviewOpen(true); }}>
            <Eye className="mr-1 h-3 w-3" />Preview
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Step List */}
        <div className="w-72 border-r bg-card overflow-y-auto shrink-0">
          <div className="p-3 border-b">
            <Button onClick={addStep} size="sm" className="w-full">
              <Plus className="mr-1 h-3 w-3" />Add Step
            </Button>
          </div>
          <div className="p-2 space-y-1">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setSelectedStepId(step.id)}
                className={`w-full text-left p-3 rounded-lg flex items-center gap-2 transition-colors ${
                  selectedStepId === step.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                }`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{step.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{step.selector || "No selector"}</p>
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
              <p className="text-sm text-muted-foreground text-center py-8">No steps yet. Add your first step above.</p>
            )}
          </div>
        </div>

        {/* Step Editor */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedStep ? (
            <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Edit Step</h2>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeStep(selectedStep.id)}>
                  <Trash2 className="mr-1 h-3 w-3" />Remove
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={selectedStep.title} onChange={(e) => updateStep(selectedStep.id, { title: e.target.value })} placeholder="Step title" />
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea value={selectedStep.content} onChange={(e) => updateStep(selectedStep.id, { content: e.target.value })} placeholder="Step description" rows={3} />
              </div>

              <div className="space-y-2">
                <Label>CSS Selector</Label>
                <Input value={selectedStep.selector || ""} onChange={(e) => updateStep(selectedStep.id, { selector: e.target.value })} placeholder="#my-button or .nav-item" className="font-mono text-sm" />
                <p className="text-xs text-muted-foreground">Target element for this step. Leave empty for a centered modal.</p>
              </div>

              <div className="space-y-2">
                <Label>Placement</Label>
                <Select value={selectedStep.placement} onValueChange={(v) => updateStep(selectedStep.id, { placement: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLACEMENTS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card className="p-4 bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Step Preview</p>
                <div className="relative bg-card rounded-lg p-6 border min-h-[120px] flex items-center justify-center">
                  <div className="bg-card rounded-lg shadow-lg border p-4 max-w-[280px]">
                    <h4 className="font-semibold text-sm mb-1">{selectedStep.title}</h4>
                    <p className="text-xs text-muted-foreground mb-3">{selectedStep.content}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Step {steps.indexOf(selectedStep) + 1} of {steps.length}</span>
                      <Button size="sm" className="h-7 text-xs">Next</Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Select a step to edit, or add a new one.</p>
            </div>
          )}
        </div>
      </div>

      {previewOpen && (
        <StepPreview
          steps={steps}
          currentIndex={previewStepIndex}
          onNext={() => setPreviewStepIndex((i) => Math.min(i + 1, steps.length - 1))}
          onPrev={() => setPreviewStepIndex((i) => Math.max(i - 1, 0))}
          onClose={() => setPreviewOpen(false)}
          onDone={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
};

export default TourEditor;
