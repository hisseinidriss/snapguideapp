import { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Play, CheckCircle, AlertTriangle, XCircle, Wrench,
  Clock, FileText, Loader2, ChevronDown, ChevronRight, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { runExtensionSimulation, type SimulationReport, type TestResult, type TestStatus } from "@/lib/extension-simulator";

const statusConfig: Record<TestStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "Pending" },
  running: { icon: Loader2, color: "text-primary", label: "Running" },
  pass: { icon: CheckCircle, color: "text-green-500", label: "Pass" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", label: "Warning" },
  error: { icon: XCircle, color: "text-destructive", label: "Error" },
  fixed: { icon: Wrench, color: "text-blue-500", label: "Auto-fixed" },
};

const ExtensionSimulator = () => {
  const { appId } = useParams<{ appId: string }>();
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [liveResults, setLiveResults] = useState<TestResult[]>([]);
  const [report, setReport] = useState<SimulationReport | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const handleRun = useCallback(async () => {
    if (!appId) return;
    setRunning(true);
    setReport(null);
    setLiveResults([]);
    setPhase("Starting…");
    setProgress(0);
    setExpandedCategories(new Set());

    try {
      const result = await runExtensionSimulation(appId, (results, currentPhase, pct) => {
        setLiveResults([...results]);
        setPhase(currentPhase);
        setProgress(pct);
      });
      setReport(result);
      // Auto-expand categories with issues
      const issueCategories = new Set<string>();
      result.results.forEach(r => {
        if (r.status === "error" || r.status === "warning" || r.status === "fixed") {
          issueCategories.add(r.category);
        }
      });
      setExpandedCategories(issueCategories);
    } catch (err: any) {
      console.error("Simulation error:", err);
    } finally {
      setRunning(false);
      setPhase("Complete");
      setProgress(100);
    }
  }, [appId]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Group results by category
  const displayResults = report?.results || liveResults;
  const grouped = displayResults.reduce<Record<string, TestResult[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  const categoryOrder = [
    "Metadata", "Data Loading", "Runtime", "Tour Execution", "Tour Flow",
    "Selector Resolution", "Tooltip Rendering", "Step Navigation", "Page Navigation",
    "Live Selector Validation", "Launchers", "Generated Code",
  ];

  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const ai = categoryOrder.indexOf(a);
    const bi = categoryOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/app/${appId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <Shield className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <h1 className="text-sm font-semibold">Extension Simulator</h1>
            <p className="text-xs text-muted-foreground">Validate the WalkThru extension before deployment</p>
          </div>
          <Button onClick={handleRun} disabled={running} size="sm">
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {running ? "Running…" : "Run Simulation"}
          </Button>
        </div>
      </header>

      <main className="container py-8 px-4 max-w-4xl">
        {/* Progress bar */}
        {(running || report) && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">{phase}</span>
              <span className="font-mono text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Summary cards */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            <SummaryCard label="Tests" value={report.summary.totalTests} />
            <SummaryCard label="Passed" value={report.summary.passed} variant="pass" />
            <SummaryCard label="Warnings" value={report.summary.warnings} variant="warning" />
            <SummaryCard label="Errors" value={report.summary.errors} variant="error" />
            <SummaryCard label="Auto-fixed" value={report.summary.fixed} variant="fixed" />
          </div>
        )}

        {/* Report metadata */}
        {report && (
          <Card className="p-4 mb-6">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tours tested:</span>{" "}
                <span className="font-medium">{report.summary.toursTestedCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Steps executed:</span>{" "}
                <span className="font-medium">{report.summary.stepsExecutedCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>{" "}
                <span className="font-medium">{(report.duration / 1000).toFixed(1)}s</span>
              </div>
              <div className="ml-auto">
                {report.summary.errors === 0 ? (
                  <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle className="h-3 w-3 mr-1" />Ready to Deploy
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />{report.summary.errors} Issue(s) Found
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Results by category */}
        {sortedCategories.length > 0 && (
          <div className="space-y-3">
            {sortedCategories.map(category => {
              const items = grouped[category];
              const errors = items.filter(r => r.status === "error").length;
              const warnings = items.filter(r => r.status === "warning").length;
              const fixed = items.filter(r => r.status === "fixed").length;
              const allPassed = errors === 0 && warnings === 0;
              const isExpanded = expandedCategories.has(category);

              return (
                <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                  <CollapsibleTrigger asChild>
                    <Card className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        }
                        {allPassed
                          ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                          : errors > 0
                            ? <XCircle className="h-4 w-4 text-destructive shrink-0" />
                            : <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                        }
                        <span className="font-medium text-sm flex-1">{category}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">{items.length} test{items.length !== 1 ? "s" : ""}</span>
                          {errors > 0 && <Badge variant="destructive" className="text-xs py-0 px-1.5">{errors} error{errors !== 1 ? "s" : ""}</Badge>}
                          {warnings > 0 && <Badge variant="outline" className="text-xs py-0 px-1.5 text-yellow-600 border-yellow-300">{warnings}</Badge>}
                          {fixed > 0 && <Badge variant="outline" className="text-xs py-0 px-1.5 text-blue-600 border-blue-300">{fixed} fixed</Badge>}
                        </div>
                      </div>
                    </Card>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-4 mt-1 space-y-1">
                      {items.map(r => {
                        const cfg = statusConfig[r.status];
                        const Icon = cfg.icon;
                        return (
                          <div key={r.id} className="flex items-start gap-2 py-1.5 px-3 text-sm rounded-md hover:bg-muted/30">
                            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color} ${r.status === "running" ? "animate-spin" : ""}`} />
                            <div className="flex-1 min-w-0">
                              <span className={r.status === "error" ? "text-destructive" : "text-foreground"}>
                                {r.message}
                              </span>
                              {r.fixApplied && (
                                <div className="flex items-center gap-1 text-xs text-blue-600 mt-0.5">
                                  <Wrench className="h-3 w-3" />
                                  {r.fixApplied}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!running && !report && (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Extension Simulator</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Run a full simulation of your WalkThru extension to validate selectors, tour flow, and
              generated code before downloading. No installation required.
            </p>
            <Button onClick={handleRun} size="lg">
              <Play className="mr-2 h-5 w-5" />Run Simulation
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

function SummaryCard({ label, value, variant }: { label: string; value: number; variant?: string }) {
  const colors: Record<string, string> = {
    pass: "text-green-600",
    warning: "text-yellow-600",
    error: "text-destructive",
    fixed: "text-blue-600",
  };
  return (
    <Card className="p-3 text-center">
      <div className={`text-2xl font-bold ${variant ? colors[variant] || "" : ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

export default ExtensionSimulator;
