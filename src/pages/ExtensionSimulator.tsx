import { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Play, CheckCircle, AlertTriangle, XCircle, Wrench,
  Clock, Loader2, ChevronDown, ChevronRight, Shield, Code,
  Monitor, Paintbrush, Zap, MousePointer, Route, Globe, Info
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

const categoryIcons: Record<string, typeof Shield> = {
  "Metadata": Info,
  "Data Loading": Globe,
  "Code Syntax": Code,
  "Sandbox Runtime": Monitor,
  "JS Runtime": Zap,
  "Runtime Initialization": Monitor,
  "UI Rendering": Paintbrush,
  "CSS Rendering": Paintbrush,
  "Timing & Async": Clock,
  "Tour Flow": Route,
  "Tour Execution": Route,
  "Flow Logic": Route,
  "Selector Resolution": MousePointer,
  "Tooltip Rendering": Paintbrush,
  "Step Navigation": Route,
  "Page Navigation": Globe,
  "Live Selector Validation": Globe,
  "Launchers": Zap,
  "User Interactions": MousePointer,
  "Generated Code": Code,
};

const categoryOrder = [
  "Metadata", "Data Loading", "Code Syntax",
  "JS Runtime", "Runtime Initialization", "Sandbox Runtime",
  "UI Rendering", "CSS Rendering", "Timing & Async",
  "Tour Flow", "Tour Execution", "Flow Logic",
  "Selector Resolution", "Tooltip Rendering", "Step Navigation", "Page Navigation",
  "Live Selector Validation", "Launchers", "User Interactions", "Generated Code",
];

const ExtensionSimulator = () => {
  const { appId } = useParams<{ appId: string }>();
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [liveResults, setLiveResults] = useState<TestResult[]>([]);
  const [report, setReport] = useState<SimulationReport | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  const handleRun = useCallback(async () => {
    if (!appId) return;
    setRunning(true);
    setReport(null);
    setLiveResults([]);
    setPhase("Starting…");
    setProgress(0);
    setExpandedCategories(new Set());
    setExpandedDetails(new Set());

    try {
      const result = await runExtensionSimulation(appId, (results, currentPhase, pct) => {
        setLiveResults([...results]);
        setPhase(currentPhase);
        setProgress(pct);
      });
      setReport(result);
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
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const toggleDetail = (id: string) => {
    setExpandedDetails(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const displayResults = report?.results || liveResults;
  const grouped = displayResults.reduce<Record<string, TestResult[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const ai = categoryOrder.indexOf(a);
    const bi = categoryOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const overallStatus = report
    ? report.summary.errors === 0
      ? report.summary.warnings === 0
        ? "all-clear"
        : "warnings"
      : "errors"
    : null;

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
            <p className="text-xs text-muted-foreground">Full runtime validation before deployment</p>
          </div>
          <Button onClick={handleRun} disabled={running} size="sm">
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {running ? "Simulating…" : "Run Full Simulation"}
          </Button>
        </div>
      </header>

      <main className="container py-8 px-4 max-w-4xl">
        {/* Progress */}
        {(running || report) && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">{phase}</span>
              <span className="font-mono text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Overall status banner */}
        {report && overallStatus && (
          <Card className={`p-4 mb-6 border-l-4 ${
            overallStatus === "all-clear" ? "border-l-green-500 bg-green-500/5" :
            overallStatus === "warnings" ? "border-l-yellow-500 bg-yellow-500/5" :
            "border-l-destructive bg-destructive/5"
          }`}>
            <div className="flex items-center gap-3">
              {overallStatus === "all-clear" && <CheckCircle className="h-6 w-6 text-green-500" />}
              {overallStatus === "warnings" && <AlertTriangle className="h-6 w-6 text-yellow-500" />}
              {overallStatus === "errors" && <XCircle className="h-6 w-6 text-destructive" />}
              <div>
                <p className="font-semibold">
                  {overallStatus === "all-clear" && "All tests passed — Ready to deploy"}
                  {overallStatus === "warnings" && "Passed with warnings — Review recommended"}
                  {overallStatus === "errors" && `${report.summary.errors} error(s) detected — Fix before deploying`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {report.summary.totalTests} tests · {report.summary.toursTestedCount} tours · {report.summary.stepsExecutedCount} steps · {(report.duration / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Summary cards */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            <SummaryCard label="Total Tests" value={report.summary.totalTests} />
            <SummaryCard label="Passed" value={report.summary.passed} variant="pass" />
            <SummaryCard label="Warnings" value={report.summary.warnings} variant="warning" />
            <SummaryCard label="Errors" value={report.summary.errors} variant="error" />
            <SummaryCard label="Auto-fixed" value={report.summary.fixed} variant="fixed" />
          </div>
        )}

        {/* Results by category */}
        {sortedCategories.length > 0 && (
          <div className="space-y-2">
            {sortedCategories.map(category => {
              const items = grouped[category];
              const errors = items.filter(r => r.status === "error").length;
              const warnings = items.filter(r => r.status === "warning").length;
              const fixed = items.filter(r => r.status === "fixed").length;
              const allPassed = errors === 0 && warnings === 0;
              const isExpanded = expandedCategories.has(category);
              const CategoryIcon = categoryIcons[category] || Shield;

              return (
                <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                  <CollapsibleTrigger asChild>
                    <Card className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        }
                        <CategoryIcon className="h-4 w-4 text-muted-foreground shrink-0" />
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
                    <div className="ml-4 mt-1 space-y-0.5">
                      {items.map(r => {
                        const cfg = statusConfig[r.status];
                        const Icon = cfg.icon;
                        const hasDetails = !!r.details;
                        const detailExpanded = expandedDetails.has(r.id);

                        return (
                          <div key={r.id} className="py-1.5 px-3 text-sm rounded-md hover:bg-muted/30">
                            <div
                              className={`flex items-start gap-2 ${hasDetails ? "cursor-pointer" : ""}`}
                              onClick={() => hasDetails && toggleDetail(r.id)}
                            >
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
                                {hasDetails && detailExpanded && (
                                  <pre className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground overflow-auto max-h-32 whitespace-pre-wrap">
                                    {r.details}
                                  </pre>
                                )}
                              </div>
                              {hasDetails && (
                                <ChevronDown className={`h-3 w-3 text-muted-foreground shrink-0 mt-1 transition-transform ${detailExpanded ? "" : "-rotate-90"}`} />
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
            <p className="text-muted-foreground max-w-lg mb-4">
              Runs a full browser-like simulation of your WalkThru extension, including JavaScript execution,
              CSS rendering, tooltip positioning, step navigation, and selector validation — all before you download.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><Code className="h-3.5 w-3.5" />JS Syntax</div>
              <div className="flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" />Sandbox Runtime</div>
              <div className="flex items-center gap-1.5"><Paintbrush className="h-3.5 w-3.5" />CSS & UI</div>
              <div className="flex items-center gap-1.5"><Route className="h-3.5 w-3.5" />Flow Logic</div>
              <div className="flex items-center gap-1.5"><MousePointer className="h-3.5 w-3.5" />Selectors</div>
              <div className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Live Validation</div>
              <div className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Interactions</div>
              <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Timing</div>
            </div>
            <Button onClick={handleRun} size="lg">
              <Play className="mr-2 h-5 w-5" />Run Full Simulation
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
