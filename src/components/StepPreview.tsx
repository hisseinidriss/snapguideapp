import { TourStep } from "@/types/tour";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface StepPreviewProps {
  steps: TourStep[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onDone: () => void;
}

const StepPreview = ({ steps, currentIndex, onNext, onPrev, onClose, onDone }: StepPreviewProps) => {
  const step = steps[currentIndex];
  if (!step) return null;
  const isLast = currentIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 animate-fade-in">
      <div className="bg-card rounded-xl shadow-2xl border p-6 max-w-sm w-full mx-4 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        <div className="mb-1">
          <span className="text-xs font-medium text-accent">Step {currentIndex + 1} of {steps.length}</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground mb-1">{step.content}</p>
        {step.selector && (
          <p className="text-xs font-mono text-muted-foreground/70 mb-4">Target: {step.selector} · {step.placement}</p>
        )}
        {!step.selector && <div className="mb-4" />}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onPrev} disabled={currentIndex === 0}>Back</Button>
          <Button size="sm" onClick={isLast ? onDone : onNext}>{isLast ? "Done" : "Next"}</Button>
        </div>
      </div>
    </div>
  );
};

export default StepPreview;
