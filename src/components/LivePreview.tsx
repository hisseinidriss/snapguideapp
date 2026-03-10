import { useState, useEffect } from "react";
import { TourStep } from "@/types/tour";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Play, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const step = previewActive ? steps[previewStepIndex] : null;
  const isLast = previewStepIndex === steps.length - 1;

  const captureScreenshot = async () => {
    if (!appUrl) return;
    setLoading(true);
    setError(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("screenshot-url", {
        body: { url: appUrl },
      });
      if (fnError || !data?.screenshot) {
        setError(true);
      } else {
        setScreenshotUrl(data.screenshot);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (appUrl) captureScreenshot();
  }, [appUrl]);

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
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={captureScreenshot} disabled={loading}>
            <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {steps.length > 0 && !previewActive && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onStart}>
              <Play className="mr-1 h-3 w-3" />Run Process
            </Button>
          )}
        </div>
      </div>

      {/* Screenshot preview */}
      <div className="flex-1 relative overflow-auto">
        {loading && !screenshotUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Capturing screenshot...</p>
            </div>
          </div>
        )}

        {error && !screenshotUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center space-y-3">
              <AlertTriangle className="h-8 w-8 mx-auto text-warning" />
              <p className="text-sm font-medium">Unable to capture screenshot</p>
              <p className="text-xs text-muted-foreground">Check the app URL and try again.</p>
              <Button size="sm" variant="outline" onClick={captureScreenshot}>
                <RefreshCw className="mr-1 h-3 w-3" />Retry
              </Button>
            </div>
          </div>
        )}

        {screenshotUrl && (
          <img
            src={screenshotUrl}
            alt="App screenshot"
            className="w-full h-auto"
          />
        )}

        {/* Tour step overlay */}
        {previewActive && step && (
          <div className="absolute inset-0 z-10">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />

            {/* Step card - always centered and prominent */}
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="bg-card rounded-xl shadow-2xl border p-6 max-w-sm w-full relative animate-in fade-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
                
                {/* Progress bar */}
                <div className="flex gap-1 mb-4">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= previewStepIndex ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>

                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  Step {previewStepIndex + 1} of {steps.length}
                </span>
                <h3 className="text-base font-semibold mt-1 mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{step.content}</p>
                
                {step.selector && (
                  <div className="bg-muted/50 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
                    <span className="text-xs">🎯</span>
                    <code className="text-[11px] font-mono text-muted-foreground truncate">{step.selector}</code>
                  </div>
                )}

                {step.target_url && (
                  <div className="bg-muted/50 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
                    <span className="text-xs">🔗</span>
                    <code className="text-[11px] font-mono text-muted-foreground truncate">{step.target_url}</code>
                  </div>
                )}

                {step.click_selector && (
                  <div className="bg-muted/50 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
                    <span className="text-xs">👆</span>
                    <code className="text-[11px] font-mono text-muted-foreground truncate">{step.click_selector}</code>
                  </div>
                )}
                
                {!step.selector && (
                  <p className="text-[11px] text-muted-foreground/70 italic mb-4">This step shows as a centered modal (no target element)</p>
                )}

                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onPrev} disabled={previewStepIndex === 0}>
                    <ChevronLeft className="mr-0.5 h-3 w-3" />Back
                  </Button>
                  <Button size="sm" className="h-8 text-xs" onClick={isLast ? onClose : onNext}>
                    {isLast ? "Done" : "Next"}
                    {!isLast && <ChevronRight className="ml-0.5 h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default LivePreview;
