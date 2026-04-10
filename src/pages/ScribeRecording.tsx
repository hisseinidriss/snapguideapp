// ScribeRecording - step editor for a single recording
import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Pencil, Trash2, GripVertical,
  FileText, Download, Plus, StickyNote, Image as ImageIcon, Languages, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { recordingsApi, recordingStepsApi } from "@/api/recordings";
import { useToast } from "@/hooks/use-toast";
import { generateSOPPdf, type PdfLanguage } from "@/lib/pdf-generator";
import type { ProcessRecording, ProcessRecordingStep } from "@/types/recording";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent, DragOverlay, type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableStepProps {
  step: ProcessRecordingStep;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

const SortableStep = ({ step, index, isSelected, onSelect }: SortableStepProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const actionColors: Record<string, string> = {
    click: 'bg-blue-100 text-blue-700',
    type: 'bg-amber-100 text-amber-700',
    select: 'bg-purple-100 text-purple-700',
    navigate: 'bg-emerald-100 text-emerald-700',
    scroll: 'bg-gray-100 text-gray-700',
    hover: 'bg-pink-100 text-pink-700',
  };

  return (
    <div ref={setNodeRef} style={style} onClick={onSelect}
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? "border-primary/30 bg-primary/5" : "border-transparent hover:bg-muted"}`}
    >
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-1 touch-none">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <span className="text-xs font-mono text-muted-foreground mt-0.5 w-5 text-center shrink-0">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{step.instruction}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${actionColors[step.action_type] || ''}`}>{step.action_type}</Badge>
            {step.screenshot_url && <ImageIcon className="h-3 w-3 text-muted-foreground" />}
            {step.notes && <StickyNote className="h-3 w-3 text-muted-foreground" />}
          </div>
        </div>
      </div>
    </div>
  );
};

const ScribeRecording = () => {
  const { appId, recordingId } = useParams<{ appId: string; recordingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [recording, setRecording] = useState<ProcessRecording | null>(null);
  const [steps, setSteps] = useState<ProcessRecordingStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editTitle, setEditTitle] = useState(false);
  const [editDesc, setEditDesc] = useState(false);
  const [titleVal, setTitleVal] = useState("");
  const [descVal, setDescVal] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!appId || !recordingId) return;
    const load = async () => {
      const [recRes, stepsRes] = await Promise.all([
        recordingsApi.get(recordingId),
        recordingStepsApi.list(recordingId),
      ]);
      if (recRes.data) {
        setRecording(recRes.data as unknown as ProcessRecording);
        setTitleVal(recRes.data.title);
        setDescVal(recRes.data.description || "");
      }
      setSteps((stepsRes.data || []) as unknown as ProcessRecordingStep[]);
      if (stepsRes.data?.length) setSelectedStepId(stepsRes.data[0].id);
      setLoading(false);
    };
    load();
  }, [appId, recordingId]);

  const persistOrder = useCallback(async (newSteps: ProcessRecordingStep[]) => {
    await Promise.all(newSteps.map((s, i) => recordingStepsApi.update(s.id, { sort_order: i })));
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = steps.findIndex(s => s.id === active.id);
    const newIdx = steps.findIndex(s => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const newSteps = arrayMove(steps, oldIdx, newIdx);
    setSteps(newSteps);
    await persistOrder(newSteps);
  };

  const updateRecording = async (updates: Partial<ProcessRecording>) => {
    if (!recordingId) return;
    setRecording(prev => prev ? { ...prev, ...updates } : prev);
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (!['id', 'created_at', 'updated_at', 'app_id'].includes(k)) clean[k] = v;
    }
    await recordingsApi.update(recordingId, clean as any);
  };

  const updateStep = async (id: string, updates: Partial<ProcessRecordingStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (!['id', 'created_at', 'updated_at', 'recording_id'].includes(k)) clean[k] = v;
    }
    await recordingStepsApi.update(id, clean as any);
  };

  const removeStep = async (id: string) => {
    await recordingStepsApi.delete(id);
    const newSteps = steps.filter(s => s.id !== id);
    setSteps(newSteps);
    if (selectedStepId === id) setSelectedStepId(newSteps[0]?.id || null);
    await persistOrder(newSteps);
  };

  const addStep = async () => {
    if (!recordingId) return;
    const { data, error } = await recordingStepsApi.create({
      recording_id: recordingId,
      sort_order: steps.length,
      action_type: 'click',
      instruction: 'New step - describe the action',
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (data) {
      const newStep = data as unknown as ProcessRecordingStep;
      setSteps(prev => [...prev, newStep]);
      setSelectedStepId(newStep.id);
    }
  };

  const [translating, setTranslating] = useState(false);

  const handleDownloadPdf = async (lang: PdfLanguage = 'en') => {
    if (!recording) return;

    if (lang === 'en') {
      await generateSOPPdf(recording.title, recording.description || '', steps);
      toast({ title: "PDF downloaded", description: "SOP document has been saved." });
      return;
    }

    // Translate via edge function
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-steps', {
        body: {
          title: recording.title,
          description: recording.description || '',
          steps: steps.map(s => ({ instruction: s.instruction, notes: s.notes })),
          targetLanguage: lang,
        },
      });

      if (error) throw error;

      await generateSOPPdf(recording.title, recording.description || '', steps, {
        language: lang,
        translatedTitle: data.title,
        translatedDescription: data.description,
        translatedSteps: data.steps,
      });

      const langName = lang === 'ar' ? 'Arabic' : 'French';
      toast({ title: "PDF downloaded", description: `${langName} SOP document has been saved.` });
    } catch (err: any) {
      toast({ title: "Translation failed", description: err.message || "Could not translate. Try again.", variant: "destructive" });
    } finally {
      setTranslating(false);
    }
  };

  const selectedStep = steps.find(s => s.id === selectedStepId);

  if (loading) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>);
  }

  if (!recording) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><div className="text-center"><h2 className="text-xl font-semibold mb-2">Recording not found</h2><Button variant="ghost" asChild><Link to={`/app/${appId}`}>Go back</Link></Button></div></div>);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card shrink-0">
        <div className="container flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" asChild><Link to={`/app/${appId}`}><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div className="flex-1 min-w-0">
            {editTitle ? (
              <Input value={titleVal} onChange={e => setTitleVal(e.target.value)}
                onBlur={() => { updateRecording({ title: titleVal }); setEditTitle(false); }}
                onKeyDown={e => { if (e.key === 'Enter') { updateRecording({ title: titleVal }); setEditTitle(false); } }}
                className="h-8 text-sm font-semibold" autoFocus />
            ) : (
              <h1 className="text-sm font-semibold truncate cursor-pointer hover:text-primary transition-colors" onClick={() => setEditTitle(true)}>
                {recording.title}<Pencil className="inline-block ml-1.5 h-3 w-3 text-muted-foreground" />
              </h1>
            )}
            {editDesc ? (
              <Input value={descVal} onChange={e => setDescVal(e.target.value)}
                onBlur={() => { updateRecording({ description: descVal }); setEditDesc(false); }}
                onKeyDown={e => { if (e.key === 'Enter') { updateRecording({ description: descVal }); setEditDesc(false); } }}
                className="h-6 text-xs mt-0.5" placeholder="Add a description…" autoFocus />
            ) : (
              <p className="text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors truncate" onClick={() => setEditDesc(true)}>
                {descVal || "Add a description…"}<Pencil className="inline-block ml-1 h-2.5 w-2.5" />
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setPreviewOpen(true)}>
              <FileText className="mr-1.5 h-3.5 w-3.5" /><span className="hidden sm:inline">Preview</span>
            </Button>
            <Select onValueChange={(v) => handleDownloadPdf(v as PdfLanguage)} disabled={translating}>
              <SelectTrigger className="h-8 w-auto gap-1.5 text-sm">
                {translating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{translating ? 'Translating…' : 'Download PDF'}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="ar">🇸🇦 العربية (Arabic)</SelectItem>
                <SelectItem value="fr">🇫🇷 Français (French)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r bg-card overflow-y-auto shrink-0 flex-col hidden lg:flex">
          <div className="p-3 border-b"><Button onClick={addStep} size="sm" className="w-full"><Plus className="mr-1 h-3 w-3" />Add Step</Button></div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
              <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                {steps.map((step, i) => (<SortableStep key={step.id} step={step} index={i} isSelected={selectedStepId === step.id} onSelect={() => setSelectedStepId(step.id)} />))}
              </SortableContext>
              <DragOverlay>
                {activeId && steps.find(s => s.id === activeId) ? (
                  <div className="p-2.5 rounded-lg bg-card border shadow-lg opacity-90"><p className="text-xs font-medium truncate">{steps.find(s => s.id === activeId)?.instruction}</p></div>
                ) : null}
              </DragOverlay>
            </DndContext>
            {steps.length === 0 && (<p className="text-xs text-muted-foreground text-center py-8">No steps yet. Add steps manually to document the process.</p>)}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {selectedStep ? (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Step {steps.indexOf(selectedStep) + 1} of {steps.length}</h2>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeStep(selectedStep.id)}><Trash2 className="mr-1 h-3 w-3" />Remove</Button>
              </div>
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select value={selectedStep.action_type} onValueChange={v => updateStep(selectedStep.id, { action_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="click">Click</SelectItem><SelectItem value="type">Type</SelectItem><SelectItem value="select">Select</SelectItem>
                    <SelectItem value="navigate">Navigate</SelectItem><SelectItem value="scroll">Scroll</SelectItem><SelectItem value="hover">Hover</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Instruction</Label><Textarea value={selectedStep.instruction} onChange={e => updateStep(selectedStep.id, { instruction: e.target.value })} placeholder='e.g. Click "Submit" button' rows={2} /></div>
              <div className="space-y-2"><Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label><Textarea value={selectedStep.notes || ""} onChange={e => updateStep(selectedStep.id, { notes: e.target.value || null })} placeholder="Additional context or tips for this step" rows={2} /></div>
              <div className="space-y-2"><Label>CSS Selector <span className="text-muted-foreground font-normal">(optional)</span></Label><Input value={selectedStep.selector || ""} onChange={e => updateStep(selectedStep.id, { selector: e.target.value })} placeholder="#submit-btn" className="font-mono text-sm" /></div>
              <div className="space-y-2"><Label>Target URL <span className="text-muted-foreground font-normal">(optional)</span></Label><Input value={selectedStep.target_url || ""} onChange={e => updateStep(selectedStep.id, { target_url: e.target.value })} placeholder="/page or https://app.com/page" className="font-mono text-sm" /></div>
              {selectedStep.screenshot_url && (
                <div className="space-y-2"><Label>Screenshot</Label><div className="rounded-lg border overflow-hidden bg-muted"><img src={selectedStep.screenshot_url} alt={`Step ${steps.indexOf(selectedStep) + 1} screenshot`} className="w-full h-auto" /></div></div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm"><p>Select a step to edit or add a new step.</p></div>
          )}
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Documentation Preview</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="bg-primary/10 rounded-xl p-6">
              <h2 className="text-xl font-bold text-foreground">{recording.title}</h2>
              {recording.description && (<p className="text-sm text-muted-foreground mt-2">{recording.description}</p>)}
              <p className="text-xs text-muted-foreground mt-3">{steps.length} step{steps.length !== 1 ? 's' : ''} · Generated {new Date().toLocaleDateString()}</p>
            </div>
            {steps.map((step, i) => (
              <div key={step.id} className="flex gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">{i + 1}</div>
                  {i < steps.length - 1 && <div className="w-0.5 flex-1 bg-border mt-2" />}
                </div>
                <div className="flex-1 pb-8">
                  <p className="font-semibold text-foreground">{step.instruction}</p>
                  {step.notes && (<p className="text-sm text-muted-foreground mt-1 italic">{step.notes}</p>)}
                  {step.screenshot_url && (<div className="mt-3 rounded-lg border overflow-hidden bg-muted max-w-md"><img src={step.screenshot_url} alt={`Step ${i + 1}`} className="w-full h-auto" /></div>)}
                </div>
              </div>
            ))}
            {steps.length === 0 && (<p className="text-center text-muted-foreground py-8">No steps recorded yet.</p>)}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => handleDownloadPdf('en')}><Download className="mr-2 h-4 w-4" />English</Button>
            <Button variant="outline" onClick={() => handleDownloadPdf('ar')}><Languages className="mr-2 h-4 w-4" />العربية</Button>
            <Button variant="outline" onClick={() => handleDownloadPdf('fr')}><Languages className="mr-2 h-4 w-4" />Français</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScribeRecording;
