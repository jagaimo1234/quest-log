import React, { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import {
  CheckCircle2,
  PlayCircle,
  Clock,
  Plus,
  ArrowLeft,
  Calendar,
  Flame,
  Trophy,
  Sparkles,
  ChevronRight,
  FolderOpen,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function isMoaiQuest(q: any): boolean {
  if (!q) return false;
  return (
    !!q.isMoai ||
    (typeof q.projectName === "string" && (q.projectName.toLowerCase().includes("moai") || q.projectName.includes("モアイ"))) ||
    (typeof q.questName === "string" && (q.questName.toLowerCase().includes("moai") || q.questName.includes("モアイ")))
  );
}

interface MoaiDashboardProps {
  activeQuests: any[];
  history: any[];
  templates: any[];
  onStatusChange: () => void;
  onBackToPlanning: () => void;
  onOpenCreateDialog: () => void;
}

export function MoaiDashboard({
  activeQuests,
  history,
  templates,
  onStatusChange,
  onBackToPlanning,
  onOpenCreateDialog,
}: MoaiDashboardProps) {
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");
  const updateStatus = trpc.quest.updateStatus.useMutation();

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Filter MOAI quests matching the selected period
  const periodData = useMemo(() => {
    // 1. Gather all unique MOAI quests from activeQuests and history
    const allCandidates = new Map<string, any>();

    (activeQuests || []).forEach((q) => {
      if (isMoaiQuest(q)) {
        allCandidates.set(`quest-${q.id}`, { ...q, source: "active" });
      }
    });

    (history || []).forEach((h) => {
      if (isMoaiQuest(h)) {
        const key = h.questId ? `quest-${h.questId}` : `hist-${h.id}`;
        if (!allCandidates.has(key)) {
          allCandidates.set(key, { ...h, source: "history", status: h.finalStatus || "cleared" });
        }
      }
    });

    const list = Array.from(allCandidates.values());

    // 2. Filter by period
    return list.filter((item) => {
      // Determine relevant date for the item
      const itemDate = item.clearedAt
        ? new Date(item.clearedAt)
        : item.startDate
        ? new Date(item.startDate)
        : item.recordedDate
        ? new Date(item.recordedDate)
        : item.createdAt
        ? new Date(item.createdAt)
        : null;

      if (!itemDate) return false;

      if (period === "today") {
        return format(itemDate, "yyyy-MM-dd") === todayStr;
      } else if (period === "week") {
        return isWithinInterval(itemDate, { start: weekStart, end: weekEnd });
      } else {
        // month
        return isWithinInterval(itemDate, { start: monthStart, end: monthEnd });
      }
    }).sort((a, b) => {
      const dateA = new Date(a.clearedAt || a.startDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.clearedAt || b.startDate || b.createdAt || 0).getTime();
      return dateB - dateA; // newest first
    });
  }, [activeQuests, history, period, todayStr, weekStart, weekEnd, monthStart, monthEnd]);

  // Statistics
  const stats = useMemo(() => {
    const cleared = periodData.filter((q) => q.status === "cleared" || q.finalStatus === "cleared");
    const running = periodData.filter((q) => q.status === "challenging");
    const planned = periodData.filter((q) => q.status === "accepted" || q.status === "unreceived");

    return {
      total: periodData.length,
      cleared: cleared.length,
      running: running.length,
      planned: planned.length,
    };
  }, [periodData]);

  // Handle quick clear
  const handleQuickNext = async (quest: any) => {
    if (quest.source === "history") return;
    try {
      const nextStatus = quest.status === "accepted" ? "challenging" : "cleared";
      await updateStatus.mutateAsync({ questId: quest.id, status: nextStatus });
      toast.success(nextStatus === "cleared" ? "🎉 MOAI活動をクリアしました！" : "⚡ MOAI活動を開始しました！");
      onStatusChange();
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const periodLabel = period === "today" ? "今日" : period === "week" ? "今週" : "今月";
  const dateRangeLabel =
    period === "today"
      ? format(now, "yyyy年M月d日 (E)")
      : period === "week"
      ? `${format(weekStart, "M/d")} 〜 ${format(weekEnd, "M/d")}`
      : `${format(monthStart, "yyyy年M月")}`;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-16 animate-fade-in select-none">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗿</span>
            <h1 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              MOAI活動 成果・振り返り
            </h1>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30">
              Dashboard
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            ワンオフ・定例を含めたMOAI活動の取り組み実績と振り返り
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBackToPlanning}
            className="text-xs font-bold gap-1.5 h-8 border-stone-200 dark:border-stone-800 cursor-pointer shadow-2xs hover:bg-muted"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>計画へ戻る</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onOpenCreateDialog}
            className="text-xs font-bold gap-1.5 h-8 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新規MOAIタスク</span>
          </Button>
        </div>
      </div>

      {/* Period Tabs & Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
        {/* Segmented Period Control */}
        <div className="flex bg-muted p-1 rounded-xl shadow-inner text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => setPeriod("today")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              period === "today"
                ? "bg-background text-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>今日</span>
          </button>
          <button
            type="button"
            onClick={() => setPeriod("week")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              period === "week"
                ? "bg-background text-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>今週</span>
          </button>
          <button
            type="button"
            onClick={() => setPeriod("month")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              period === "month"
                ? "bg-background text-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-600" />
            <span>今月</span>
          </button>
        </div>

        <div className="text-xs text-muted-foreground font-mono font-bold flex items-center gap-1.5">
          <span>対象期間:</span>
          <span className="text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
            {dateRangeLabel}
          </span>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border/60 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {periodLabel}の総取り組み
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            {stats.total} <span className="text-xs font-normal text-muted-foreground">件</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-emerald-500/20 bg-emerald-500/[0.02] shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            達成クリア
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {stats.cleared} <span className="text-xs font-normal text-muted-foreground">件</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-amber-500/20 bg-amber-500/[0.02] shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <PlayCircle className="w-3 h-3" />
            実行中
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {stats.running} <span className="text-xs font-normal text-muted-foreground">件</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-blue-500/20 bg-blue-500/[0.02] shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" />
            予定 / 受託中
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {stats.planned} <span className="text-xs font-normal text-muted-foreground">件</span>
          </div>
        </div>
      </div>

      {/* Weekly Target Progress Bar (if in week view) */}
      {period === "week" && (
        <div className="p-4 rounded-xl bg-card border border-amber-500/20 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>週10回目標の進捗</span>
            </div>
            <div className="font-mono text-xs font-black">
              <span className="text-amber-600 dark:text-amber-400 text-sm">{stats.cleared}</span>
              <span className="text-muted-foreground"> / 10回</span>
              <span className="ml-2 text-muted-foreground text-[10px]">
                ({Math.min(100, Math.round((stats.cleared / 10) * 100))}%)
              </span>
            </div>
          </div>
          <div className="w-full h-2.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden p-0.5 border border-border/40">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (stats.cleared / 10) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Quests List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span>{periodLabel}のMOAI活動リスト</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
              {periodData.length}
            </span>
          </h2>
        </div>

        {periodData.length === 0 ? (
          <div className="p-10 text-center rounded-2xl border border-dashed border-border/60 bg-card/40 space-y-3">
            <div className="text-3xl">🗿</div>
            <div className="text-sm font-bold text-foreground">
              {periodLabel}のMOAI活動はまだありません
            </div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              ワンオフミッション作成時に「🗿 MOAI活動タグをつける」にチェックを入れるか、既存カードの長押しからタグ付けできます。
            </p>
            <Button
              type="button"
              size="sm"
              onClick={onOpenCreateDialog}
              className="text-xs font-bold gap-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>最初のMOAIタスクを登録する</span>
            </Button>
          </div>
        ) : (
          <div className="grid gap-2.5">
            {periodData.map((quest) => {
              const isCleared = quest.status === "cleared" || quest.finalStatus === "cleared";
              const isRunning = quest.status === "challenging";
              const dateDisplay = quest.clearedAt
                ? format(new Date(quest.clearedAt), "M/d (E) HH:mm")
                : quest.startDate
                ? format(new Date(quest.startDate), "M/d (E)")
                : format(new Date(quest.createdAt), "M/d (E)");

              return (
                <div
                  key={quest.id || quest.questId}
                  className={`p-3 sm:p-4 rounded-xl border bg-card transition-all duration-150 flex items-start justify-between gap-3 shadow-2xs hover:shadow-xs ${
                    isCleared
                      ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                      : isRunning
                      ? "border-amber-500/40 ring-1 ring-amber-500/20 bg-amber-500/[0.02]"
                      : "border-border/60 hover:border-amber-500/30"
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-foreground break-words">
                        {quest.projectName && quest.projectName !== "MOAI活動"
                          ? `${quest.questName} -${quest.projectName}-`
                          : quest.questName}
                      </span>

                      {/* Badges */}
                      <span className="text-[8.5px] font-black bg-amber-500/20 text-amber-900 dark:text-amber-100 border border-amber-500/40 px-1.5 py-0.2 rounded shadow-2xs">
                        🗿 MOAI
                      </span>

                      {quest.isAdhoc ? (
                        <span className="text-[8px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/25 px-1 py-0.2 rounded">
                          隙間
                        </span>
                      ) : null}

                      {isCleared ? (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.2 rounded flex items-center gap-1">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          CLEAR
                        </span>
                      ) : isRunning ? (
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.2 rounded animate-pulse">
                          RUNNING
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                          {quest.status === "accepted" ? "受託中" : "未受託"}
                        </span>
                      )}
                    </div>

                    {/* Note / Memo if present */}
                    {quest.note && (
                      <div className="text-xs text-foreground/80 bg-muted/40 p-2 rounded-lg border border-border/30 break-words">
                        {quest.note}
                      </div>
                    )}

                    {/* Date & Slot Info */}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                      <span>📅 {dateDisplay}</span>
                      {quest.plannedTimeSlot && (
                        <span>⏰ {quest.plannedTimeSlot.replace(/[\[\]"]/g, "")}</span>
                      )}
                    </div>
                  </div>

                  {/* Action on the right */}
                  {quest.source === "active" && !isCleared && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleQuickNext(quest)}
                      className={`shrink-0 text-xs font-bold h-8 cursor-pointer shadow-2xs ${
                        isRunning
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                          : "bg-amber-500 hover:bg-amber-600 text-stone-950 font-black"
                      }`}
                    >
                      {isRunning ? "クリアにする" : "挑戦する"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
