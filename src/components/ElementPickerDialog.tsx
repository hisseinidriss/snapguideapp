import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Check, MousePointer2, Terminal, Bookmark, ExternalLink } from "lucide-react";
import { generatePickerScript } from "@/lib/element-picker";
import { useToast } from "@/hooks/use-toast";

interface ElementPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appUrl: string;
  onSelectorPicked: (selector: string) => void;
}

const ElementPickerDialog = ({ open, onOpenChange, appUrl, onSelectorPicked }: ElementPickerDialogProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bookmarklet = generatePickerScript(sessionId);

  // Poll localStorage in case the target app is same-origin
  // Also listen for storage events from other tabs
  useEffect(() => {
    if (!open) return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "__wt_picked_selector" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.sessionId === sessionId && data.selector) {
            onSelectorPicked(data.selector);
            onOpenChange(false);
            toast({ title: "Selector captured!", description: data.selector });
            localStorage.removeItem("__wt_picked_selector");
          }
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorage);

    // Also poll for same-tab scenarios
    pollRef.current = setInterval(() => {
      try {
        const raw = localStorage.getItem("__wt_picked_selector");
        if (raw) {
          const data = JSON.parse(raw);
          if (data.sessionId === sessionId && data.selector) {
            onSelectorPicked(data.selector);
            onOpenChange(false);
            toast({ title: "Selector captured!", description: data.selector });
            localStorage.removeItem("__wt_picked_selector");
          }
        }
      } catch {}
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, sessionId, onSelectorPicked, onOpenChange, toast]);

  const handleCopyScript = () => {
    // Console-pastable version
    const script = bookmarklet.replace("javascript:void(", "(").replace(/\)$/, ")");
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MousePointer2 className="h-5 w-5 text-primary" />
            Element Picker
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <p className="text-sm text-muted-foreground">
            Pick any element from your app to automatically capture its CSS selector.
          </p>

          {/* Step 1: Open your app */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">1</span>
              <span className="text-sm font-medium">Open your app</span>
            </div>
            {appUrl ? (
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <a href={appUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  {appUrl}
                </a>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground pl-8">No URL configured. Open your app manually in a new tab.</p>
            )}
          </div>

          {/* Step 2: Run the picker */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">2</span>
              <span className="text-sm font-medium">Activate the picker</span>
            </div>

            {/* Option A: Bookmarklet */}
            <div className="pl-8 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Option A: Drag to bookmarks bar</p>
              <div className="flex items-center gap-2">
                <a
                  href={bookmarklet}
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium cursor-grab active:cursor-grabbing hover:opacity-90 transition-opacity"
                  title="Drag this to your bookmarks bar"
                  draggable
                >
                  <Bookmark className="h-3 w-3" />
                  WalkThru Picker
                </a>
                <span className="text-xs text-muted-foreground">← Drag to bookmarks bar</span>
              </div>
            </div>

            {/* Option B: Console paste */}
            <div className="pl-8 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Option B: Paste in browser console</p>
              <Button variant="outline" size="sm" onClick={handleCopyScript}>
                {copied ? (
                  <><Check className="mr-1.5 h-3 w-3 text-success" />Copied!</>
                ) : (
                  <><Terminal className="mr-1.5 h-3 w-3" />Copy Picker Script</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">F12</kbd> → Console tab → paste & Enter
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">3</span>
              <span className="text-sm font-medium">Click any element</span>
            </div>
            <p className="text-xs text-muted-foreground pl-8">
              Hover over elements to highlight them, then click to capture the selector. 
              It's automatically copied to your clipboard — paste it into the CSS Selector field.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>💡 Tip:</strong> This works behind login screens! Just log into your app first, 
              then run the picker on the authenticated page.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ElementPickerDialog;
