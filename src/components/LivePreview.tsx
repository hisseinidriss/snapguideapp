import { useState, useEffect } from "react";
import { TourStep } from "@/types/tour";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Play, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { functionsApi } from "@/api/functions";

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
  appUrl, steps, previewActive, previewStepIndex, onNext, onPrev, onClose, onStart,
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
      const { data, error: fnError } = await functionsApi.screenshotUrl({ url: appUrl });
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
            <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          {steps.length > 0 && !previewActive && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onStart}><Play className="mr-1 h-3 w-3" />Run Process</Button>
          )}
          {previewActive && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onClose}><X className="mr-1 h-3 w-3" />Stop</Button>
          )}
        </div>
      </div>

      <div className="flex-1 relative overflow-auto">
        {loading && !screenshotUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
            <div className="text-center space-y-3"><Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" /><p className="text-sm text-muted-foreground">Capturing screenshot...</p></div>
          </div>
        )}
        {error && !screenshotUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center space-y-3">
              <AlertTriangle className="h-8 w-8 mx-auto text-warning" />
              <p className="text-sm font-medium">Unable to capture screenshot</p>
              <p className="text-xs text-muted-foreground">Check the app URL and try again.</p>
              <Button size="sm" variant="outline" onClick={captureScreenshot}><RefreshCw className="mr-1 h-3 w-3" />Retry</Button>
            </div>
          </div>
        )}
        {screenshotUrl && (<img src={screenshotUrl} alt="App screenshot" className="w-full h-auto" />)}

        {previewActive && step && (
          <div className="absolute inset-0 z-10">
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)", transition: "opacity 0.3s" }} onClick={onClose} />
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-200"
                style={{ background: "#fff", borderRadius: "10px", padding: "20px", maxWidth: "320px", width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", fontFamily: "system-ui, -apple-system, sans-serif", color: "#000" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 600, color: "#000" }}>{step.title}</h3>
                <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#666" }}>{step.content}</p>
                {step.selector && (
                  <div style={{ background: "#f5f5f5", borderRadius: "6px", padding: "6px 10px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "11px" }}>🎯</span>
                    <code style={{ fontSize: "11px", fontFamily: "monospace", color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{step.selector}</code>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#999" }}>{previewStepIndex + 1} of {steps.length}</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {previewStepIndex > 0 && (
                      <button onClick={onPrev} style={{ padding: "6px 12px", border: "1px solid #ddd", borderRadius: "6px", background: "#fff", cursor: "pointer", fontSize: "13px", color: "#333" }}>Back</button>
                    )}
                    <button onClick={isLast ? onClose : onNext} style={{ padding: "6px 16px", border: "none", borderRadius: "6px", background: "#1e6b45", color: "#fff", cursor: "pointer", fontSize: "13px" }}>
                      {isLast ? "Done" : "Next"}
                    </button>
                  </div>
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
