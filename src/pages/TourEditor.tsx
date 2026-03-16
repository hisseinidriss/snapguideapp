import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Plus, GripVertical, ChevronUp, ChevronDown, Eye, AlertTriangle, CheckCircle2, ShieldCheck, Loader2, Menu, PanelLeftClose, PanelLeft, Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { db, functions } from "@/services/backend";
import type { TourStep } from "@/types/tour";
import StepEditorPanel from "@/components/StepEditorPanel";
import LivePreview from "@/components/LivePreview";
import ElementPickerDialog from "@/components/ElementPickerDialog";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ValidationStatus = "idle" | "validating" | "done";
type SelectorResult = { found: boolean; context?: string };

interface SortableStepItemProps {
  step: TourStep;
  index: number;
  totalSteps: number;
  isSelected: boolean;
  validationIcon: string | null;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const SortableStepItem = ({ step, index, totalSteps, isSelected, validationIcon, onSelect, onMoveUp, onMoveDown }: SortableStepItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
        isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent"
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-4 text-center">{index + 1}</span>
      {(() => {
        if (validationIcon === "loading") return <Loader2 className="h-3 w-3 text-muted-foreground animate-spin shrink-0" />;
        if (validationIcon === "valid") return (
          <Tooltip><TooltipTrigger asChild><span><CheckCircle2 className="h-3 w-3 text-success shrink-0" /></span></TooltipTrigger><TooltipContent>Selector found on page</TooltipContent></Tooltip>
        );
        if (validationIcon === "invalid") return (
          <Tooltip><TooltipTrigger asChild><span><AlertTriangle className="h-3 w-3 text-warning shrink-0" /></span></TooltipTrigger><TooltipContent>Selector not found on page</TooltipContent></Tooltip>
        );
        return null;
      })()}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate flex items-center gap-1">
          {(step as any).step_type === 'video' && <Video className="h-3 w-3 text-primary shrink-0" />}
          {step.title}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">{step.selector || "Center modal"}</p>
      </div>
      <div className="flex flex-col shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-0.5 hover:text-primary disabled:opacity-30" disabled={index === 0}>
          <ChevronUp className="h-3 w-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-0.5 hover:text-primary disabled:opacity-30" disabled={index === totalSteps - 1}>
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>("idle");
  const [selectorResults, setSelectorResults] = useState<Record<string, SelectorResult>>({});
  const [mobileStepListOpen, setMobileStepListOpen] = useState(false);
  const [editorVisible, setEditorVisible] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const persistOrder = useCallback(async (newSteps: TourStep[]) => {
    await Promise.all(
      newSteps.map((s, i) =>
        supabase.from("tour_steps").update({ sort_order: i }).eq("id", s.id)
      )
    );
  }, []);

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
    await persistOrder(newSteps);
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

  const moveStep = useCallback(async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const newSteps = arrayMove(steps, index, newIndex);
    setSteps(newSteps);
    await persistOrder(newSteps);
  }, [steps, persistOrder]);

  const moveStepToPosition = useCallback(async (fromIndex: number, toPosition: number) => {
    const toIndex = toPosition - 1;
    if (toIndex < 0 || toIndex >= steps.length || toIndex === fromIndex) return;
    const newSteps = arrayMove(steps, fromIndex, toIndex);
    setSteps(newSteps);
    await persistOrder(newSteps);
  }, [steps, persistOrder]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newSteps = arrayMove(steps, oldIndex, newIndex);
    setSteps(newSteps);
    await persistOrder(newSteps);
  };

  const validateSelectors = async () => {
    if (!appUrl || steps.length === 0) {
      toast({ title: "Cannot validate", description: "Add an app URL and steps first.", variant: "destructive" });
      return;
    }
    const selectors = steps.map((s) => s.selector || "");
    setValidationStatus("validating");
    setSelectorResults({});
    try {
      const { data, error } = await supabase.functions.invoke("validate-selectors", {
        body: { url: appUrl, selectors },
      });
      if (error) throw error;
      if (data?.results) {
        setSelectorResults(data.results);
        const broken = Object.entries(data.results).filter(([sel, r]: [string, any]) => sel && !r.found).length;
        toast({
          title: broken > 0 ? `${broken} selector(s) not found` : "All selectors valid ✓",
          description: broken > 0 ? "Check the warning icons next to steps." : "Every selector was found on the page.",
          variant: broken > 0 ? "destructive" : "default",
        });
      }
    } catch (err: any) {
      toast({ title: "Validation failed", description: err.message || "Could not validate selectors.", variant: "destructive" });
    } finally {
      setValidationStatus("done");
    }
  };

  const getStepValidationIcon = (selector: string | null) => {
    if (validationStatus === "idle") return null;
    if (!selector) return null;
    const result = selectorResults[selector];
    if (!result) return validationStatus === "validating" ? "loading" : null;
    return result.found ? "valid" : "invalid";
  };

  const selectedStep = steps.find((s) => s.id === selectedStepId);
  const activeStep = activeId ? steps.find((s) => s.id === activeId) : null;

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

  const stepListContent = (
    <>
      <div className="p-3 border-b">
        <Button onClick={addStep} size="sm" className="w-full">
          <Plus className="mr-1 h-3 w-3" />Add Step
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {steps.map((step, index) => (
              <SortableStepItem
                key={step.id}
                step={step}
                index={index}
                totalSteps={steps.length}
                isSelected={selectedStepId === step.id}
                validationIcon={getStepValidationIcon(step.selector)}
                onSelect={() => { setSelectedStepId(step.id); setMobileStepListOpen(false); }}
                onMoveUp={() => moveStep(index, "up")}
                onMoveDown={() => moveStep(index, "down")}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {activeStep ? (
              <div className="p-2.5 rounded-lg flex items-center gap-2 bg-card border border-primary/30 shadow-lg opacity-90">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{activeStep.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{activeStep.selector || "Center modal"}</p>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        {steps.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No steps yet.</p>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card shrink-0">
        <div className="container flex h-14 items-center gap-2 sm:gap-4 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/app/${appId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{tourName}</h1>
            <p className="text-xs text-muted-foreground truncate">{appName}</p>
          </div>

          {/* Mobile step list trigger */}
          <Sheet open={mobileStepListOpen} onOpenChange={setMobileStepListOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden h-8">
                <Menu className="mr-1.5 h-3.5 w-3.5" />
                Steps ({steps.length})
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-4 pb-0">
                <SheetTitle>Steps</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col h-full">
                {stepListContent}
              </div>
            </SheetContent>
          </Sheet>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditorVisible((v) => !v)}
            className="h-8 hidden lg:inline-flex"
          >
            {editorVisible ? <PanelLeftClose className="mr-1.5 h-3.5 w-3.5" /> : <PanelLeft className="mr-1.5 h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{editorVisible ? "Hide Editor" : "Show Editor"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={validateSelectors}
            disabled={validationStatus === "validating"}
            className="h-8"
          >
            {validationStatus === "validating" ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /><span className="hidden sm:inline">Validating...</span></>
            ) : (
              <><ShieldCheck className="mr-1.5 h-3.5 w-3.5" /><span className="hidden sm:inline">Validate Selectors</span></>
            )}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Step List - desktop */}
        <div className="hidden lg:flex w-64 border-r bg-card overflow-y-auto shrink-0 flex-col">
          {stepListContent}
        </div>

        {/* Step Editor */}
        {editorVisible && <div className="w-full lg:w-80 border-r overflow-y-auto shrink-0 p-4">
          {selectedStep ? (
            <StepEditorPanel
              step={selectedStep}
              stepIndex={steps.indexOf(selectedStep)}
              totalSteps={steps.length}
              onUpdate={updateStep}
              onRemove={removeStep}
              onPickElement={() => setPickerOpen(true)}
              onMoveToPosition={moveStepToPosition}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              <p>Select a step to edit.</p>
            </div>
          )}
        </div>}

        {/* Live Preview - hidden on mobile */}
        <div className="hidden lg:block flex-1">
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

      <ElementPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        appUrl={appUrl}
        onSelectorPicked={(selector) => {
          if (selectedStepId) {
            updateStep(selectedStepId, { selector });
          }
        }}
      />
    </div>
  );
};

export default TourEditor;
