// ScribeRecording - simplified step viewer (Scribe-style)
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Pencil, Trash2, Download, Languages, Loader2, FileText, FileType, ChevronDown, Edit3, ArrowUp, ArrowDown, Video, Sparkles,
} from "lucide-react";
import isdbLogo from "@/assets/isdb-logo.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { recordingsApi, recordingStepsApi } from "@/api/recordings";
import { useToast } from "@/hooks/use-toast";
import { generateSOPPdf, type PdfLanguage } from "@/lib/pdf-generator";
import { generateSOPDocx } from "@/lib/docx-generator";
import type { ProcessRecording, ProcessRecordingStep } from "@/types/recording";
import { http } from "@/api/http";
import AnnotationEditor from "@/components/AnnotationEditor";

/* ── Step Card ── */
interface StepCardProps {
  step: ProcessRecordingStep;
  index: number;
  total: number;
  onUpdate: (id: string, updates: Partial<ProcessRecordingStep>) => void;
  onRemove: (id: string) => void;
  onAnnotate: (step: ProcessRecordingStep) => void;
  onMove: (index: number, direction: -1 | 1) => void;
}

const StepCard = ({ step, index, total, onUpdate, onRemove, onAnnotate, onMove }: StepCardProps) => {
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
          <div className="flex flex-col items-center shrink-0 gap-1">
            <button
              type="button"
              onClick={() => onMove(index, -1)}
              disabled={index === 0}
              className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
              title="Move step up"
              aria-label="Move step up"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <span className="flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-base font-bold shadow-lg shadow-primary/20 ring-4 ring-background">
              {index + 1}
            </span>
            <button
              type="button"
              onClick={() => onMove(index, 1)}
              disabled={index === total - 1}
              className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
              title="Move step down"
              aria-label="Move step down"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
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
            <div className="relative rounded-2xl border bg-card shadow-md overflow-hidden hover:shadow-xl transition-shadow group/shot">
              {step.notes?.startsWith("Auto-redacted") && (
                <div className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-semibold shadow backdrop-blur" title={step.notes}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Redacted
                </div>
              )}
              <button
                type="button"
                onClick={() => onAnnotate(step)}
                className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-background/90 hover:bg-primary hover:text-primary-foreground text-foreground text-xs font-semibold shadow backdrop-blur opacity-0 group-hover/shot:opacity-100 transition-opacity"
                title="Annotate screenshot"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Annotate
              </button>
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
  const [titleVal, setTitleVal] = useState("");
  const [descVal, setDescVal] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [previewLang, setPreviewLang] = useState<'en' | 'ar' | 'fr'>('en');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [translationCache, setTranslationCache] = useState<Record<string, { title: string; description: string; steps: Array<{ instruction: string; notes: string | null }> }>>({});
  const [annotateStep, setAnnotateStep] = useState<ProcessRecordingStep | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const pollRef = useRef<number | null>(null);

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

  const moveStep = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const reordered = [...steps];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    // Reassign sort_order based on new positions
    const withOrder = reordered.map((s, i) => ({ ...s, sort_order: i }));
    setSteps(withOrder);
    // Persist only the two changed steps
    const a = withOrder[index];
    const b = withOrder[target];
    try {
      await Promise.all([
        recordingStepsApi.update(a.id, { sort_order: a.sort_order }),
        recordingStepsApi.update(b.id, { sort_order: b.sort_order }),
      ]);
    } catch (err: any) {
      toast({ title: "Reorder failed", description: err?.message || "Could not save new order", variant: "destructive" });
    }
  };

  const removeStep = async (id: string) => {
    await recordingStepsApi.delete(id);
    setSteps(prev => prev.filter(s => s.id !== id));
  };

  // Poll recording row while video is being prepared
  const startPolling = useCallback(() => {
    if (!recordingId) return;
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      const { data } = await recordingsApi.get(recordingId);
      if (!data) return;
      setRecording(prev => prev ? { ...prev, ...data } as ProcessRecording : data as ProcessRecording);
      const status = (data as any).video_status;
      if (status === "ready" || status === "failed") {
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
        setVideoBusy(false);
        if (status === "ready") {
          toast({ title: "Video ready", description: "Your AI-narrated walkthrough is ready to download." });
        } else {
          toast({
            title: "Video generation failed",
            description: (data as any).video_error || "Unknown error",
            variant: "destructive",
          });
        }
      }
    }, 3000);
  }, [recordingId, toast]);

  useEffect(() => {
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, []);

  // Resume polling automatically if we land on a recording mid-render
  useEffect(() => {
    const status = recording?.video_status;
    if (status === "narrating" || status === "rendering") {
      setVideoBusy(true);
      startPolling();
    }
  }, [recording?.video_status, startPolling]);

  const handleGenerateVideo = async () => {
    if (!recordingId || !recording) return;
    if (!steps.length || !steps.every(s => s.screenshot_url)) {
      toast({
        title: "Cannot generate video",
        description: "Every step needs a screenshot first.",
        variant: "destructive",
      });
      return;
    }
    setVideoBusy(true);
    setRecording(prev => prev ? { ...prev, video_status: "narrating", video_error: null } : prev);
    toast({ title: "Generating narration", description: "This may take a minute…" });

    const narr = await recordingsApi.generateNarration(recordingId);
    if (narr.error) {
      setVideoBusy(false);
      setRecording(prev => prev ? { ...prev, video_status: "failed", video_error: narr.error!.message } : prev);
      toast({ title: "Narration failed", description: narr.error.message, variant: "destructive" });
      return;
    }

    setRecording(prev => prev ? { ...prev, video_status: "rendering" } : prev);
    toast({ title: "Rendering MP4", description: "Stitching screenshots and audio…" });
    startPolling();

    // Fire-and-forget render; polling will pick up the final status.
    recordingsApi.renderVideo(recordingId).then(({ error }) => {
      if (error) {
        setVideoBusy(false);
        if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
        setRecording(prev => prev ? { ...prev, video_status: "failed", video_error: error.message } : prev);
        toast({ title: "Render failed", description: error.message, variant: "destructive" });
      }
    });
  };


  const fetchTranslation = useCallback(async (lang: 'ar' | 'fr') => {
    if (!recording) return null;
    if (translationCache[lang]) return translationCache[lang];
    const { data, error } = await http.post<{
      title: string;
      description: string;
      steps: Array<{ instruction: string; notes: string | null }>;
    }>('/translate-steps', {
      title: recording.title,
      description: recording.description || '',
      steps: steps.map(s => ({ instruction: s.instruction, notes: s.notes })),
      targetLanguage: lang,
    });
    if (error || !data) throw new Error(error?.message || 'Translation failed');
    setTranslationCache(prev => ({ ...prev, [lang]: data }));
    return data;
  }, [recording, steps, translationCache]);

  // Re-fetch when source changes — invalidate cache
  useEffect(() => { setTranslationCache({}); }, [recording?.title, recording?.description, steps]);

  const handlePreviewLangChange = async (lang: 'en' | 'ar' | 'fr') => {
    setPreviewLang(lang);
    if (lang === 'en' || translationCache[lang]) return;
    setPreviewLoading(true);
    try {
      await fetchTranslation(lang);
    } catch (err: any) {
      toast({ title: "Translation failed", description: err.message, variant: "destructive" });
      setPreviewLang('en');
    } finally {
      setPreviewLoading(false);
    }
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
      const data = await fetchTranslation(lang as 'ar' | 'fr');
      if (!data) throw new Error("No translation");
      await generateSOPPdf(recording.title, recording.description || '', steps, {
        language: lang, translatedTitle: data.title,
        translatedDescription: data.description, translatedSteps: data.steps,
      });
      toast({ title: "PDF downloaded" });
    } catch (err: any) {
      toast({ title: "Translation failed", description: err.message, variant: "destructive" });
    } finally { setTranslating(false); }
  };

  const handleDownloadDocx = async (lang: 'en' | 'ar' = 'en') => {
    if (!recording) return;
    try {
      if (lang === 'en') {
        await generateSOPDocx(recording.title, recording.description || '', steps);
        toast({ title: "Word document downloaded" });
        return;
      }
      setTranslating(true);
      const data = await fetchTranslation(lang);
      if (!data) throw new Error("No translation");
      await generateSOPDocx(recording.title, recording.description || '', steps, {
        language: lang, translatedTitle: data.title,
        translatedDescription: data.description, translatedSteps: data.steps,
      });
      toast({ title: "Word document downloaded" });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally { setTranslating(false); }
  };

  // Active preview content (translated or original)
  const activeTranslation = previewLang !== 'en' ? translationCache[previewLang] : null;
  const previewTitle = activeTranslation?.title ?? recording?.title ?? '';
  const previewDescription = activeTranslation?.description ?? recording?.description ?? '';
  const previewSteps = steps.map((s, i) => ({
    ...s,
    instruction: activeTranslation?.steps?.[i]?.instruction ?? s.instruction,
  }));
  const isRtl = previewLang === 'ar';

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
            <h1 className="text-sm font-semibold truncate">{recording.title}</h1>
            <p className="text-xs text-muted-foreground truncate">
              {recording.description || "No description"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setPreviewOpen(true)}>
              <FileText className="mr-1.5 h-3.5 w-3.5" /><span className="hidden sm:inline">Preview</span>
            </Button>

            {recording.video_status === "ready" && recording.video_url ? (
              <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
                <a href={recording.video_url} download={`${recording.title || 'walkthrough'}.mp4`}>
                  <Video className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Download MP4</span>
                </a>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={handleGenerateVideo}
                disabled={videoBusy}
                title="Generate AI-narrated walkthrough video"
              >
                {videoBusy
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Sparkles className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">
                  {recording.video_status === "narrating" ? "Narrating…"
                    : recording.video_status === "rendering" ? "Rendering…"
                    : "AI Video"}
                </span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5" disabled={translating}>
                  {translating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{translating ? 'Translating…' : 'Download'}</span>
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">Word Document</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleDownloadDocx('en')}>
                  <FileType className="mr-2 h-4 w-4 text-primary" />
                  English (.docx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadDocx('ar')}>
                  <FileType className="mr-2 h-4 w-4 text-primary" />
                  العربية (.docx)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">PDF</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleDownloadPdf('en')}>
                  English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadPdf('ar')}>
                  العربية
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadPdf('fr')}>
                  Français
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Steps list */}
      <div className="container max-w-5xl mx-auto px-4 py-10">
        {/* Hero - Editable */}
        <div className="mb-20 text-center group/hero">
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

        </div>

        <div className="space-y-14">
          {steps.map((step, i) => (
            <StepCard key={step.id} step={step} index={i} total={steps.length} onUpdate={updateStep} onRemove={removeStep} onAnnotate={setAnnotateStep} onMove={moveStep} />
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

          {/* Live language switcher */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Languages className="h-3.5 w-3.5" />
              <span>Preview language</span>
              {previewLoading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
            </div>
            <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
              {([
                { code: 'en' as const, label: 'English' },
                { code: 'ar' as const, label: 'العربية' },
                { code: 'fr' as const, label: 'Français' },
              ]).map(opt => (
                <button
                  key={opt.code}
                  onClick={() => handlePreviewLangChange(opt.code)}
                  disabled={previewLoading}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    previewLang === opt.code
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  } disabled:opacity-50`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6 py-4" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="bg-primary/10 rounded-xl p-6">
              <h2 className="text-xl font-bold text-foreground">{previewTitle}</h2>
              {previewDescription && <p className="text-sm text-muted-foreground mt-2">{previewDescription}</p>}
              <p className="text-xs text-muted-foreground mt-3">{previewSteps.length} step{previewSteps.length !== 1 ? 's' : ''}</p>
            </div>
            {previewSteps.map((step, i) => (
              <div key={step.id} className="flex gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">{i + 1}</div>
                  {i < previewSteps.length - 1 && <div className="w-0.5 flex-1 bg-border mt-2" />}
                </div>
                <div className="flex-1 pb-8">
                  <p className="font-semibold text-foreground">{step.instruction}</p>
                  {step.screenshot_url && <div className="mt-3 rounded-lg border overflow-hidden bg-muted max-w-md"><img src={step.screenshot_url} alt={`Step ${i + 1}`} className="w-full h-auto" /></div>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => handleDownloadDocx('en')}><FileType className="mr-2 h-4 w-4" />Word</Button>
            <Button variant="outline" onClick={() => handleDownloadDocx('ar')}><FileType className="mr-2 h-4 w-4" />Word (AR)</Button>
            <Button variant="outline" onClick={() => handleDownloadPdf('en')}><Download className="mr-2 h-4 w-4" />English PDF</Button>
            <Button variant="outline" onClick={() => handleDownloadPdf('ar')}><Download className="mr-2 h-4 w-4" />العربية</Button>
            <Button variant="outline" onClick={() => handleDownloadPdf('fr')}><Download className="mr-2 h-4 w-4" />Français</Button>
          </div>
        </DialogContent>
      </Dialog>

      {annotateStep && (
        <AnnotationEditor
          open={!!annotateStep}
          onOpenChange={(v) => { if (!v) setAnnotateStep(null); }}
          imageUrl={annotateStep.screenshot_url!}
          recordingId={recordingId!}
          stepNumber={annotateStep.sort_order + 1}
          onSaved={(newUrl) => {
            updateStep(annotateStep.id, { screenshot_url: newUrl, notes: "Annotated" });
            setAnnotateStep(null);
          }}
        />
      )}
    </div>
  );
};

export default ScribeRecording;
