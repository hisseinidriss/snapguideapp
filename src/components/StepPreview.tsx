import { useState, useRef, useEffect } from "react";
import { TourStep } from "@/types/tour";
import { Button } from "@/components/ui/button";
import { X, Maximize2, SkipForward } from "lucide-react";

interface StepPreviewProps {
  steps: TourStep[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onDone: () => void;
}

function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?enablejsapi=1`;
  if (url.includes("onedrive.live.com") || url.includes("1drv.ms") || url.includes("sharepoint.com")) {
    return url.replace("/redir?", "/embed?");
  }
  if (url.includes("/embed")) return url;
  return url;
}

const StepPreview = ({ steps, currentIndex, onNext, onPrev, onClose, onDone }: StepPreviewProps) => {
  const [videoFinished, setVideoFinished] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset video state when step changes
  useEffect(() => {
    setVideoFinished(false);
    setVideoStarted(false);
  }, [currentIndex]);

  const step = steps[currentIndex];
  if (!step) return null;

  const isLast = currentIndex === steps.length - 1;
  const isVideo = (step as any).step_type === "video" && (step as any).video_url;
  const embedUrl = isVideo ? getVideoEmbedUrl((step as any).video_url) : null;

  const handleFullscreen = () => {
    iframeRef.current?.requestFullscreen?.();
  };

  const handleSkip = () => {
    setVideoFinished(true);
    if (isLast) onDone();
    else onNext();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 animate-fade-in">
      <div className={`bg-card rounded-xl shadow-2xl border p-6 relative ${isVideo ? "max-w-lg w-full mx-4" : "max-w-sm w-full mx-4"}`}>
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        <div className="mb-1">
          <span className="text-xs font-medium text-accent">Step {currentIndex + 1} of {steps.length}</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground mb-1">{step.content}</p>

        {isVideo && embedUrl && (
          <div className="my-4 space-y-2">
            <div className="relative rounded-lg overflow-hidden border bg-muted aspect-video">
              <iframe
                ref={iframeRef}
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; fullscreen; encrypted-media"
                allowFullScreen
                title="Step video"
                onLoad={() => setVideoStarted(true)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={handleFullscreen} className="text-xs h-7">
                <Maximize2 className="mr-1 h-3 w-3" />Full Screen
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSkip} className="text-xs h-7 text-muted-foreground">
                <SkipForward className="mr-1 h-3 w-3" />Skip Video
              </Button>
            </div>
          </div>
        )}

        {step.selector && (
          <p className="text-xs font-mono text-muted-foreground/70 mb-4">Target: {step.selector} · {step.placement}</p>
        )}
        {!step.selector && !isVideo && <div className="mb-4" />}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onPrev} disabled={currentIndex === 0}>Back</Button>
          <Button size="sm" onClick={isLast ? onDone : onNext}>
            {isLast ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StepPreview;
