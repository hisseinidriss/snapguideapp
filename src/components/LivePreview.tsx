import { useState } from "react";
import { TourStep } from "@/types/tour";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Play, AlertTriangle } from "lucide-react";

interface LivePreviewProps {
  appUrl: string;
  steps: TourStep[];
  previewActive: boolean;
  previewStepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onStart: () => void;
}

const LivePreview = ({
  appUrl,
  steps,
  previewActive,
  previewStepIndex,
  onNext,
  onPrev,
  onClose,
  onStart,
}: LivePreviewProps) => {
  const [iframeError, setIframeError] = useState(false);
  const step = previewActive ? steps[previewStepIndex] : null;
  const isLast = previewStepIndex === steps.length - 1;

  if (!appUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30 text-muted-foreground">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-8 w-8 mx-auto opacity-50" />
          <p className="text-sm">No app URL configured.</p>
          <p className="text-xs">Add a URL to your app to see the live preview.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative bg-muted/20 overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 border-b bg-card px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
          </div>
          <span className="text-xs text-muted-foreground font-mono truncate max-w-[300px]">{appUrl}</span>
        </div>
        {steps.length > 0 && !previewActive && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onStart}>
            <Play className="mr-1 h-3 w-3" />Run Tour
          </Button>
        )}
      </div>

      {/* Iframe */}
      <div className="flex-1 relative">
        <iframe
          src={appUrl}
          className="w-full h-full border-0"
          title="App Preview"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          onError={() => setIframeError(true)}
        />

        {iframeError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center space-y-2">
              <AlertTriangle className="h-8 w-8 mx-auto text-warning" />
              <p className="text-sm font-medium">Unable to load preview</p>
              <p className="text-xs text-muted-foreground">The site may block iframe embedding.</p>
            </div>
          </div>
        )}

        {/* Tour step overlay */}
        {previewActive && step && (
          <div className="absolute inset-0 z-10">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />
            
            {/* Tooltip */}
            <div className="absolute z-20 bg-card rounded-xl shadow-2xl border p-5 max-w-xs"
              style={getTooltipPosition(step)}
            >
              <button onClick={onClose} className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">
                Step {previewStepIndex + 1} of {steps.length}
              </span>
              <h3 className="text-sm font-semibold mt-1 mb-1">{step.title}</h3>
              <p className="text-xs text-muted-foreground mb-3">{step.content}</p>
              {step.selector && (
                <p className="text-[10px] font-mono text-muted-foreground/60 mb-3 truncate">
                  🎯 {step.selector}
                </p>
              )}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onPrev} disabled={previewStepIndex === 0}>
                  <ChevronLeft className="mr-0.5 h-3 w-3" />Back
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={isLast ? onClose : onNext}>
                  {isLast ? "Done" : "Next"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function getTooltipPosition(step: TourStep): React.CSSProperties {
  // Since we can't access iframe DOM, position based on placement hint
  const base: React.CSSProperties = { };
  
  if (!step.selector || step.placement === "center") {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  // Position hints based on placement
  switch (step.placement) {
    case "top":
      return { top: "20%", left: "50%", transform: "translateX(-50%)" };
    case "bottom":
      return { bottom: "20%", left: "50%", transform: "translateX(-50%)" };
    case "left":
      return { top: "40%", left: "10%" };
    case "right":
      return { top: "40%", right: "10%" };
    default:
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
}

export default LivePreview;
