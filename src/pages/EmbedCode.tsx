import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getApp, generateEmbedScript } from "@/lib/tour-store";

const EmbedCode = () => {
  const { appId, tourId } = useParams<{ appId: string; tourId: string }>();
  const app = getApp(appId || "");
  const tour = app?.tours.find((t) => t.id === tourId);
  const [copied, setCopied] = useState(false);

  if (!app || !tour) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Tour not found</h2>
          <Button variant="ghost" asChild>
            <Link to="/">Go back</Link>
          </Button>
        </div>
      </div>
    );
  }

  const script = generateEmbedScript(appId!, tourId!);

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/app/${appId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-sm font-semibold">Embed Code</h1>
            <p className="text-xs text-muted-foreground">
              {tour.name} · {app.name}
            </p>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-3xl">
        <div className="animate-fade-in">
          <h2 className="text-xl font-semibold mb-2">Embed your tour</h2>
          <p className="text-muted-foreground mb-6">
            Copy the script below and paste it into your application's HTML, just
            before the closing <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code> tag.
          </p>

          <Card className="relative">
            <div className="absolute top-3 right-3">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="mr-1 h-3 w-3 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <pre className="p-5 overflow-x-auto text-xs font-mono leading-relaxed text-foreground/80">
              {script}
            </pre>
          </Card>

          {tour.steps.length === 0 && (
            <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-warning font-medium">
                ⚠ This tour has no steps yet. Add steps in the editor before embedding.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EmbedCode;
