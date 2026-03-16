import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, GripVertical, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/services/backend";
import type { Tour, ChecklistItem } from "@/types/tour";
import { useToast } from "@/hooks/use-toast";

const ChecklistEditor = () => {
  const { appId, checklistId } = useParams<{ appId: string; checklistId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<(ChecklistItem & { tour_name?: string })[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!appId || !checklistId) return;
    const load = async () => {
      const [checklistRes, toursRes, itemsRes] = await Promise.all([
        supabase.from("checklists").select("*").eq("id", checklistId).single(),
        supabase.from("tours").select("*").eq("app_id", appId).order("name"),
        supabase.from("checklist_items").select("*").eq("checklist_id", checklistId).order("sort_order"),
      ]);
      if (checklistRes.data) {
        setName(checklistRes.data.name);
        setDescription(checklistRes.data.description || "");
        setIsActive(checklistRes.data.is_active ?? true);
      }
      setTours(toursRes.data || []);

      // Enrich items with tour names
      const enriched = (itemsRes.data || []).map((item) => {
        const tour = toursRes.data?.find((t) => t.id === item.tour_id);
        return { ...item, tour_name: tour?.name || "Unknown process" };
      });
      setItems(enriched);
      setLoading(false);
    };
    load();
  }, [appId, checklistId]);

  const saveChecklist = async () => {
    if (!checklistId) return;
    setSaving(true);
    await supabase.from("checklists").update({ name, description, is_active: isActive }).eq("id", checklistId);
    setSaving(false);
    toast({ title: "Saved", description: "Checklist updated successfully." });
  };

  const addItem = async (tourId: string) => {
    if (!checklistId) return;
    if (items.some((i) => i.tour_id === tourId)) {
      toast({ title: "Already added", description: "This process is already in the checklist.", variant: "destructive" });
      return;
    }
    const sortOrder = items.length;
    const { data, error } = await supabase
      .from("checklist_items")
      .insert({ checklist_id: checklistId, tour_id: tourId, sort_order: sortOrder })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    if (data) {
      const tour = tours.find((t) => t.id === tourId);
      setItems((prev) => [...prev, { ...data, tour_name: tour?.name || "Unknown" }]);
    }
  };

  const removeItem = async (id: string) => {
    await supabase.from("checklist_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const toggleRequired = async (id: string, isRequired: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_required: isRequired } : i)));
    await supabase.from("checklist_items").update({ is_required: isRequired }).eq("id", id);
  };

  const availableTours = tours.filter((t) => !items.some((i) => i.tour_id === t.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/app/${appId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold">Edit Checklist</h1>
            <p className="text-xs text-muted-foreground">{name}</p>
          </div>
          <Button onClick={saveChecklist} disabled={saving} size="sm">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      <main className="container py-8 max-w-3xl">
        <div className="space-y-8 animate-fade-in">
          {/* Checklist settings */}
          <Card className="p-6 space-y-5">
            <h2 className="text-lg font-semibold">Checklist Settings</h2>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Onboarding checklist" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Complete these steps to get started..." rows={2} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Include in embed widget</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </Card>

          {/* Checklist items */}
          <Card className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Processes ({items.length})</h2>
              {availableTours.length > 0 && (
                <Select onValueChange={addItem}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Add a process..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTours.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No processes added yet</p>
                <p className="text-xs mt-1">Use the dropdown above to add business processes to this checklist.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {i + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.tour_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.is_required ? "Required" : "Optional"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => toggleRequired(item.id, !item.is_required)}
                      >
                        {item.is_required ? "Make optional" : "Make required"}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Preview */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Preview</h2>
            <p className="text-xs text-muted-foreground">This is how the checklist will appear to users.</p>
            <div className="bg-muted/30 rounded-xl p-5 border max-w-sm mx-auto">
              <h3 className="text-sm font-semibold mb-1">{name || "Checklist"}</h3>
              {description && <p className="text-xs text-muted-foreground mb-3">{description}</p>}
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-2.5">
                    <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    <span className="text-sm">{item.tour_name}</span>
                    {!item.is_required && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Optional</span>
                    )}
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No items yet</p>
                )}
              </div>
              <div className="mt-4 pt-3 border-t">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>0 of {items.filter((i) => i.is_required).length} completed</span>
                  <span>0%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "0%" }} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ChecklistEditor;
