// ScribeRecording - simplified step viewer (Scribe-style)
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Pencil, Trash2, Download, Plus, Languages, Loader2, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

/* ── Step Card ── */
interface StepCardProps {
  step: ProcessRecordingStep;
  index: number;
  onUpdate: (id: string, updates: Partial<ProcessRecordingStep>) => void;
  onRemove: (id: string) => void;
}

const StepCard = ({ step, index, onUpdate, onRemove }: StepCardProps) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(step.instruction);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setVal(step.instruction); }, [step.instruction]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    if (val.trim() && val !== step.instruction) onUpdate(step.id, { instruction: val });
    setEditing(false);
  };

  return (
    <div className="group relative bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Step header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          {editing ? (
            <Textarea
              ref={inputRef}
              value={val}
              onChange={e => setVal(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); } }}
              rows={2}
              className="text-sm font-medium resize-none"
            />
          ) : (
            <p
              className="text-sm font-medium cursor-pointer hover:text-primary transition-colors leading-snug"
              onDoubleClick={() => setEditing(true)}
              title="Double-click to edit"
            >
              {step.instruction}
              <Pencil className="inline-block ml-1.5 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive shrink-0"
          onClick={() => onRemove(step.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Screenshot */}
      {step.screenshot_url ? (
        <div className="px-4 pb-4">
          <div className="rounded-lg border overflow-hidden bg-muted">
            <img
              src={step.screenshot_url}
              alt={`Step ${index + 1} screenshot`}
              className="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>
      ) : (
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-dashed bg-muted/50 flex items-center justify-center h-32 text-xs text-muted-foreground">
            No screenshot captured
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Main Page ── */
const ScribeRecording = () => {
  const { appId, recordingId } = useParams<{ appId: string; recordingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [recording, setRecording] = useState<ProcessRecording | null>(null);
  const [steps, setSteps] = useState<ProcessRecordingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTitle, setEditTitle] = useState(false);
  const [editDesc, setEditDesc] = useState(false);
  const [titleVal, setTitleVal] = useState("");
  const [descVal, setDescVal] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [translating, setTranslating] = useState(false);

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
      setLoading(false);
    };
    load();
  }, [appId, recordingId]);

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
    setSteps(prev => prev.filter(s => s.id !== id));
  };


  const handleDownloadPdf = async (lang: PdfLanguage = 'en') => {
    if (!recording) return;
    if (lang === 'en') {
      await generateSOPPdf(recording.title, recording.description || '', steps);
      toast({ title: "PDF downloaded" });
      return;
    }
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-steps', {
        body: {
          title: recording.title, description: recording.description || '',
          steps: steps.map(s => ({ instruction: s.instruction, notes: s.notes })),
          targetLanguage: lang,
        },
      });
      if (error) throw error;
      await generateSOPPdf(recording.title, recording.description || '', steps, {
        language: lang, translatedTitle: data.title,
        translatedDescription: data.description, translatedSteps: data.steps,
      });
      toast({ title: "PDF downloaded" });
    } catch (err: any) {
      toast({ title: "Translation failed", description: err.message, variant: "destructive" });
    } finally { setTranslating(false); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  if (!recording) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-center"><h2 className="text-xl font-semibold mb-2">Recording not found</h2><Button variant="ghost" asChild><Link to={`/app/${appId}`}>Go back</Link></Button></div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/app/${appId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            {editTitle ? (
              <Input value={titleVal} onChange={e => setTitleVal(e.target.value)}
                onBlur={() => { updateRecording({ title: titleVal }); setEditTitle(false); }}
                onKeyDown={e => { if (e.key === 'Enter') { updateRecording({ title: titleVal }); setEditTitle(false); } }}
                className="h-8 text-sm font-semibold" autoFocus />
            ) : (
              <h1 className="text-sm font-semibold truncate cursor-pointer hover:text-primary transition-colors"
                onClick={() => setEditTitle(true)}>
                {recording.title}<Pencil className="inline-block ml-1.5 h-3 w-3 text-muted-foreground" />
              </h1>
            )}
            {editDesc ? (
              <Input value={descVal} onChange={e => setDescVal(e.target.value)}
                onBlur={() => { updateRecording({ description: descVal }); setEditDesc(false); }}
                onKeyDown={e => { if (e.key === 'Enter') { updateRecording({ description: descVal }); setEditDesc(false); } }}
                className="h-6 text-xs mt-0.5" placeholder="Add a description…" autoFocus />
            ) : (
              <p className="text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors truncate"
                onClick={() => setEditDesc(true)}>
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
                <span className="hidden sm:inline">{translating ? 'Translating…' : 'PDF'}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="ar">🇸🇦 العربية</SelectItem>
                <SelectItem value="fr">🇫🇷 Français</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Steps list */}
      <div className="container max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{steps.length} step{steps.length !== 1 ? 's' : ''}</p>
        </div>

        {steps.map((step, i) => (
          <StepCard key={step.id} step={step} index={i} onUpdate={updateStep} onRemove={removeStep} />
        ))}

        {steps.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No steps yet. Add steps manually or use the extension to record.</p>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Documentation Preview</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="bg-primary/10 rounded-xl p-6">
              <h2 className="text-xl font-bold text-foreground">{recording.title}</h2>
              {recording.description && <p className="text-sm text-muted-foreground mt-2">{recording.description}</p>}
              <p className="text-xs text-muted-foreground mt-3">{steps.length} step{steps.length !== 1 ? 's' : ''}</p>
            </div>
            {steps.map((step, i) => (
              <div key={step.id} className="flex gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">{i + 1}</div>
                  {i < steps.length - 1 && <div className="w-0.5 flex-1 bg-border mt-2" />}
                </div>
                <div className="flex-1 pb-8">
                  <p className="font-semibold text-foreground">{step.instruction}</p>
                  {step.screenshot_url && <div className="mt-3 rounded-lg border overflow-hidden bg-muted max-w-md"><img src={step.screenshot_url} alt={`Step ${i + 1}`} className="w-full h-auto" /></div>}
                </div>
              </div>
            ))}
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
