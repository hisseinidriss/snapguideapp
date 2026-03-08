import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, MousePointer2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { TourStep, Placement } from "@/types/tour";

const PLACEMENTS: { value: Placement; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "center", label: "Center" },
];

interface StepEditorPanelProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onUpdate: (id: string, updates: Partial<TourStep>) => void;
  onRemove: (id: string) => void;
  onPickElement?: () => void;
}

const StepEditorPanel = ({ step, stepIndex, totalSteps, onUpdate, onRemove, onPickElement }: StepEditorPanelProps) => {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Edit Step</h2>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onRemove(step.id)}>
          <Trash2 className="mr-1 h-3 w-3" />Remove
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={step.title} onChange={(e) => onUpdate(step.id, { title: e.target.value })} placeholder="Step title" />
      </div>

      <div className="space-y-2">
        <Label>Content</Label>
        <Textarea value={step.content} onChange={(e) => onUpdate(step.id, { content: e.target.value })} placeholder="Step description" rows={3} />
      </div>

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
