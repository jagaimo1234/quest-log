import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Loader2, Plus, Flame, CheckCircle2, Circle, XCircle, Pencil, LayoutGrid, Calendar as CalendarIcon, Trash2, ArrowRight, PlayCircle, Folder, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { CalendarView } from "@/components/CalendarView";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter, isBefore, isEqual, parseISO } from "date-fns";

const QUEST_TYPE_LABELS: Record<string, string> = {
  Daily: "Daily",
  Weekly: "Weekly",
  Monthly: "Monthly",
  Yearly: "Yearly",
  Free: "One-off",
  Project: "Project",
};

const LINE_COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#84cc16", // Lime
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#d946ef", // Fuchsia
  "#f43f5e", // Rose
];

// ------------------------------------------------------------------
// CONFIGURATION (ユーザー設定)
// ------------------------------------------------------------------
// TODAY PLANNINGのカードの横幅と配置を設定します。
// Options (横幅): w-48 (192px), w-56 (224px), w-64 (256px), w-72 (288px), w-80 (320px), w-96 (384px), w-full (100%)
// Layout (配置): mx-auto (中央寄せ), ml-0 (左寄せ), mr-0 (右寄せ)
const MISSION_CARD_LAYOUT = "w-55 ml-0";


// 時間枠（左右のスペース）の横幅を設定します。
// Options: w-16 (64px), w-20 (80px), w-24 (96px), w-32 (128px)
const TIME_SLOT_WIDTH = "w-20";

// ------------------------------------------------------------------
// COMPONENTS
// ------------------------------------------------------------------

function QuestCreateDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const createQuest = trpc.quest.create.useMutation();

  const createTemplate = trpc.template.create.useMutation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get("questType") as string;

    if (type === "Relax") {
      // Relax Mission -> Create Template
      await createTemplate.mutateAsync({
        questName: formData.get("questName") as string,
        questType: "Relax",
        difficulty: "1",
        frequency: 1, // Default
      });
    } else {
      // Normal One-off -> Create Quest
      const status = type === "Free" ? "accepted" : "unreceived";
      await createQuest.mutateAsync({
        questName: formData.get("questName") as string,
        questType: type as any,
        difficulty: formData.get("difficulty") as any,
        status: status,
      });
    }
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6 w-6"><Plus className="w-4 h-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Mission</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Name</Label><Input name="questName" required /></div>
          <div><Label>Type</Label>
            <Select name="questType" defaultValue="Free">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Free">One-off (Today)</SelectItem>
                <SelectItem value="Relax">Relax Mission (Saved)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <input type="hidden" name="difficulty" value="1" />
          <Button type="submit">Create</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TodayItem({
  quest,
  templates,
  onStatusChange,
  onDragStart,
  onReorderStart
}: {
  quest: any,
  templates: any[],
  onStatusChange: () => void,
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void,
  onReorderStart?: (e: React.MouseEvent | React.TouchEvent) => void
}) {
  const updateStatus = trpc.quest.updateStatus.useMutation();
  const deleteQuest = trpc.quest.delete.useMutation();
  const template = templates.find(t => t.id === quest.templateId);

  const isCompleted = quest.status === "cleared";
  const isFailed = quest.status === "failed";
  const isChallenging = quest.status === "challenging" || quest.status === "almost";
  const isPending = updateStatus.isPending;

  // 日付が変わっているか判定（深夜0時〜朝9時の間、前日の完了タスクを薄くする）
  // ＆ 表示中の日付が過去かどうかも考慮
  // isPreviousDay = "This quest is from a previous day relative to Today" OR "We are viewing a past log"
  // Actually, if we are viewing a past log, EVERYTHING is "Previous Day" effectively.
  // But the visual style should probably be "Log style" (read only but clearly visible).

  // Let's rely on parent's disabled state for interactions.
  // Visuals: If it's a past date view, maybe don't fade them out? Just show them as they were.

  const isPreviousDay = React.useMemo(() => {
    if (!isCompleted && !isFailed) return false;
    const updatedAt = new Date(quest.updatedAt);
    const now = new Date();
    // 日付文字列で比較 (YYYY-MM-DD)
    return updatedAt.toDateString() !== now.toDateString();
  }, [quest.updatedAt, isCompleted, isFailed]);

  // Read-only logic check (passed from parent context or implied?)
  // We can check if `onDragStart` is undefined, but better to check date context if we had it.
  // For now, let's assume if it is History Object (no id matching standard?), handle clicks carefully.
  // Actually, getDailyQuests returns standard Quest objects for History too.

  // If we are in "Past View" (handled by Home), interactions should be disabled there.

  const handleNext = async () => {
    if (isPreviousDay) return; // 過去分は操作不可
    if (updateStatus.isPending) return;
    if (quest.status === "failed" || quest.status === "cleared") return;
    const nextStatus = quest.status === "accepted" ? "challenging" : quest.status === "challenging" ? "cleared" : "cleared";
    await updateStatus.mutateAsync({ questId: quest.id, status: nextStatus });
    onStatusChange();
  };

  const handleDelete = async () => {
    if (isPreviousDay) return; // 過去分は操作不可
    if (confirm("Delete this quest?")) {
      await deleteQuest.mutateAsync({ id: quest.id });
      onStatusChange();
    }
  };

  const handleAbort = async () => {
    if (isPreviousDay) return; // 過去分は操作不可
    if (confirm("Abort (Fail) this quest?")) {
      await updateStatus.mutateAsync({ questId: quest.id, status: "failed" });
      onStatusChange();
    }
  };

  let borderClass = "border-l-emerald-500";
  let bgClass = "bg-card/90";

  const isDaily = template?.questType === "Daily";
  const isWeeklyPool = template?.questType === "Weekly" && (!template.daysOfWeek || JSON.parse(template.daysOfWeek).length === 0);
  const isMonthlyPool = template?.questType === "Monthly" && (!template.datesOfMonth || JSON.parse(template.datesOfMonth).length === 0) && (!template.weeksOfMonth || JSON.parse(template.weeksOfMonth).length === 0);
  const isProject = quest.questType === "Project";
  const isRelax = template?.questType === "Relax";

  if (template) {
    if (isRelax) {
      borderClass = "border-l-emerald-500"; // Green for Relax
    } else if (isProject) {
      borderClass = "border-l-indigo-500";
    } else if (isWeeklyPool || isMonthlyPool) {
      borderClass = "border-l-fuchsia-500";
    } else {
      borderClass = "border-l-sky-500";
    }
  } else if (isProject) {
    borderClass = "border-l-indigo-500";
  } else {
    // Manual / One-off
    borderClass = "border-l-orange-500"; // Orange for Manual
  }

  if (isChallenging) {
    bgClass = "bg-amber-50/80 dark:bg-amber-900/10";
  }

  // 過去分ならグレーアウトを強化 ＆ 操作無効化クラス付与
  if (isPreviousDay) {
    bgClass += " opacity-40 grayscale pointer-events-none"; // pointer-events-noneでクリックも無効化
  }

  let slotCount = 0;
  try {
    if (quest.plannedTimeSlot) {
      const parsed = JSON.parse(quest.plannedTimeSlot);
      if (Array.isArray(parsed)) slotCount = parsed.length;
      else if (typeof parsed === 'string') slotCount = 1;
    }
  } catch (e) {
    if (quest.plannedTimeSlot) slotCount = 1;
  }

  return (
    <div
      className={`group relative flex items-center gap-2 p-2 rounded-xl border backdrop-blur-sm shadow-sm transition-all hover:shadow-md border-l-[6px] ${borderClass} ${bgClass} ${isFailed ? 'opacity-60 grayscale' : ''} ${isPending ? 'opacity-70 cursor-wait' : ''} ${isChallenging ? 'ring-1 ring-amber-300 dark:ring-amber-700' : ''}`}
      // 過去分でなければドラッグ開始イベントを有効にする
      onMouseDown={!isPreviousDay ? onDragStart : undefined}
      onTouchStart={!isPreviousDay ? onDragStart : undefined}
    >
      <div
        className={`shrink-0 cursor-grab text-muted-foreground/50 hover:text-foreground active:cursor-grabbing p-1 -ml-1 ${isPreviousDay ? 'hidden' : ''}`}
        onMouseDown={(e) => { e.stopPropagation(); onReorderStart && onReorderStart(e); }}
        onTouchStart={(e) => { e.stopPropagation(); onReorderStart && onReorderStart(e); }}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <div
        onClick={(e) => { e.stopPropagation(); handleNext(); }}
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${isCompleted ? 'bg-primary border-primary text-primary-foreground' :
          isFailed ? 'bg-destructive border-destructive text-destructive-foreground' :
            isChallenging ? 'border-amber-500 text-amber-600 bg-amber-100 dark:bg-amber-900/30' :
              'border-muted-foreground/30 hover:border-primary'
          } ${isPending ? 'pointer-events-none' : ''}`}
      >
        {isCompleted && <CheckCircle2 className="w-3 h-3" />}
        {isFailed && <XCircle className="w-3 h-3" />}
        {isChallenging && <PlayCircle className="w-3 h-3 fill-current" />}
      </div>
      <div className="flex-1 min-w-0 z-10">
        <div className={`font-bold text-xs truncate ${isFailed ? 'line-through decoration-destructive' : ''} ${isChallenging ? 'text-amber-700 dark:text-amber-400' : ''}`}>
          {quest.projectName ? `${quest.questName} -${quest.projectName}-` : quest.questName}
        </div>
        <div className="text-[9px] text-muted-foreground flex gap-1 items-center leading-none mt-0.5">
          <span className="opacity-80 uppercase tracking-tighter">{QUEST_TYPE_LABELS[quest.questType]}</span>
          {isChallenging && <span className="text-amber-600 font-bold bg-amber-100 px-1 rounded animate-pulse">RUNNING</span>}
          {slotCount > 0 && <span className="text-primary font-bold bg-primary/10 px-1 rounded">x{slotCount}</span>}
        </div>
      </div>

      {isCompleted && (
        <div className="absolute right-16 top-1/2 -translate-y-1/2 z-0 animate-in zoom-in-50 duration-300 pointer-events-none">
          <div className="border-[2px] border-red-500/80 rounded-sm px-1.5 py-0 -rotate-12 flex items-center justify-center shadow-sm bg-white/10 backdrop-blur-[1px]">
            <span className="text-xs font-black text-red-500/90 tracking-widest leading-none">CLEAR</span>
          </div>
        </div>
      )}

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <button onClick={(e) => { e.stopPropagation(); handleAbort(); }} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Abort">
          <XCircle className="w-3 h-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-100 rounded-md transition-colors" title="Delete">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function FixItem({ quest, executedCount, onReceive }: { quest: any, executedCount: number, onReceive: () => void }) {
  return (
    <div onClick={onReceive} className="cursor-pointer group flex items-center gap-3 p-2 rounded-lg border border-sky-200 bg-white hover:bg-sky-50 transition-all shadow-sm">
      <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center group-hover:bg-sky-200 transition-colors">
        <Plus className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="text-xs font-bold text-sky-900">
          {quest.projectName ? `${quest.questName} -${quest.projectName}-` : quest.questName}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-sky-500 uppercase tracking-wider">{QUEST_TYPE_LABELS[quest.questType]}</div>
          <div className="text-[9px] text-muted-foreground">達成回数: {executedCount}</div>
        </div>
      </div>
    </div>
  );
}

function NonFixItem({ template, history, onReceive }: { template: any, history: any[], onReceive: () => void }) {
  const now = new Date();
  let periodStart = startOfWeek(now);
  if (template.questType === "Monthly") periodStart = startOfMonth(now);

  const doneCount = history.filter(h =>
    h.templateId === template.id &&
    (isAfter(new Date(h.recordedAt), periodStart) || isEqual(new Date(h.recordedAt), periodStart))
  ).length;

  const quota = template.frequency || 1;
  const isCompleted = doneCount >= quota;

  return (
    <div onClick={onReceive} className="cursor-pointer group flex items-center gap-3 p-2 rounded-lg border border-fuchsia-200 bg-white hover:bg-fuchsia-50 transition-all shadow-sm">
      <div className="w-8 h-8 rounded-full bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center group-hover:bg-fuchsia-200 transition-colors">
        <Plus className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-0.5">
          <div className="text-xs font-bold text-fuchsia-900">
            {template.projectName ? `${template.questName} -${template.projectName}-` : template.questName}
          </div>
          <span className="text-[9px] font-bold text-fuchsia-400">{doneCount}/{quota}</span>
        </div>
        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-0.5">
            <div className="text-[10px] text-fuchsia-500 uppercase tracking-wider">{QUEST_TYPE_LABELS[template.questType]}</div>
            <div className="text-[9px] text-muted-foreground">達成回数: {template.executedCount || 0}</div>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: quota }).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full border border-fuchsia-200 ${i < doneCount ? 'bg-green-500 border-green-600' : 'bg-gray-100'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectTemplateItem({ template, onReceive }: { template: any, onReceive: () => void }) {
  return (
    <div onClick={onReceive} className="cursor-pointer group flex items-center gap-3 p-2 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 transition-all shadow-sm">
      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
        <Plus className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="text-xs font-bold text-indigo-900">
          {template.parentProjectName ? `${template.questName} -${template.parentProjectName}-` : template.questName}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-[10px] text-indigo-500 uppercase tracking-wider">PROJECT</div>
          <div className="text-[9px] text-muted-foreground">達成回数: {template.executedCount || 0}</div>
          {template.endDate && <div className="text-[9px] text-muted-foreground">期間: {format(new Date(template.startDate || new Date()), "MM/dd")} - {format(new Date(template.endDate), "MM/dd")}</div>}
        </div>
      </div>
    </div>
  );
}

function ConnectionLines({ quests, parentRef, templates, onUnlink }: { quests: any[], parentRef: React.RefObject<HTMLDivElement>, templates: any[], onUnlink: (questId: number, slotId: string) => void }) {
  const [paths, setPaths] = useState<{ id: string, questId: number, slotId: string, d: string, color: string }[]>([]);

  const getColor = (q: any) => {
    const idx = q.id % LINE_COLORS.length;
    return LINE_COLORS[idx];
  };

  const updatePaths = () => {
    if (!parentRef.current) return;
    const parentRect = parentRef.current.getBoundingClientRect();
    const newPaths: any[] = [];

    quests.forEach(q => {
      if (!q.plannedTimeSlot) return;

      let slots: string[] = [];
      try {
        const parsed = JSON.parse(q.plannedTimeSlot);
        if (Array.isArray(parsed)) slots = parsed;
        else if (typeof parsed === 'string') slots = [parsed];
      } catch (e) {
        if (typeof q.plannedTimeSlot === 'string') slots = [q.plannedTimeSlot];
      }

      slots.forEach(slotId => {
        const sourceEl = document.getElementById(`source-${q.id}`);
        const targetEl = document.querySelector(`[data-slot-id="${slotId}"]`);
        if (sourceEl && targetEl) {
          const sourceRect = sourceEl.getBoundingClientRect();
          const targetRect = targetEl.getBoundingClientRect();
          if (sourceRect.height === 0 || targetRect.height === 0) return;
          const x1 = sourceRect.right - parentRect.left;
          const y1 = sourceRect.top + sourceRect.height / 2 - parentRect.top;
          const x2 = targetRect.left - parentRect.left;
          const y2 = targetRect.top + targetRect.height / 2 - parentRect.top;
          const cp1x = x1 + (x2 - x1) * 0.5;
          const cp2x = x2 - (x2 - x1) * 0.5;
          newPaths.push({
            id: `${q.id}-${slotId}`,
            questId: q.id,
            slotId: slotId,
            d: `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`,
            color: getColor(q)
          });
        }
      });
    });
    setPaths(newPaths);
  };

  useLayoutEffect(() => {
    updatePaths();
    window.addEventListener("resize", updatePaths);
    window.addEventListener("scroll", updatePaths, true);
    const interval = setInterval(updatePaths, 50);
    return () => {
      window.removeEventListener("resize", updatePaths);
      window.removeEventListener("scroll", updatePaths, true);
      clearInterval(interval);
    };
  }, [quests, templates]);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
      {paths.map(p => (
        <React.Fragment key={p.id}>
          <path d={p.d} fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" className="opacity-50 dark:opacity-20" />
          <path d={p.d} fill="none" stroke={p.color} strokeWidth="2.5" strokeLinecap="round" />
          <path
            d={p.d}
            fill="none"
            stroke="transparent"
            strokeWidth="20"
            className="pointer-events-auto cursor-pointer hover:stroke-red-500/20"
            onClick={() => onUnlink(p.questId, p.slotId)}
          >
            <title>Click to Unlink</title>
          </path>
          <circle cx={p.d.split(" ")[1]} cy={p.d.split(" ")[2]} r="3" fill={p.color} />
          <circle cx={p.d.split(" ").pop()?.split(" ")[0] || 0} cy={p.d.split(" ").pop()?.split(" ")[1] || 0} r="3" fill={p.color} />
        </React.Fragment>
      ))}
    </svg>
  );
}

// RELAX Edit Dialog
function RelaxEditDialog({
  template,
  open,
  onOpenChange,
  onUpdated
}: {
  template: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const [questName, setQuestName] = useState(template.questName || "");
  const updateTemplate = trpc.template.update.useMutation();
  const deleteTemplate = trpc.template.delete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateTemplate.mutateAsync({
        templateId: template.id,
        questName,
      });
      toast.success("Updated Relax Mission");
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this mission?")) return;
    try {
      await deleteTemplate.mutateAsync({ templateId: template.id });
      toast.success("Deleted Relax Mission");
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-2 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-background border-b border-emerald-100/50">
          <DialogTitle className="text-xl font-extrabold tracking-tight flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
            <span>🌱</span> Edit Relax Mission
          </DialogTitle>
        </DialogHeader>

        <form id="relax-edit-form" onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-questName" className="text-foreground font-bold mb-1.5 block">Mission Name</Label>
              <Input
                id="edit-questName"
                value={questName}
                onChange={(e) => setQuestName(e.target.value)}
                placeholder="e.g. read a book, take a nap"
                className="bg-input border-border font-medium"
              />
            </div>
          </div>
        </form>

        <DialogFooter className="p-4 bg-muted/20 border-t border-border flex gap-2 sm:justify-between items-center w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="relax-edit-form" disabled={updateTemplate.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {updateTemplate.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("today");
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRelaxOpen, setIsRelaxOpen] = useState(false);

  const { data: activeQuests, refetch: refetchQuests } = trpc.quest.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: templates } = trpc.template.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: progression, refetch: refetchProgression } = trpc.progression.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: unreceivedQuests } = trpc.quest.unreceived.useQuery(undefined, { enabled: isAuthenticated });

  const now = new Date();
  const startRange = format(startOfWeek(startOfMonth(now)), 'yyyy-MM-dd');
  const endRange = format(endOfWeek(endOfMonth(now)), 'yyyy-MM-dd');
  const { data: history, refetch: refetchHistory } = trpc.history.list.useQuery({ startDate: startRange, endDate: endRange }, { enabled: isAuthenticated });

  const updateStatus = trpc.quest.updateStatus.useMutation();
  const createQuest = trpc.quest.create.useMutation();
  const generateFromTemplates = trpc.template.generate.useMutation();
  const updateQuest = trpc.quest.update.useMutation();

  useEffect(() => {
    if (isAuthenticated) generateFromTemplates.mutateAsync().then(() => refetchQuests());
  }, [isAuthenticated]);

  const refreshAll = () => {
    refetchQuests();
    refetchHistory();
    refetchProgression();
  };


  /*
   * Reordering Logic (Server Sync)
   */
  const [orderedIds, setOrderedIds] = useState<number[]>([]);
  const updateOrderMutation = trpc.quest.updateOrder.useMutation();

  // Initialize orderedIds from activeQuests (which are sorted by displayOrder from server)
  useEffect(() => {
    if (activeQuests) {
      setOrderedIds(activeQuests.map(q => q.id));
    }
  }, [activeQuests]);

  const todayQuests = React.useMemo(() => {
    // Filter active quests (Exclude 'failed' from list view, but keep them in DB/Log)
    const filtered = activeQuests?.filter(q => ["accepted", "challenging", "almost", "cleared"].includes(q.status)) || [];

    // Sort based on local orderedIds state (optimistic UI)
    return filtered.sort((a, b) => {
      const indexA = orderedIds.indexOf(a.id);
      const indexB = orderedIds.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return b.id - a.id;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [activeQuests, orderedIds]);

  const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const hour = i + 6;
    const label = `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`;
    return { id: label, label };
  });


  const [dragState, setDragState] = useState<{
    active: boolean,
    itemId: number | null,
    mode: 'plan' | 'sort', // 'plan' = time slot, 'sort' = reorder
    startX: number,
    startY: number,
    currentX: number,
    currentY: number
  }>({
    active: false, itemId: null, mode: 'plan', startX: 0, startY: 0, currentX: 0, currentY: 0
  });

  const handleMouseDown = (e: React.MouseEvent, itemId: number, mode: 'plan' | 'sort' = 'plan') => {
    e.preventDefault();
    e.stopPropagation(); // Stop propagation to prevent conflict
    setDragState({
      active: true,
      itemId,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY
    });
  };

  const handleTouchStart = (e: React.TouchEvent, itemId: number, mode: 'plan' | 'sort' = 'plan') => {
    if (isPast) return; // Disable DnD in past
    const touch = e.touches[0];
    // ...
    e.stopPropagation();
    setDragState({
      active: true,
      itemId,
      mode,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.active) return;
      setDragState(prev => ({ ...prev, currentX: e.clientX, currentY: e.clientY }));

      // Reorder Logic (Swiss Swap)
      if (dragState.mode === 'sort' && dragState.itemId) {
        const elementUnder = document.elementFromPoint(e.clientX, e.clientY);
        const sortTarget = elementUnder?.closest('[data-sort-id]');
        if (sortTarget) {
          const targetId = Number(sortTarget.getAttribute('data-sort-id'));
          if (targetId && targetId !== dragState.itemId) {
            setOrderedIds(prev => {
              const newOrder = [...prev];
              const fromIndex = newOrder.indexOf(dragState.itemId!);
              const toIndex = newOrder.indexOf(targetId);
              if (fromIndex !== -1 && toIndex !== -1) {
                // Remove and insert
                newOrder.splice(fromIndex, 1);
                newOrder.splice(toIndex, 0, dragState.itemId!);

                // Debounce server update? Or just trigger it on drop?
                // For simpler implementation, let's trigger it on drop (MouseUp) to avoid spamming.
                // But wait, MouseUp logic doesn't have reference to the new order easily unless we store it.
                // Actually, 'orderedIds' state is updated here.
                return newOrder;
              }
              return prev;
            });
          }
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragState.active) return;
      const touch = e.touches[0];
      setDragState(prev => ({ ...prev, currentX: touch.clientX, currentY: touch.clientY }));
      if (e.cancelable) e.preventDefault();

      // Reorder Logic (Swiss Swap) - Touch
      if (dragState.mode === 'sort' && dragState.itemId) {
        const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
        const sortTarget = elementUnder?.closest('[data-sort-id]');
        if (sortTarget) {
          const targetId = Number(sortTarget.getAttribute('data-sort-id'));
          if (targetId && targetId !== dragState.itemId) {
            setOrderedIds(prev => {
              const newOrder = [...prev];
              const fromIndex = newOrder.indexOf(dragState.itemId!);
              const toIndex = newOrder.indexOf(targetId);
              if (fromIndex !== -1 && toIndex !== -1) {
                newOrder.splice(fromIndex, 1);
                newOrder.splice(toIndex, 0, dragState.itemId!);
                return newOrder;
              }
              return prev;
            });
          }
        }
      }
    };

    const handleMouseUp = async (e: MouseEvent | TouchEvent) => {
      if (!dragState.active) return;

      let clientX, clientY;
      if ('changedTouches' in e) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      if (dragState.mode === 'plan') {
        // ... (existing planing logic)
        const elements = document.elementsFromPoint(clientX, clientY);
        const slotElement = elements.find(el => el.getAttribute('data-slot-id'));
        const slotElementInDrag = slotElement; // renaming for clarity

        if (slotElementInDrag && dragState.itemId) {
          const slotId = slotElementInDrag.getAttribute('data-slot-id');
          const quest = activeQuests?.find(q => q.id === dragState.itemId);

          if (slotId && quest) {
            try {
              let currentSlots: string[] = [];
              try {
                if (quest.plannedTimeSlot) {
                  const parsed = JSON.parse(quest.plannedTimeSlot);
                  if (Array.isArray(parsed)) currentSlots = parsed;
                  else if (typeof parsed === 'string') currentSlots = [parsed];
                }
              } catch {
                if (quest.plannedTimeSlot) currentSlots = [quest.plannedTimeSlot];
              }
              if (!currentSlots.includes(slotId)) {
                const newSlots = [...currentSlots, slotId];
                await updateQuest.mutateAsync({ questId: dragState.itemId, plannedTimeSlot: JSON.stringify(newSlots) });
                toast.success(`Planned for ${slotId}`);
                refreshAll();
              }
            } catch (err) {
              toast.error("Failed to plan");
            }
          }
        }
      }
      setDragState(prev => ({ ...prev, active: false, itemId: null, mode: 'plan' }));

      // Trigger server update if order changed
      if (dragState.mode === 'sort') {
        // Create updates array
        const updates = orderedIds.map((id, index) => ({ questId: id, order: index }));
        updateOrderMutation.mutate(updates);
      }
    };

    if (dragState.active) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [dragState.active, dragState.itemId, activeQuests]);

  const handleUnlink = async (questId: number, slotId: string) => {
    const quest = activeQuests?.find(q => q.id === questId);
    if (!quest) return;
    try {
      let currentSlots: string[] = [];
      try {
        if (quest.plannedTimeSlot) {
          const parsed = JSON.parse(quest.plannedTimeSlot);
          if (Array.isArray(parsed)) currentSlots = parsed;
          else if (typeof parsed === 'string') currentSlots = [parsed];
        }
      } catch {
        if (quest.plannedTimeSlot) currentSlots = [quest.plannedTimeSlot];
      }
      const newSlots = currentSlots.filter(s => s !== slotId);
      const val = newSlots.length === 0 ? null : JSON.stringify(newSlots);
      await updateQuest.mutateAsync({ questId, plannedTimeSlot: val });
      toast.success("Link removed");
      refreshAll();
    } catch (err) {
      toast.error("Failed to unlink");
    }
  };

  // SHELF LOGIC
  const fixShelfQuests = unreceivedQuests?.filter(q => q.questType !== "Project" && q.questType !== "Relax") || []; // RELAX uses templates directly

  // Project Shelf Logic (Now based on Templates)
  const projectTemplates = templates?.filter(t => {
    if (t.questType !== "Project") return false;
    // Date Check
    if (!t.startDate || !t.endDate) return true; // Show invalid ones too? No, should be valid.
    // If start/end date present, check if now is within range.
    const start = new Date(t.startDate);
    const end = new Date(t.endDate);
    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);
    return isAfter(now, start) && isBefore(now, end) || isEqual(now, start) || isEqual(now, end);
  }) || [];

  const nonFixTemplates = templates?.filter(t => {
    const isPool = (t.questType === "Weekly" || t.questType === "Monthly") &&
      (!t.daysOfWeek || JSON.parse(t.daysOfWeek).length === 0) &&
      (!t.datesOfMonth || JSON.parse(t.datesOfMonth).length === 0);
    if (!isPool) return false;

    // Filter out if quota met
    if (!history) return true;
    let periodStart = startOfWeek(now);
    if (t.questType === "Monthly") periodStart = startOfMonth(now);
    const doneCount = history.filter(h => h.templateId === t.id && (isAfter(new Date(h.recordedAt), periodStart) || isEqual(new Date(h.recordedAt), periodStart))).length;
    return doneCount < (t.frequency || 1);
  }) || [];

  const relaxTemplates = templates?.filter(t => t.questType === "Relax") || [];

  const handleReceiveFix = async (questId: number) => { await updateStatus.mutateAsync({ questId, status: "accepted" }); toast.success("Received"); refreshAll(); };
  const handleReceiveNonFix = async (template: any) => { await createQuest.mutateAsync({ questName: template.questName, questType: template.questType, difficulty: template.difficulty, templateId: template.id, status: "accepted" } as any); toast.success("Received"); refreshAll(); };

  // Create Instance from Project Template
  const handleReceiveProject = async (template: any) => {
    await createQuest.mutateAsync({
      questName: template.questName,
      projectName: template.parentProjectName || template.projectName, // Use Parent Project Name
      questType: "Project" as any,
      difficulty: template.difficulty,
      templateId: template.id,
      status: "accepted"
    } as any);
    toast.success("Started Project Task");
    refreshAll();
  };

  // RELAX: Create Instance
  const handleReceiveRelax = async (template: any) => {
    await createQuest.mutateAsync({
      questName: template.questName,
      questType: "Relax" as any,
      difficulty: "1",
      templateId: template.id,
      status: "accepted"
    } as any);
    toast.success("Add Relax Mission");
    refreshAll();
  };

  const [editingRelaxTemplate, setEditingRelaxTemplate] = useState<any>(null);

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground select-none" onClick={() => setIsRelaxOpen(false)}>
      <main className="layout-container py-8 mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Quest Log</h1>
          <div className="flex gap-4">
            {progression?.currentStreak > 0 && <div className="flex items-center gap-1 text-orange-500 font-bold"><Flame className="fill-orange-500 w-5 h-5" /> {progression.currentStreak}</div>}
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => window.location.href = "/templates"}>Templates</Button>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = "/projects"}>Projects</Button>
              <QuestCreateDialog onCreated={refreshAll} />
            </div>
          </div>
        </div>

        <Tabs defaultValue="today" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-8 animate-fade-in">

            {/* SHELF 1: TODAY */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Today Planning</h2>
                <span className="text-xs text-muted-foreground">{todayQuests.length} tasks</span>
              </div>
              <div className="relative">
                {/* RELAX COLUMN (Absolute Overlay or Side Column?) Using flex to sit beside. */}
                {/* 
                   Requirement: 
                   RELAX列は デフォルトでは折りたたみ状態 
                   RELAXボタン（見出し）をタップすると：登録済みRELAXミッション一覧が展開される
                   画面外（サイド）をタップすると：RELAX列は再び折りたたまれる
                */}
                <div ref={containerRef} className="flex justify-between gap-2 items-start relative min-h-[500px]">
                  <ConnectionLines quests={todayQuests} parentRef={containerRef} templates={templates || []} onUnlink={handleUnlink} />

                  <div className={`flex flex-col gap-3 rounded-xl p-2 z-20 min-h-[300px] ${MISSION_CARD_LAYOUT}`}>
                    {todayQuests.map(q => (
                      <div
                        id={`source-${q.id}`}
                        key={q.id}
                        data-sort-id={q.id}
                        className={`cursor-default relative bg-background rounded-xl z-20 transition-transform ${dragState.itemId === q.id && dragState.mode === 'sort' ? 'shadow-2xl scale-105 z-50 ring-2 ring-primary' : 'hover:scale-[1.02]'}`}
                      >
                        <TodayItem
                          quest={q}
                          templates={templates || []}
                          onStatusChange={() => refreshAll()}
                          onDragStart={(e) => {
                            if ('touches' in e) handleTouchStart(e as any, q.id, 'plan');
                            else handleMouseDown(e as any, q.id, 'plan');
                          }}
                          onReorderStart={(e) => {
                            if ('touches' in e) handleTouchStart(e as any, q.id, 'sort');
                            else handleMouseDown(e as any, q.id, 'sort');
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Right Log (Time Slots) */}
                  <div className={`flex items-start gap-0 relative z-10 pl-0 shrink-0 ${TIME_SLOT_WIDTH}`}>
                    <div className="flex flex-col gap-1 w-full pb-10">
                      <div className="text-[10px] font-bold text-muted-foreground mb-1 px-1">Log</div>
                      {timeSlots.map(slot => {
                        // Check if slot is used (use activeQuests to include failed/other statuses as "occupied" in log)
                        const isUsed = activeQuests?.some(q => {
                          if (!q.plannedTimeSlot) return false;
                          // If failed/cleared, only count if it was updated today?
                          // activeQuests already filters for today logic in getActiveQuests
                          if (["failed", "cleared"].includes(q.status)) {
                            // Check update time? getActiveQuests logic handles it.
                          }

                          try {
                            const parsed = JSON.parse(q.plannedTimeSlot);
                            if (Array.isArray(parsed)) return parsed.includes(slot.id);
                            return parsed === slot.id;
                          } catch {
                            return q.plannedTimeSlot === slot.id;
                          }
                        }) || false;

                        return (
                          <div key={slot.id} data-slot-id={slot.id} className="rounded-md border bg-card/60 p-0.5 min-h-[24px] flex items-center justify-center transition-all hover:bg-accent/5 hover:border-accent/50 group relative">
                            <div className="text-[9px] font-bold text-muted-foreground/30 group-hover:text-accent transition-colors select-none pointer-events-none z-10">{slot.label}</div>
                            {!isUsed && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-0">
                                <img src="/free_stamp.png" alt="free" className="w-16 opacity-50 -rotate-12 select-none" />
                              </div>
                            )}
                            {!isUsed && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                <img src="/free_stamp.png" alt="free" className="w-12 opacity-30 -rotate-12 select-none" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {dragState.active && dragState.itemId && (
              <div className="fixed pointer-events-none z-50 p-2 opacity-80 scale-105" style={{ left: dragState.currentX, top: dragState.currentY, transform: 'translate(-50%, -50%)', width: '200px' }}>
                {(() => {
                  const q = todayQuests.find(i => i.id === dragState.itemId);
                  if (!q) return null;
                  return (
                    <TodayItem
                      quest={q}
                      templates={templates || []}
                      onStatusChange={refreshAll}
                      onDragStart={(e) => {
                        if ('touches' in e) handleTouchStart(e as any, q.id);
                        else handleMouseDown(e as any, q.id);
                      }}
                    />
                  );
                })()}
              </div>
            )}

            <div className="h-px bg-border/50 my-6" />

            {/* SHELF 2: FIX (Scheduled) */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-bold text-sky-500 uppercase tracking-wider">FIX (Scheduled)</h2>
              </div>
              {fixShelfQuests.length === 0 ? <div className="text-xs text-muted-foreground px-1 italic">No scheduled tasks.</div> : (
                <div>{fixShelfQuests.map(q => {
                  const t = templates?.find(tp => tp.id === q.templateId);
                  return <FixItem key={q.id} quest={q} executedCount={t?.executedCount || 0} onReceive={() => handleReceiveFix(q.id)} />;
                })}</div>
              )}
            </section>

            <div className="h-px bg-border/50 my-6" />

            {/* SHELF 3: NON-FIX (Pool) */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-bold text-fuchsia-500 uppercase tracking-wider">Non-FIX (Pool)</h2>
              </div>
              {nonFixTemplates.length === 0 ? <div className="text-xs text-muted-foreground px-1 italic">No pool templates.</div> : (
                <div>{nonFixTemplates.map(t => <NonFixItem key={t.id} template={t} history={history || []} onReceive={() => handleReceiveNonFix(t)} />)}</div>
              )}
            </section>

            <div className="h-px bg-border/50 my-6" />

            {/* SHELF 4: PROJECT */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-bold text-indigo-500 uppercase tracking-wider">PROJECT</h2>
              </div>
              {projectTemplates.length === 0 ? <div className="text-xs text-muted-foreground px-1 italic">No active projects.</div> : (
                <div className="space-y-2">
                  {projectTemplates.map(t => <ProjectTemplateItem key={t.id} template={t} onReceive={() => handleReceiveProject(t)} />)}
                </div>
              )}
            </section>

            <div className="h-px bg-border/50 my-6" />

            {/* SHELF 5: RELAX (Collapsible) */}
            <section>
              <div
                onClick={(e) => { e.stopPropagation(); setIsRelaxOpen(!isRelaxOpen); }}
                className="flex items-center justify-between mb-3 px-1 cursor-pointer hover:bg-emerald-50/50 rounded-md py-1 transition-colors select-none"
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                    <span>🌱</span> RELAX
                  </h2>
                  <span className="text-[10px] text-muted-foreground bg-emerald-50 px-1.5 rounded-sm">Recover</span>
                </div>
                <div className="text-emerald-400">
                  {isRelaxOpen ? "▼" : "▶"}
                </div>
              </div>

              {isRelaxOpen && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                  {relaxTemplates.length === 0 ? <div className="text-xs text-muted-foreground px-1 italic">No relax missions.</div> : (
                    <div className="grid grid-cols-2 gap-2">
                      {relaxTemplates.map(t => (
                        <div
                          key={t.id}
                          onClick={() => handleReceiveRelax(t)}
                          className="cursor-pointer group relative flex items-center gap-2 p-2 rounded-lg border border-emerald-200 bg-white hover:scale-[1.02] hover:shadow-sm transition-all shadow-sm"
                        >
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-200 transition-colors shrink-0">
                            <Plus className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-emerald-900 truncate">{t.questName}</div>
                            <div className="text-[9px] text-emerald-500">Recovery</div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-6 h-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-100/50 text-emerald-400"
                            onClick={(e) => { e.stopPropagation(); setEditingRelaxTemplate(t); }}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

          </TabsContent>

          <TabsContent value="calendar" className="animate-fade-in">
            <CalendarView />
          </TabsContent>
        </Tabs>

        {editingRelaxTemplate && (
          <RelaxEditDialog
            template={editingRelaxTemplate}
            open={!!editingRelaxTemplate}
            onOpenChange={(open) => !open && setEditingRelaxTemplate(null)}
            onUpdated={refreshAll}
          />
        )}
      </main>
    </div>
  );
}
