import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Eye, CheckCircle2, LogOut, TrendingUp, BarChart3, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { appsApi } from "@/api/apps";
import { toursApi } from "@/api/tours";
import { analyticsApi, type TourEvent } from "@/api/analytics";
import { feedbackApi, type TourFeedback } from "@/api/feedback";
import type { Tour } from "@/types/tour";

interface TourStats {
  tourId: string;
  tourName: string;
  totalStarts: number;
  totalCompletions: number;
  totalAbandons: number;
  completionRate: number;
  stepDropOff: { stepIndex: number; views: number }[];
  uniqueSessions: number;
}

interface DailyCount {
  date: string;
  starts: number;
  completions: number;
}

const AnalyticsDashboard = () => {
  const { appId } = useParams<{ appId: string }>();
  const [appName, setAppName] = useState("");
  const [stats, setStats] = useState<TourStats[]>([]);
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([]);
  const [feedback, setFeedback] = useState<TourFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);

  useEffect(() => {
    if (!appId) return;
    const load = async () => {
      const [appRes, toursRes, eventsRes, feedbackRes] = await Promise.all([
        appsApi.get(appId),
        toursApi.list(appId),
        analyticsApi.getEvents(appId),
        feedbackApi.list(appId),
      ]);

      setFeedback(feedbackRes.data || []);

      setAppName(appRes.data?.name || "");
      const tours: Tour[] = toursRes.data || [];
      const events: TourEvent[] = eventsRes.data || [];

      const tourStats: TourStats[] = tours.map((tour) => {
        const tourEvents = events.filter((e) => e.tour_id === tour.id);
        const starts = tourEvents.filter((e) => e.event_type === "tour_started").length;
        const completions = tourEvents.filter((e) => e.event_type === "tour_completed").length;
        const abandons = tourEvents.filter((e) => e.event_type === "tour_abandoned").length;
        const sessions = new Set(tourEvents.map((e) => e.session_id)).size;

        const stepViews = tourEvents.filter((e) => e.event_type === "step_viewed");
        const stepMap: Record<number, number> = {};
        stepViews.forEach((e) => {
          if (e.step_index !== null) {
            stepMap[e.step_index] = (stepMap[e.step_index] || 0) + 1;
          }
        });
        const stepDropOff = Object.entries(stepMap)
          .map(([idx, views]) => ({ stepIndex: Number(idx), views }))
          .sort((a, b) => a.stepIndex - b.stepIndex);

        return {
          tourId: tour.id,
          tourName: tour.name,
          totalStarts: starts,
          totalCompletions: completions,
          totalAbandons: abandons,
          completionRate: starts > 0 ? Math.round((completions / starts) * 100) : 0,
          stepDropOff,
          uniqueSessions: sessions,
        };
      });

      setStats(tourStats);
      if (tourStats.length > 0) setSelectedTourId(tourStats[0].tourId);

      const last30Days: DailyCount[] = [];
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayEvents = events.filter((e) => e.created_at.startsWith(dateStr));
        last30Days.push({
          date: dateStr,
          starts: dayEvents.filter((e) => e.event_type === "tour_started").length,
          completions: dayEvents.filter((e) => e.event_type === "tour_completed").length,
        });
      }
      setDailyCounts(last30Days);
      setLoading(false);
    };
    load();
  }, [appId]);

  const selectedStats = stats.find((s) => s.tourId === selectedTourId);
  const totals = stats.reduce(
    (acc, s) => ({
      starts: acc.starts + s.totalStarts,
      completions: acc.completions + s.totalCompletions,
      abandons: acc.abandons + s.totalAbandons,
      sessions: acc.sessions + s.uniqueSessions,
    }),
    { starts: 0, completions: 0, abandons: 0, sessions: 0 }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const maxStepViews = selectedStats
    ? Math.max(...selectedStats.stepDropOff.map((s) => s.views), 1)
    : 1;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/app/${appId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-sm font-semibold">Analytics</h1>
            <p className="text-xs text-muted-foreground">{appName}</p>
          </div>
        </div>
      </header>

      <main className="container py-8 px-4 max-w-5xl">
        <div className="space-y-8 animate-fade-in">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="h-4 w-4 text-accent" />
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Starts</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold">{totals.starts}</p>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Completions</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold">{totals.completions}</p>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-1">
                <LogOut className="h-4 w-4 text-warning" />
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Abandoned</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold">{totals.abandons}</p>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Completion</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold">
                {totals.starts > 0 ? Math.round((totals.completions / totals.starts) * 100) : 0}%
              </p>
            </Card>
          </div>

          {/* Daily activity chart */}
          <Card className="p-4 sm:p-6">
            <h2 className="text-sm font-semibold mb-4">Activity (Last 30 Days)</h2>
            {dailyCounts.some((d) => d.starts > 0 || d.completions > 0) ? (
              <div className="h-32 sm:h-40 flex items-end gap-[2px]">
                {dailyCounts.map((day, i) => {
                  const maxVal = Math.max(...dailyCounts.map((d) => d.starts + d.completions), 1);
                  const height = ((day.starts + day.completions) / maxVal) * 100;
                  const compHeight = day.starts > 0 ? (day.completions / (day.starts + day.completions)) * height : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end group relative" title={`${day.date}: ${day.starts} starts, ${day.completions} completions`}>
                      <div className="rounded-t-sm bg-primary/30" style={{ height: `${height}%`, minHeight: height > 0 ? 2 : 0 }}>
                        <div className="rounded-t-sm bg-primary" style={{ height: `${compHeight}%`, minHeight: compHeight > 0 ? 2 : 0 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 sm:h-40 flex items-center justify-center text-muted-foreground text-sm">
                No activity yet. Events will appear here once users interact with your processes.
              </div>
            )}
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
              <span>{dailyCounts[0]?.date}</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary inline-block" /> Completions</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary/30 inline-block" /> Starts</span>
              </div>
              <span>{dailyCounts[dailyCounts.length - 1]?.date}</span>
            </div>
          </Card>

          {/* Per-tour breakdown */}
          <div>
            <h2 className="text-sm font-semibold mb-4">Per-Process Analytics</h2>

            {stats.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No processes yet</p>
                <p className="text-xs mt-1">Create business processes to start tracking analytics.</p>
              </Card>
            ) : (
              <div className="flex flex-col md:flex-row gap-6">
                {/* Tour list */}
                <div className="flex md:flex-col gap-2 md:w-56 overflow-x-auto md:overflow-x-visible shrink-0">
                  {stats.map((s) => (
                    <button
                      key={s.tourId}
                      onClick={() => setSelectedTourId(s.tourId)}
                      className={`text-left p-3 rounded-lg transition-colors shrink-0 md:w-full ${
                        selectedTourId === s.tourId ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent"
                      }`}
                    >
                      <p className="text-sm font-medium truncate">{s.tourName}</p>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {s.totalStarts} starts · {s.completionRate}% completion
                      </p>
                    </button>
                  ))}
                </div>

                {/* Tour detail */}
                {selectedStats && (
                  <Card className="flex-1 p-4 sm:p-6 animate-fade-in">
                    <h3 className="font-semibold mb-4">{selectedStats.tourName}</h3>

                    <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                      <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/50">
                        <p className="text-xl sm:text-2xl font-bold">{selectedStats.totalStarts}</p>
                        <p className="text-xs text-muted-foreground">Starts</p>
                      </div>
                      <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/50">
                        <p className="text-xl sm:text-2xl font-bold">{selectedStats.totalCompletions}</p>
                        <p className="text-xs text-muted-foreground">Completions</p>
                      </div>
                      <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/50">
                        <p className="text-xl sm:text-2xl font-bold text-primary">{selectedStats.completionRate}%</p>
                        <p className="text-xs text-muted-foreground">Rate</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-3">Step-by-Step Drop-off</h4>
                      {selectedStats.stepDropOff.length > 0 ? (
                        <div className="space-y-2">
                          {selectedStats.stepDropOff.map((step) => (
                            <div key={step.stepIndex} className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground w-14 shrink-0">
                                Step {step.stepIndex + 1}
                              </span>
                              <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                                <div
                                  className="h-full bg-primary/70 rounded-md transition-all"
                                  style={{ width: `${(step.views / maxStepViews) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium w-10 text-right">{step.views}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No step data yet.</p>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                      {selectedStats.uniqueSessions} unique session{selectedStats.uniqueSessions !== 1 ? "s" : ""}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
          {/* Feedback Section */}
          <div>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              User Feedback
            </h2>
            {feedback.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <ThumbsUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No feedback yet</p>
                <p className="text-xs mt-1">Feedback will appear here after users complete walkthroughs.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Feedback summary */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold">{feedback.length}</p>
                    <p className="text-xs text-muted-foreground">Total Responses</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ThumbsUp className="h-4 w-4 text-success" />
                      <p className="text-2xl font-bold text-success">
                        {feedback.filter(f => f.rating === 'up').length}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Helpful</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ThumbsDown className="h-4 w-4 text-destructive" />
                      <p className="text-2xl font-bold text-destructive">
                        {feedback.filter(f => f.rating === 'down').length}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Not Helpful</p>
                  </Card>
                </div>

                {/* Per-tour feedback breakdown */}
                {stats.map(s => {
                  const tourFb = feedback.filter(f => f.tour_id === s.tourId);
                  if (tourFb.length === 0) return null;
                  const upCount = tourFb.filter(f => f.rating === 'up').length;
                  const pct = Math.round((upCount / tourFb.length) * 100);
                  return (
                    <Card key={s.tourId} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">{s.tourName}</p>
                        <span className="text-xs text-muted-foreground">{tourFb.length} responses · {pct}% positive</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      {/* Show comments */}
                      {tourFb.filter(f => f.comment).length > 0 && (
                        <div className="space-y-2 mt-2 border-t pt-2">
                          {tourFb.filter(f => f.comment).slice(0, 5).map(f => (
                            <div key={f.id} className="flex items-start gap-2 text-xs">
                              {f.rating === 'up' ? (
                                <ThumbsUp className="h-3 w-3 text-success mt-0.5 shrink-0" />
                              ) : (
                                <ThumbsDown className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                              )}
                              <div>
                                <p className="text-foreground">{f.comment}</p>
                                <p className="text-muted-foreground mt-0.5">{new Date(f.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AnalyticsDashboard;
