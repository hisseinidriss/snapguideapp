import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, MousePointer2, Video, ArrowUpDown } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import type { TourStep, Placement } from "@/types/tour";

const PLACEMENTS: { value: Placement; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "center", label: "Center" },
];

const STEP_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "video", label: "Video Step" },
];

interface StepEditorPanelProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onUpdate: (id: string, updates: Partial<TourStep>) => void;
  onRemove: (id: string) => void;
  onPickElement?: () => void;
  onMoveToPosition?: (fromIndex: number, toPosition: number) => void;
}

function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  if (url.includes("onedrive.live.com") || url.includes("1drv.ms") || url.includes("sharepoint.com")) {
    return url.replace("/redir?", "/embed?").replace("resid=", "resid=");
  }
  if (url.includes("/embed")) return url;
  return url;
}

const StepEditorPanel = ({ step, stepIndex, totalSteps, onUpdate, onRemove, onPickElement, onMoveToPosition }: StepEditorPanelProps) => {
  const stepType = (step as any).step_type || "standard";
  const videoUrl = (step as any).video_url || "";
  const [moveToValue, setMoveToValue] = useState("");
  const [movePopoverOpen, setMovePopoverOpen] = useState(false);

  const handleMoveTo = () => {
    const pos = parseInt(moveToValue, 10);
    if (!isNaN(pos) && pos >= 1 && pos <= totalSteps && pos !== stepIndex + 1 && onMoveToPosition) {
      onMoveToPosition(stepIndex, pos);
      setMoveToValue("");
      setMovePopoverOpen(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Edit Step</h2>
          <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
            {stepIndex + 1}/{totalSteps}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onMoveToPosition && totalSteps > 1 && (
            <Popover open={movePopoverOpen} onOpenChange={setMovePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  <ArrowUpDown className="mr-1 h-3 w-3" />Move
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="end">
                <p className="text-xs font-medium mb-2">Move to position</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={totalSteps}
                    value={moveToValue}
                    onChange={(e) => setMoveToValue(e.target.value)}
                    placeholder={`1–${totalSteps}`}
                    className="h-8 text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter") handleMoveTo(); }}
                  />
                  <Button size="sm" className="h-8" onClick={handleMoveTo}>Go</Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {Array.from({ length: totalSteps }, (_, i) => i + 1).filter(p => p !== stepIndex + 1).slice(0, 10).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => { onMoveToPosition(stepIndex, pos); setMovePopoverOpen(false); }}
                      className="h-6 w-6 text-[10px] rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors font-mono"
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Button variant="ghost" size="sm" className="text-destructive h-7 text-xs" onClick={() => onRemove(step.id)}>
            <Trash2 className="mr-1 h-3 w-3" />Remove
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Step Type</Label>
        <Select value={stepType} onValueChange={(v) => onUpdate(step.id, { step_type: v } as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {STEP_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={step.title} onChange={(e) => onUpdate(step.id, { title: e.target.value })} placeholder="Step title" />
      </div>

      <div className="space-y-2">
        <Label>Content</Label>
        <Textarea value={step.content} onChange={(e) => onUpdate(step.id, { content: e.target.value })} placeholder="Step description" rows={3} />
      </div>

      {stepType === "video" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            <Label>Video URL</Label>
          </div>
          <Input
            value={videoUrl}
            onChange={(e) => onUpdate(step.id, { video_url: e.target.value || null } as any)}
            placeholder="https://youtube.com/watch?v=... or OneDrive link"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Supports YouTube and Microsoft OneDrive share links. The link will be auto-converted to an embeddable player.
          </p>
          {videoUrl && (
            <div className="rounded-lg overflow-hidden border bg-muted aspect-video">
              <iframe
                src={getVideoEmbedUrl(videoUrl) || ""}
                className="w-full h-full"
                allow="autoplay; fullscreen; encrypted-media"
                allowFullScreen
                title="Video preview"
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>CSS Selector</Label>
          {onPickElement && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onPickElement}>
              <MousePointer2 className="mr-1 h-3 w-3" />Pick Element
            </Button>
          )}
        </div>
        <Input value={step.selector || ""} onChange={(e) => onUpdate(step.id, { selector: e.target.value })} placeholder="#my-button or .nav-item" className="font-mono text-sm" />
        <p className="text-xs text-muted-foreground">Target element for this step. Leave empty for a centered modal.</p>
      </div>

      <div className="space-y-2">
        <Label>Target URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input value={(step as any).target_url || ""} onChange={(e) => onUpdate(step.id, { target_url: e.target.value || null } as any)} placeholder="/portfolio or https://app.com/page" className="font-mono text-sm" />
        <p className="text-xs text-muted-foreground">Navigate to this URL before showing the step. Used for multi-page tours.</p>
      </div>

      <div className="space-y-2">
        <Label>Click Selector <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input value={(step as any).click_selector || ""} onChange={(e) => onUpdate(step.id, { click_selector: e.target.value || null } as any)} placeholder="#create-btn or .open-modal" className="font-mono text-sm" />
        <p className="text-xs text-muted-foreground">Click this element first to open a modal or popup before showing the step tooltip.</p>
      </div>

      <div className="space-y-2">
        <Label>Placement</Label>
        <Select value={step.placement} onValueChange={(v) => onUpdate(step.id, { placement: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PLACEMENTS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default StepEditorPanel;
