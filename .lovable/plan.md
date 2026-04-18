

## Screenshot Annotation Editor

In-app editor that lets users draw **arrows, rectangles, blur regions, and text callouts** directly on captured screenshots. Edits are flattened into a new PNG and replace the screenshot in storage.

### Approach

Build a canvas-based annotation modal opened from each step in `ScribeRecording.tsx`. Use `react-konva` (Konva.js + React bindings) for fast, layered drawing on top of the screenshot. On save, export the stage to a PNG, upload to the existing `recording-screenshots` bucket (overwriting the step's image), and refresh the step.

### Architecture

```
[Step card] → "Annotate" button
        ↓
<AnnotationEditor> modal
  • <Stage> with image as base layer
  • Toolbar: Select | Arrow | Rect | Blur | Text | Color | Undo | Clear
  • <Layer> of shapes (Konva nodes, draggable, transformable)
        ↓ Save
  stage.toDataURL()
        ↓
  Upload PNG → recording-screenshots/<recId>/step-<n>.png  (upsert)
        ↓
  Update step row with cache-busted URL → re-render
```

### Implementation

**1. Install dependencies**
- `konva` + `react-konva`

**2. New component: `src/components/AnnotationEditor.tsx`**
- Props: `open`, `onOpenChange`, `imageUrl`, `recordingId`, `stepNumber`, `onSaved(newUrl)`
- Loads the image via `useImage` hook, fits to max 1100×700 stage with letterbox
- Tool state: `select | arrow | rect | blur | text`
- Drawing model: array of shape objects (`{ id, type, ...props }`) — single source of truth
- Mouse handlers: pointer-down to start, pointer-move to size, pointer-up to commit
- **Arrow**: `<Arrow>` with `pointerLength={14} pointerWidth={14}`, configurable color, 4 px stroke
- **Rect**: `<Rect>` stroke only, 4 px, no fill
- **Blur**: `<Rect>` with `filters={[Konva.Filters.Blur]} blurRadius={20}` cached over the image area (via group with `clipFunc` so blur only sees pixels under it). Implementation note: the blur layer renders a duplicate of the base image clipped to the rect bounds with blur filter applied — gives true blur of underlying pixels, not a solid box.
- **Text callout**: double-click to edit inline using a positioned `<textarea>` overlay; renders as `<Text>` with optional `<Rect>` background (rounded, semi-transparent)
- **Transformer**: clicking a shape attaches `<Transformer>` for resize/rotate/move
- **Toolbar**: shadcn `Button` group with `lucide-react` icons (`MousePointer2`, `ArrowUpRight`, `Square`, `Droplet`, `Type`, `Undo2`, `Trash2`)
- **Color swatches**: 6 preset colors using semantic-friendly hex (red, amber, primary green, blue, white, black) — drawn shapes use selected color
- **Undo**: pop last shape from array (Ctrl/Cmd+Z too)
- **Save**: hide transformer → `stage.toDataURL({ pixelRatio: 2 })` → blob → `supabase.storage.upload(..., { upsert: true })` → call `onSaved` with `?v=Date.now()` cache-busted URL
- **Cancel**: close without writing

**3. Wire into `ScribeRecording.tsx`**
- Add `Annotate` button (with `Pencil`/`Edit3` icon from lucide) on each `StepCard` that has a screenshot, positioned as overlay button on hover (top-right of image)
- Local state `annotateStep: ProcessRecordingStep | null` controls modal
- After save, update local steps state with new screenshot URL (cache-busted) — no full reload

**4. Storage**
- Reuses existing `recording-screenshots` bucket — same path scheme `recordingId/step-N.png`, `upsert: true`
- Step number derived from `step.sort_order + 1` (matches extension naming)
- No new edge function needed; client uploads directly via Supabase JS

### Files to create / change

- **New**: `src/components/AnnotationEditor.tsx`
- **Edit**: `src/pages/ScribeRecording.tsx` — add Annotate trigger + state + onSaved handler
- **Add deps**: `konva`, `react-konva`, `use-image`

### Out of scope (can add later)
- Numbered step pins (1, 2, 3 markers)
- Crop / rotate base image
- Undo across saves (server-side history)
- Mobile touch gestures beyond basic drawing

