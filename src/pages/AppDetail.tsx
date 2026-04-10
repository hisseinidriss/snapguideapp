// AppDetail - shows recordings (Scribe documents) for an application
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, MoreVertical, HelpCircle, GripVertical, FileText, Download, Loader2 } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appsApi } from "@/api/apps";
import { recordingsApi, recordingStepsApi } from "@/api/recordings";
import type { ProcessRecording } from "@/types/recording";
import { useToast } from "@/hooks/use-toast";
import { generateAppColor } from "@/lib/app-colors";
import { generateCombinedPdf } from "@/lib/pdf-generator";

interface SortableRecordingCardProps {
  recording: ProcessRecording;
  editingId: string | null;
  editingName: string;
  setEditingId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  handleRename: (id: string) => void;
  handleDelete: (id: string) => void;
  navigate: (path: string) => void;
  appId: string;
  appName: string;
}

const SortableRecordingCard = ({ recording, editingId, editingName, setEditingId, setEditingName, handleRename, handleDelete, navigate, appId, appName }: SortableRecordingCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: recording.id });
  const bgColor = generateAppColor(appName);
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, borderLeft: `4px solid ${bgColor}` };

  return (
    <Card ref={setNodeRef} style={style} className="p-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none">
            <GripVertical className="h-5 w-5" />
          </button>
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            {editingId === recording.id ? (
              <Input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleRename(recording.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(recording.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="h-8 text-sm font-medium"
              />
            ) : (
              <h3
                className="font-medium truncate cursor-pointer hover:text-primary transition-colors"
                onDoubleClick={() => { setEditingId(recording.id); setEditingName(recording.title); }}
              >
                {recording.title}
              </h3>
            )}
            <p className="text-sm text-muted-foreground">
              {recording.status} · Updated {new Date(recording.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/app/${appId}/recording/${recording.id}`)}>
              Edit Recording
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(recording.id)}>
              Delete Recording
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
};

const AppDetail = () => {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appName, setAppName] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [recordings, setRecordings] = useState<ProcessRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [recordingName, setRecordingName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [downloadingAll, setDownloadingAll] = useState(false);

  const handleDownloadAll = async () => {
    if (!recordings.length) return;
    setDownloadingAll(true);
    try {
      const allWithSteps = await Promise.all(
        recordings.map(async (rec) => {
          const { data } = await recordingStepsApi.list(rec.id);
          return { title: rec.title, description: rec.description || '', steps: data || [] };
        })
      );
      await generateCombinedPdf(appName, allWithSteps as any);
      toast({ title: "PDF downloaded", description: `All ${recordings.length} recordings exported.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate PDF", variant: "destructive" });
    } finally {
      setDownloadingAll(false);
    }
  };

  useEffect(() => {
    if (!appId) return;
    const load = async () => {
      const [appRes, recordingsRes] = await Promise.all([
        appsApi.get(appId),
        recordingsApi.list(appId),
      ]);
      if (appRes.data) { setAppName(appRes.data.name); setAppUrl(appRes.data.url || ""); }
      setRecordings((recordingsRes.data || []) as unknown as ProcessRecording[]);
      setLoading(false);
    };
    load();
  }, [appId]);

  const handleCreateRecording = async () => {
    if (!recordingName.trim() || !appId) return;
    const { data, error } = await recordingsApi.create({
      app_id: appId,
      title: recordingName,
      status: "draft",
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (data) {
      setRecordings((prev) => [...prev, data as unknown as ProcessRecording]);
      setRecordingName("");
      setOpen(false);
      navigate(`/app/${appId}/recording/${(data as any).id}`);
    }
  };

  const handleDelete = async (id: string) => {
    await recordingsApi.delete(id);
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) { setEditingId(null); return; }
    const { error } = await recordingsApi.update(id, { title: editingName.trim() } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { setRecordings((prev) => prev.map((r) => r.id === id ? { ...r, title: editingName.trim() } : r)); }
    setEditingId(null);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = recordings.findIndex((r) => r.id === active.id);
    const newIndex = recordings.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...recordings];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setRecordings(reordered);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!appName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">App not found</h2>
          <Button variant="ghost" asChild><Link to="/">Go back</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="text-sm font-semibold">{appName}</h1>
              <p className="text-xs text-muted-foreground">{appUrl || "No URL configured"}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Recordings</h2>
          <div className="flex items-center gap-2">
            {recordings.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleDownloadAll} disabled={downloadingAll}>
                {downloadingAll ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                Download All
              </Button>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  New Recording
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create a new recording</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Recording Name</Label>
                  <Input placeholder="e.g. Employee Onboarding Process" value={recordingName} onChange={(e) => setRecordingName(e.target.value)} />
                </div>
                <Button onClick={handleCreateRecording} className="w-full" disabled={!recordingName.trim()}>Create Recording</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {recordings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
            <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
              <HelpCircle className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No recordings yet</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Create your first recording to start documenting processes step by step.
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={recordings.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {recordings.map((recording) => (
                  <SortableRecordingCard
                    key={recording.id}
                    recording={recording}
                    editingId={editingId}
                    editingName={editingName}
                    setEditingId={setEditingId}
                    setEditingName={setEditingName}
                    handleRename={handleRename}
                    handleDelete={handleDelete}
                    navigate={navigate}
                    appId={appId!}
                    appName={appName}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>
    </div>
  );
};

export default AppDetail;
