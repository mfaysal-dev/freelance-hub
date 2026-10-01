"use client";
import { useEffect, useState } from "react";
import { Pause, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useCrm } from "@/lib/crm/store";
import { hours } from "@/lib/crm/money";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";
import { useCrmUI } from "./ui-state";

function elapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function TimerPanel({ compact }: { compact?: boolean }) {
  const { projects, timer, startTimer, stopTimer, clients } = useCrm();
  const setEntryDlg = useCrmUI((s) => s.setEntryDlg);
  const active = projects.filter((p) => p.status !== "done");
  const [pid, setPid] = useState("");
  const [note, setNote] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timer) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [timer]);
  const projectId = pid || active[0]?.id || "";
  const running = timer ? projects.find((p) => p.id === timer.projectId) : null;
  const client = running ? clients.find((c) => c.id === running.clientId) : null;
  return (
    <div className={cn("flex flex-col gap-3", !compact && "sm:flex-row sm:items-end")}>
      {timer ? (
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Tracking · {client?.company ?? client?.name}</p>
          <p className="truncate font-medium">{running?.name}</p>
          <p className="tabular mt-1 font-mono text-4xl font-bold tracking-tight text-primary" aria-live="off">{elapsed(now - timer.startedAt)}</p>
          {timer.note && <p className="text-xs text-muted-foreground">“{timer.note}”</p>}
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-2">
          <Select value={projectId} onChange={(e) => setPid(e.target.value)} aria-label="Project to track">{active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What are you working on?" aria-label="Timer note" />
        </div>
      )}
      <div className="flex gap-2">
        {timer ? (
          <Button size="lg" variant="destructive" className="flex-1" onClick={() => { const e = stopTimer(); if (e) toast(`Logged ${hours(e.minutes)}`, running?.name); }}><Pause /> Stop</Button>
        ) : (
          <Button size="lg" className="flex-1" disabled={!projectId} onClick={() => { startTimer(projectId, note); setNote(""); toast("Timer started", "Focus mode on ⏱️", "default"); }}><Play /> Start</Button>
        )}
        <Button size="lg" variant="outline" aria-label="Log time manually" onClick={() => setEntryDlg(true)}><Plus /></Button>
      </div>
    </div>
  );
}
