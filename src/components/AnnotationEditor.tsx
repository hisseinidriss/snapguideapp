import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Image as KImage, Rect, Arrow, Text, Transformer, Group } from "react-konva";
import Konva from "konva";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MousePointer2, ArrowUpRight, Square, Droplet, Type, Undo2, Trash2, Loader2,
} from "lucide-react";
import { http, buildApiUrl } from "@/api/http";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Tool = "select" | "arrow" | "rect" | "blur" | "text";

interface BaseShape {
  id: string;
  type: Tool;
  color: string;
}
interface ArrowShape extends BaseShape { type: "arrow"; points: number[]; }
interface RectShape extends BaseShape { type: "rect"; x: number; y: number; width: number; height: number; }
interface BlurShape extends BaseShape { type: "blur"; x: number; y: number; width: number; height: number; }
interface TextShape extends BaseShape {
  type: "text"; x: number; y: number; text: string; fontSize: number; width: number;
}
type Shape = ArrowShape | RectShape | BlurShape | TextShape;

const COLORS = ["#ef4444", "#f59e0b", "#1a6b3c", "#3b82f6", "#ffffff", "#000000"];
const MAX_W = 1100;
const MAX_H = 700;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  imageUrl: string;
  recordingId: string;
  stepNumber: number;
  onSaved: (newUrl: string) => void;
}

export default function AnnotationEditor({
  open, onOpenChange, imageUrl, recordingId, stepNumber, onSaved,
}: Props) {
  const { toast } = useToast();
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("arrow");
  const [color, setColor] = useState<string>(COLORS[0]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<Shape | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef<Record<string, Konva.Node>>({});
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !imageUrl) return;

    let cancelled = false;
    const controller = new AbortController();

    setLoadedImage(null);
    setImageError(null);

    const load = async () => {
      try {
        const proxyUrl = buildApiUrl(`/screenshot-file?url=${encodeURIComponent(imageUrl)}`);
        const res = await fetch(proxyUrl, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Failed to load screenshot (${res.status})`);
        }

        const blob = await res.blob();
        if (!blob.size) throw new Error("Screenshot file is empty");

        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;

        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (cancelled) return;
          setLoadedImage(img);
          setImageError(null);
        };
        img.onerror = () => {
          if (cancelled) return;
          setImageError("Failed to decode screenshot");
          setLoadedImage(null);
        };
        img.src = objectUrl;
      } catch (err: any) {
        if (cancelled || err?.name === "AbortError") return;
        setImageError(err?.message || "Failed to load screenshot");
        setLoadedImage(null);
      }
    };

    load();

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [open, imageUrl]);

  // Reset on open / image change
  useEffect(() => {
    if (open) {
      setShapes([]);
      setSelectedId(null);
      setDrawing(null);
      setEditingTextId(null);
      setTool("arrow");
      setColor(COLORS[0]);
    }
  }, [open, imageUrl]);

  // Compute fitted stage dimensions
  const { stageW, stageH, scale } = useMemo(() => {
    if (!loadedImage) return { stageW: MAX_W, stageH: MAX_H, scale: 1 };
    const s = Math.min(MAX_W / loadedImage.width, MAX_H / loadedImage.height, 1);
    return {
      stageW: Math.round(loadedImage.width * s),
      stageH: Math.round(loadedImage.height * s),
      scale: s,
    };
  }, [loadedImage]);

  // Attach transformer to selected
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    if (selectedId && shapeRefs.current[selectedId]) {
      tr.nodes([shapeRefs.current[selectedId]]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, shapes]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (editingTextId) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        setShapes(prev => prev.filter(s => s.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, selectedId, editingTextId]);

  const undo = () => setShapes(prev => prev.slice(0, -1));
  const clearAll = () => { setShapes([]); setSelectedId(null); };

  const newId = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (editingTextId) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (tool === "select") {
      if (e.target === stage || e.target.attrs.id === "bg-image") setSelectedId(null);
      return;
    }

    const id = newId();
    if (tool === "arrow") {
      setDrawing({ id, type: "arrow", color, points: [pos.x, pos.y, pos.x, pos.y] });
    } else if (tool === "rect") {
      setDrawing({ id, type: "rect", color, x: pos.x, y: pos.y, width: 0, height: 0 });
    } else if (tool === "blur") {
      setDrawing({ id, type: "blur", color, x: pos.x, y: pos.y, width: 0, height: 0 });
    } else if (tool === "text") {
      const newShape: TextShape = {
        id, type: "text", color, x: pos.x, y: pos.y,
        text: "Type here", fontSize: 20, width: 200,
      };
      setShapes(prev => [...prev, newShape]);
      setSelectedId(id);
      setEditingTextId(id);
      setTool("select");
    }
  };

  const onMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!drawing) return;
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    if (drawing.type === "arrow") {
      setDrawing({ ...drawing, points: [drawing.points[0], drawing.points[1], pos.x, pos.y] });
    } else if (drawing.type === "rect" || drawing.type === "blur") {
      setDrawing({ ...drawing, width: pos.x - drawing.x, height: pos.y - drawing.y });
    }
  };

  const onMouseUp = () => {
    if (!drawing) return;
    let toCommit = drawing;
    if (drawing.type === "rect" || drawing.type === "blur") {
      const x = drawing.width < 0 ? drawing.x + drawing.width : drawing.x;
      const y = drawing.height < 0 ? drawing.y + drawing.height : drawing.y;
      const w = Math.abs(drawing.width);
      const h = Math.abs(drawing.height);
      if (w < 4 || h < 4) { setDrawing(null); return; }
      toCommit = { ...drawing, x, y, width: w, height: h };
    }
    if (drawing.type === "arrow") {
      const [x1, y1, x2, y2] = drawing.points;
      if (Math.hypot(x2 - x1, y2 - y1) < 6) { setDrawing(null); return; }
    }
    setShapes(prev => [...prev, toCommit]);
    setDrawing(null);
  };

  const updateShape = (id: string, patch: Partial<Shape>) => {
    setShapes(prev => prev.map(s => (s.id === id ? { ...s, ...patch } as Shape : s)));
  };

  const handleSave = async () => {
    const stage = stageRef.current;
    if (!stage || !loadedImage) return;
    setSaving(true);
    setSelectedId(null);
    await new Promise(r => setTimeout(r, 50));

    try {
      const pixelRatio = 1 / scale;
      const dataUrl = stage.toDataURL({ pixelRatio, mimeType: "image/png" });
      const { data, error } = await http.post<{ screenshot_url: string }>(
        "/upload-screenshot",
        { recording_id: recordingId, step_number: stepNumber, image: dataUrl }
      );
      if (error || !data) throw new Error(error?.message || "Upload failed");
      onSaved(data.screenshot_url);
      toast({ title: "Annotations saved" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const editingTextShape = shapes.find(s => s.id === editingTextId && s.type === "text") as TextShape | undefined;

  const tools: { id: Tool; icon: any; label: string }[] = [
    { id: "select", icon: MousePointer2, label: "Select" },
    { id: "arrow", icon: ArrowUpRight, label: "Arrow" },
    { id: "rect", icon: Square, label: "Rectangle" },
    { id: "blur", icon: Droplet, label: "Blur" },
    { id: "text", icon: Type, label: "Text" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1180px] w-[95vw] max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Annotate screenshot</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 border rounded-lg p-2 bg-muted/30">
          <div className="flex items-center gap-1">
            {tools.map(t => (
              <Button
                key={t.id}
                type="button"
                variant={tool === t.id ? "default" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => { setTool(t.id); setSelectedId(null); }}
                title={t.label}
              >
                <t.icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
          <div className="h-6 w-px bg-border mx-1" />
          <div className="flex items-center gap-1.5">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  if (selectedId) updateShape(selectedId, { color: c } as any);
                }}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-transform",
                  color === c ? "border-foreground scale-110" : "border-border"
                )}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          <div className="h-6 w-px bg-border mx-1" />
          <Button type="button" variant="ghost" size="sm" className="h-8" onClick={undo} title="Undo (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive" onClick={clearAll} title="Clear all">
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="ml-auto text-xs text-muted-foreground hidden md:block">
            {tool === "text" ? "Click to add text" : tool === "select" ? "Click a shape to edit" : "Click and drag to draw"}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-muted/20 rounded-lg p-2 flex items-center justify-center">
          {!loadedImage && !imageError ? (
            <div className="flex items-center gap-2 text-muted-foreground py-20">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading image…
            </div>
          ) : imageError ? (
            <div className="flex flex-col items-center gap-3 text-center text-muted-foreground py-20 px-6">
              <p>{imageError}</p>
              <Button type="button" variant="outline" onClick={() => window.open(imageUrl, "_blank", "noopener,noreferrer")}>
                Open original image
              </Button>
            </div>
          ) : (
            <div className="relative" style={{ width: stageW, height: stageH }}>
              <Stage
                ref={stageRef}
                width={stageW}
                height={stageH}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onTouchStart={onMouseDown as any}
                onTouchMove={onMouseMove as any}
                onTouchEnd={onMouseUp}
                style={{ cursor: tool === "select" ? "default" : "crosshair" }}
              >
                <Layer listening={true}>
                  <KImage
                    id="bg-image"
                    image={loadedImage}
                    width={stageW}
                    height={stageH}
                    onClick={() => setSelectedId(null)}
                  />
                </Layer>

                <Layer listening={false}>
                  {shapes.filter(s => s.type === "blur").map(s => {
                    const b = s as BlurShape;
                    return (
                      <Group
                        key={`blur-${b.id}`}
                        clipX={b.x}
                        clipY={b.y}
                        clipWidth={b.width}
                        clipHeight={b.height}
                      >
                        <KImage
                          image={loadedImage}
                          width={stageW}
                          height={stageH}
                          filters={[Konva.Filters.Blur]}
                          blurRadius={18}
                          ref={(node) => {
                            if (node) node.cache();
                          }}
                        />
                      </Group>
                    );
                  })}
                </Layer>

                <Layer>
                  {shapes.map(s => {
                    const common = {
                      id: s.id,
                      ref: (n: Konva.Node | null) => {
                        if (n) shapeRefs.current[s.id] = n;
                        else delete shapeRefs.current[s.id];
                      },
                      onClick: () => { setTool("select"); setSelectedId(s.id); },
                      onTap: () => { setTool("select"); setSelectedId(s.id); },
                      draggable: true,
                      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
                        updateShape(s.id, { x: e.target.x(), y: e.target.y() } as any);
                      },
                    };
                    if (s.type === "arrow") {
                      return (
                        <Arrow
                          key={s.id}
                          {...common}
                          points={s.points}
                          stroke={s.color}
                          fill={s.color}
                          strokeWidth={4}
                          pointerLength={14}
                          pointerWidth={14}
                          lineCap="round"
                          lineJoin="round"
                        />
                      );
                    }
                    if (s.type === "rect") {
                      return (
                        <Rect
                          key={s.id}
                          {...common}
                          x={s.x}
                          y={s.y}
                          width={s.width}
                          height={s.height}
                          stroke={s.color}
                          strokeWidth={4}
                          cornerRadius={4}
                          onTransformEnd={(e) => {
                            const node = e.target as Konva.Rect;
                            const sx = node.scaleX();
                            const sy = node.scaleY();
                            node.scaleX(1);
                            node.scaleY(1);
                            updateShape(s.id, {
                              x: node.x(),
                              y: node.y(),
                              width: Math.max(5, node.width() * sx),
                              height: Math.max(5, node.height() * sy),
                            } as any);
                          }}
                        />
                      );
                    }
                    if (s.type === "blur") {
                      return (
                        <Rect
                          key={s.id}
                          {...common}
                          x={s.x}
                          y={s.y}
                          width={s.width}
                          height={s.height}
                          stroke={selectedId === s.id ? s.color : "rgba(0,0,0,0.35)"}
                          dash={[6, 4]}
                          strokeWidth={2}
                          fill="rgba(0,0,0,0.001)"
                          onTransformEnd={(e) => {
                            const node = e.target as Konva.Rect;
                            const sx = node.scaleX();
                            const sy = node.scaleY();
                            node.scaleX(1);
                            node.scaleY(1);
                            updateShape(s.id, {
                              x: node.x(),
                              y: node.y(),
                              width: Math.max(5, node.width() * sx),
                              height: Math.max(5, node.height() * sy),
                            } as any);
                          }}
                        />
                      );
                    }
                    if (s.type === "text") {
                      return (
                        <Text
                          key={s.id}
                          {...common}
                          x={s.x}
                          y={s.y}
                          text={s.text}
                          fontSize={s.fontSize}
                          fontStyle="600"
                          fill={s.color}
                          width={s.width}
                          padding={6}
                          onDblClick={() => { setSelectedId(s.id); setEditingTextId(s.id); }}
                          onDblTap={() => { setSelectedId(s.id); setEditingTextId(s.id); }}
                        />
                      );
                    }
                    return null;
                  })}

                  {drawing?.type === "arrow" && (
                    <Arrow
                      points={drawing.points}
                      stroke={drawing.color}
                      fill={drawing.color}
                      strokeWidth={4}
                      pointerLength={14}
                      pointerWidth={14}
                    />
                  )}
                  {drawing?.type === "rect" && (
                    <Rect
                      x={drawing.x}
                      y={drawing.y}
                      width={drawing.width}
                      height={drawing.height}
                      stroke={drawing.color}
                      strokeWidth={4}
                    />
                  )}
                  {drawing?.type === "blur" && (
                    <Rect
                      x={drawing.x}
                      y={drawing.y}
                      width={drawing.width}
                      height={drawing.height}
                      stroke="hsl(var(--primary))"
                      dash={[6, 4]}
                      strokeWidth={2}
                    />
                  )}

                  <Transformer
                    ref={transformerRef}
                    rotateEnabled={false}
                    boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5 ? oldBox : newBox)}
                  />
                </Layer>
              </Stage>

              {editingTextShape && (
                <textarea
                  autoFocus
                  defaultValue={editingTextShape.text}
                  onBlur={(e) => {
                    updateShape(editingTextShape.id, { text: e.target.value || "Text" } as any);
                    setEditingTextId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { (e.target as HTMLTextAreaElement).blur(); }
                  }}
                  style={{
                    position: "absolute",
                    left: editingTextShape.x,
                    top: editingTextShape.y,
                    width: editingTextShape.width,
                    fontSize: editingTextShape.fontSize,
                    color: editingTextShape.color,
                    fontWeight: 600,
                    background: "rgba(255,255,255,0.95)",
                    border: "2px solid hsl(var(--primary))",
                    borderRadius: 4,
                    padding: 6,
                    outline: "none",
                    resize: "none",
                    fontFamily: "inherit",
                    lineHeight: 1.2,
                  }}
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !loadedImage}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save annotations"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
