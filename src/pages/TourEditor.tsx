import { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Trash2,
  Eye,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApp, updateTour, createStep } from "@/lib/tour-store";
import { TourStep } from "@/types/tour";
import StepPreview from "@/components/StepPreview";

const PLACEMENTS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "center", label: "Center" },
] as const;

const TourEditor = () => {
  const { appId, tourId } = useParams<{ appId: string; tourId: string }>();
  const app = getApp(appId || "");
  const tour = app?.tours.find((t) => t.id === tourId);
  const [steps, setSteps] = useState<TourStep[]>(tour?.steps || []);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    steps[0]?.id || null
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStepIndex, setPreviewStepIndex] = useState(0);

  const save = useCallback(
    (newSteps: TourStep[]) => {
      if (!appId || !tourId) return;
      const ordered = newSteps.map((s, i) => ({ ...s, order: i }));
      setSteps(ordered);
      updateTour(appId, tourId, { steps: ordered });
    },
    [appId, tourId]
  );

  const addStep = () => {
    const step = createStep({ order: steps.length });
    const newSteps = [...steps, step];
    save(newSteps);
    setSelectedStepId(step.id);
  };

  const removeStep = (id: string) => {
    const newSteps = steps.filter((s) => s.id !== id);
    save(newSteps);
    if (selectedStepId === id) {
      setSelectedStepId(newSteps[0]?.id || null);
    }
  };

  const updateStep = (id: string, updates: Partial<TourStep>) => {
    const newSteps = steps.map((s) => (s.id === id ? { ...s, ...updates } : s));
    save(newSteps);
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    save(newSteps);
  };

  const selectedStep = steps.find((s) => s.id === selectedStepId);

  if (!app || !tour) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Tour not found</h2>
          <Button variant="ghost" asChild>
            <Link to="/">Go back</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card shrink-0">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/app/${appId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{tour.name}</h1>
            <p className="text-xs text-muted-foreground">{app.name}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPreviewStepIndex(0);
              setPreviewOpen(true);
            }}
          >
            <Eye className="mr-1 h-3 w-3" />
            Preview
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Step List */}
        <div className="w-72 border-r bg-card overflow-y-auto shrink-0">
          <div className="p-3 border-b">
            <Button onClick={addStep} size="sm" className="w-full">
              <Plus className="mr-1 h-3 w-3" />
              Add Step
            </Button>
          </div>
          <div className="p-2 space-y-1">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setSelectedStepId(step.id)}
                className={`w-full text-left p-3 rounded-lg flex items-center gap-2 transition-colors ${
                  selectedStepId === step.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted"
                }`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{step.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.selector || "No selector"}
                  </p>
                </div>
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep(index, "up");
                    }}
                    className="p-0.5 hover:text-primary"
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep(index, "down");
                    }}
                    className="p-0.5 hover:text-primary"
                    disabled={index === steps.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </button>
            ))}
            {steps.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No steps yet. Add your first step above.
              </p>
            )}
          </div>
        </div>

        {/* Step Editor */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedStep ? (
            <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Edit Step</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => removeStep(selectedStep.id)}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Remove
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={selectedStep.title}
                  onChange={(e) =>
                    updateStep(selectedStep.id, { title: e.target.value })
                  }
                  placeholder="Step title"
                />
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={selectedStep.content}
                  onChange={(e) =>
                    updateStep(selectedStep.id, { content: e.target.value })
                  }
                  placeholder="Step description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>CSS Selector</Label>
                <Input
                  value={selectedStep.selector}
                  onChange={(e) =>
                    updateStep(selectedStep.id, { selector: e.target.value })
                  }
                  placeholder="#my-button or .nav-item"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Target element for this step. Leave empty for a centered modal.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Placement</Label>
                <Select
                  value={selectedStep.placement}
                  onValueChange={(v) =>
                    updateStep(selectedStep.id, {
                      placement: v as TourStep["placement"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACEMENTS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Inline preview */}
              <Card className="p-4 bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                  Step Preview
                </p>
                <div className="relative bg-card rounded-lg p-6 border min-h-[120px] flex items-center justify-center">
                  <div className="bg-card rounded-lg shadow-lg border p-4 max-w-[280px]">
                    <h4 className="font-semibold text-sm mb-1">
                      {selectedStep.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      {selectedStep.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Step {steps.indexOf(selectedStep) + 1} of {steps.length}
                      </span>
                      <Button size="sm" className="h-7 text-xs">
                        Next
                      </Button>
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
          onNext={() =>
            setPreviewStepIndex((i) => Math.min(i + 1, steps.length - 1))
          }
          onPrev={() => setPreviewStepIndex((i) => Math.max(i - 1, 0))}
          onClose={() => setPreviewOpen(false)}
          onDone={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
};

export default TourEditor;
