// ScribeRecording - simplified step viewer (Scribe-style)
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Pencil, Trash2, Download, Plus, Languages, Loader2, FileText,
} from "lucide-react";
import isdbLogo from "@/assets/isdb-logo.jpg";
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

  const isEven = index % 2 === 0;

  return (
    <div className="group relative">
      {/* Connector line */}
      <div className="absolute left-6 top-14 bottom-0 w-px bg-gradient-to-b from-primary/40 to-transparent -z-10" />

      <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-5 items-start`}>
        {/* Number badge + content side */}
        <div className="flex gap-4 md:w-2/5 w-full">
          <div className="flex flex-col items-center shrink-0">
            <span className="flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-base font-bold shadow-lg shadow-primary/20 ring-4 ring-background">
              {index + 1}
            </span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            {editing ? (
              <Textarea
                ref={inputRef}
                value={val}
                onChange={e => setVal(e.target.value)}
                onBlur={commit}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); } }}
                rows={3}
                className="text-base font-medium resize-none"
              />
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">
                  Step {index + 1}
                </p>
                <p
                  className="text-base font-semibold text-foreground cursor-pointer hover:text-primary transition-colors leading-relaxed"
                  onDoubleClick={() => setEditing(true)}
                  title="Double-click to edit"
                >
                  {step.instruction}
                  <Pencil className="inline-block ml-2 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <button
                  className="text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1"
                  onClick={() => onRemove(step.id)}
                >
                  <Trash2 className="h-3 w-3" />Remove step
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Screenshot side */}
        <div className="md:w-3/5 w-full">
          {step.screenshot_url ? (
            <div className="rounded-2xl border bg-card shadow-md overflow-hidden hover:shadow-xl transition-shadow">
              <img
                src={step.screenshot_url}
                alt={`Step ${index + 1} screenshot`}
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed bg-muted/30 flex items-center justify-center h-40 text-xs text-muted-foreground">
              No screenshot captured
            </div>
          )}
        </div>
      </div>
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
  const [editHeaderTitle, setEditHeaderTitle] = useState(false);
  const [editHeaderDesc, setEditHeaderDesc] = useState(false);
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
          <img src={isdbLogo} alt="IsDB Logo" className="h-8 w-8 rounded-lg object-cover" />
          <div className="flex-1 min-w-0">
            {editHeaderTitle ? (
              <Input value={titleVal} onChange={e => setTitleVal(e.target.value)}
                onBlur={() => { updateRecording({ title: titleVal }); setEditHeaderTitle(false); }}
                onKeyDown={e => { if (e.key === 'Enter') { updateRecording({ title: titleVal }); setEditHeaderTitle(false); } }}
                className="h-8 text-sm font-semibold" autoFocus />
            ) : (
              <h1 className="text-sm font-semibold truncate cursor-pointer hover:text-primary transition-colors"
                onClick={() => setEditHeaderTitle(true)}>
                {recording.title}<Pencil className="inline-block ml-1.5 h-3 w-3 text-muted-foreground" />
              </h1>
            )}
            {editHeaderDesc ? (
              <Input value={descVal} onChange={e => setDescVal(e.target.value)}
                onBlur={() => { updateRecording({ description: descVal }); setEditHeaderDesc(false); }}
                onKeyDown={e => { if (e.key === 'Enter') { updateRecording({ description: descVal }); setEditHeaderDesc(false); } }}
                className="h-6 text-xs mt-0.5" placeholder="Add a description…" autoFocus />
            ) : (
              <p className="text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors truncate"
                onClick={() => setEditHeaderDesc(true)}>
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
      <div className="container max-w-5xl mx-auto px-4 py-10">
        {/* Hero - Editable */}
        <div className="mb-12 text-center group/hero">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Process Documentation</p>

          {editTitle ? (
            <Input
              value={titleVal}
              onChange={e => setTitleVal(e.target.value)}
              onBlur={() => { updateRecording({ title: titleVal || "Untitled" }); setEditTitle(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { updateRecording({ title: titleVal || "Untitled" }); setEditTitle(false); } }}
              autoFocus
              placeholder="Enter a title…"
              className="text-3xl md:text-4xl font-bold text-center h-auto py-2 mb-3 max-w-2xl mx-auto"
            />
          ) : (
            <h2
              className="text-3xl md:text-4xl font-bold text-foreground mb-3 cursor-pointer hover:text-primary transition-colors inline-flex items-center gap-2 group/title"
              onClick={() => setEditTitle(true)}
              title="Click to edit title"
            >
              {recording.title}
              <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity" />
            </h2>
          )}

          {editDesc ? (
            <Textarea
              value={descVal}
              onChange={e => setDescVal(e.target.value)}
              onBlur={() => { updateRecording({ description: descVal }); setEditDesc(false); }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); updateRecording({ description: descVal }); setEditDesc(false); } }}
              autoFocus
              placeholder="Add a description that will appear in the PDF…"
              rows={2}
              className="text-base text-center max-w-2xl mx-auto resize-none"
            />
          ) : (
            <p
              className="text-muted-foreground max-w-2xl mx-auto cursor-pointer hover:text-primary transition-colors inline-flex items-center gap-2 group/desc"
              onClick={() => setEditDesc(true)}
              title="Click to edit description"
            >
              {recording.description || <span className="italic opacity-70">Click to add a description…</span>}
              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/desc:opacity-100 transition-opacity shrink-0" />
            </p>
          )}

          <div className="inline-flex items-center gap-2 mt-5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {steps.length} step{steps.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="space-y-14">
          {steps.map((step, i) => (
            <StepCard key={step.id} step={step} index={i} onUpdate={updateStep} onRemove={removeStep} />
          ))}
        </div>

        {steps.length === 0 && (
          <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-2xl">
            <p className="text-sm">No steps yet. Use the browser extension to record your process.</p>
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
