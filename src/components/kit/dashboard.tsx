"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LayoutGrid, Plus, RotateCcw, Trash2, Check, type LucideIcon } from "lucide-react";
import { useUI, type WidgetInstance, type WidgetSize } from "@/lib/ui-store";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type WidgetDef = {
  type: string;
  title: string;
  description: string;
  icon: LucideIcon;
  defaultSize: WidgetSize;
  render: (size: WidgetSize) => React.ReactNode;
  action?: React.ReactNode;
};

const SIZE_CLASS: Record<WidgetSize, string> = {
  s: "col-span-12 md:col-span-6 xl:col-span-4",
  m: "col-span-12 md:col-span-6 xl:col-span-6",
  l: "col-span-12 xl:col-span-8",
  xl: "col-span-12",
};
const SIZES: WidgetSize[] = ["s", "m", "l", "xl"];

function SortableWidget({ w, def, editing }: { w: WidgetInstance; def: WidgetDef; editing: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: w.id, disabled: !editing });
  const resize = useUI((s) => s.resizeWidget);
  const remove = useUI((s) => s.removeWidget);
  const Icon = def.icon;
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(SIZE_CLASS[w.size], "min-w-0", isDragging && "z-20")}>
      <motion.section layout="position" aria-label={def.title}
        className={cn("flex h-full flex-col rounded-3xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-18px_rgba(0,0,0,0.12)] transition-shadow",
          editing && "ring-2 ring-dashed ring-primary/30", isDragging && "shadow-2xl ring-primary/60")}>
        <header className="flex items-center gap-2 px-5 pt-4 pb-2">
          {editing && (
            <button {...attributes} {...listeners} aria-label={`Drag ${def.title}`} className="-ml-2 cursor-grab touch-none rounded-lg p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing">
              <GripVertical className="size-4" />
            </button>
          )}
          <Icon className="size-4 text-primary" aria-hidden />
          <h2 className="font-display text-[15px] font-semibold tracking-tight">{def.title}</h2>
          <div className="ml-auto flex items-center gap-1">
            {editing ? (
              <>
                <div className="flex rounded-lg bg-muted p-0.5" role="group" aria-label="Widget size">
                  {SIZES.map((s) => (
                    <button key={s} onClick={() => resize(w.id, s)} aria-pressed={w.size === s} aria-label={`Size ${s.toUpperCase()}`}
                      className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase", w.size === s ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>{s}</button>
                  ))}
                </div>
                <button onClick={() => remove(w.id)} aria-label={`Remove ${def.title}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"><Trash2 className="size-3.5" /></button>
              </>
            ) : def.action}
          </div>
        </header>
        <div className={cn("flex-1 px-5 pb-5", editing && "pointer-events-none select-none opacity-80")}>{def.render(w.size)}</div>
      </motion.section>
    </div>
  );
}

export function Dashboard({ registry, intro }: { registry: WidgetDef[]; intro?: React.ReactNode }) {
  const layout = useUI((s) => s.layout);
  const setLayout = useUI((s) => s.setLayout);
  const addWidget = useUI((s) => s.addWidget);
  const resetLayout = useUI((s) => s.resetLayout);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const map = Object.fromEntries(registry.map((r) => [r.type, r]));
  const items = layout.filter((w) => map[w.type]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = layout.findIndex((w) => w.id === active.id);
    const to = layout.findIndex((w) => w.id === over.id);
    setLayout(arrayMove(layout, from, to));
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">{intro}</div>
        <div className="flex gap-2">
          {editing && (
            <>
              <Button variant="outline" size="sm" onClick={() => setAdding(true)}><Plus /> Add widget</Button>
              <Button variant="ghost" size="sm" onClick={resetLayout}><RotateCcw /> Reset</Button>
            </>
          )}
          <Button variant={editing ? "default" : "outline"} size="sm" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
            {editing ? <><Check /> Done</> : <><LayoutGrid /> Customize</>}
          </Button>
        </div>
      </div>
      {editing && <p className="mb-4 rounded-2xl bg-primary-soft px-4 py-2.5 text-xs text-primary">Drag the handles to reorder, pick S / M / L / XL to resize, or remove widgets. Your layout is saved automatically.</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-flow-row-dense grid-cols-12 gap-4 lg:gap-5">
            {items.map((w) => <SortableWidget key={w.id} w={w} def={map[w.type]} editing={editing} />)}
          </div>
        </SortableContext>
      </DndContext>
      {items.length === 0 && (
        <div className="rounded-3xl border border-dashed p-12 text-center">
          <p className="font-medium">Your dashboard is empty</p>
          <Button className="mt-3" onClick={() => { setEditing(true); setAdding(true); }}><Plus /> Add widgets</Button>
        </div>
      )}
      <Dialog open={adding} onClose={() => setAdding(false)} title="Add a widget" description="Widgets can be added more than once and resized later." className="max-w-2xl">
        <div className="grid gap-3 pb-3 sm:grid-cols-2">
          {registry.map((r) => {
            const Icon = r.icon;
            const count = layout.filter((w) => w.type === r.type).length;
            return (
              <button key={r.type} onClick={() => { addWidget(r.type, r.defaultSize); setAdding(false); }}
                className="flex items-start gap-3 rounded-2xl border p-4 text-left transition hover:border-primary/50 hover:bg-primary-soft/40">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="size-4" /></div>
                <div>
                  <p className="text-sm font-medium">{r.title} {count > 0 && <span className="ml-1 text-[10px] text-muted-foreground">· on board</span>}</p>
                  <p className="text-xs text-muted-foreground">{r.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Dialog>
    </div>
  );
}
