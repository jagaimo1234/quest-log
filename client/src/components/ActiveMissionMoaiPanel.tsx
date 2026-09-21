import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Pause,
  Play,
  Plus,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { ThinkingMoai, MoaiState } from "./ThinkingMoai";

interface ActiveMissionMoaiPanelProps {
  activeQuest: any | null;
  todayQuests: any[];
  templates: any[];
  onStatusChange: () => void;
}

const DEFAULT_NOT_TO_DO = [
  "スマホを見ない",
  "SNSを開かない",
  "他の調べ物は後で",
];

const NOT_TO_DO_KEY = "quest_log_not_to_do_items";

export function ActiveMissionMoaiPanel({
  activeQuest,
  todayQuests,
  templates,
  onStatusChange,
}: ActiveMissionMoaiPanelProps) {
  const updateStatus = trpc.quest.updateStatus.useMutation();

  // Mode: "moai" (ビジュアル集中モード) vs "card" (詳細カードモード)
  const [displayMode, setDisplayMode] = useState<"moai" | "card">("moai");
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Transient state for Moai celebrations / rests
  const [transientState, setTransientState] = useState<MoaiState | null>(null);

  // Not to do list (やらないことリスト)
  const [notToDoList, setNotToDoList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(NOT_TO_DO_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return DEFAULT_NOT_TO_DO;
  });

  const [isAddingNotToDo, setIsAddingNotToDo] = useState(false);
  const [newNotToDoText, setNewNotToDoText] = useState("");

  const saveNotToDoList = (items: string[]) => {
    setNotToDoList(items);
    try {
      localStorage.setItem(NOT_TO_DO_KEY, JSON.stringify(items));
    } catch (e) {
      // ignore
    }
  };

  const handleAddNotToDo = () => {
    if (!newNotToDoText.trim()) {
      setIsAddingNotToDo(false);
      return;
    }
    const updated = [...notToDoList, newNotToDoText.trim()];
    saveNotToDoList(updated);
    setNewNotToDoText("");
    setIsAddingNotToDo(false);
    toast.success("やらないことを外に浮かべました");
  };

  const handleRemoveNotToDo = (index: number) => {
    const updated = notToDoList.filter((_, i) => i !== index);
    saveNotToDoList(updated);
  };

  // Determine current Moai state
  const effectiveMoaiState: MoaiState = transientState
    ? transientState
    : activeQuest
    ? "focusing"
    : "idle";

  // Actions
  const handleComplete = async () => {
    if (!activeQuest) return;
    setTransientState("completed");
    if (window.navigator?.vibrate) window.navigator.vibrate([30, 50, 30]);

    try {
      await updateStatus.mutateAsync({
        questId: activeQuest.id,
        status: "cleared",
      });
      toast.success(`「${activeQuest.questName}」を完了しました！🎉`);
      setTimeout(() => {
        setTransientState(null);
        onStatusChange();
      }, 2000);
    } catch (e) {
      setTransientState(null);
      toast.error("ステータスの更新に失敗しました");
    }
  };

  const handlePause = async () => {
    if (!activeQuest) return;
    setTransientState("resting");
    if (window.navigator?.vibrate) window.navigator.vibrate(20);

    try {
      await updateStatus.mutateAsync({
        questId: activeQuest.id,
        status: "accepted",
      });
      toast.info("ミッションを一時中断しました（ひと休み）");
      setTimeout(() => {
        setTransientState(null);
        onStatusChange();
      }, 1800);
    } catch (e) {
      setTransientState(null);
      toast.error("ステータスの更新に失敗しました");
    }
  };

  const handleStartQuest = async (questId: number) => {
    try {
      await updateStatus.mutateAsync({
        questId,
        status: "challenging",
      });
      toast.success("ミッションを開始しました！モアイの脳内にセットされました⚡");
      onStatusChange();
    } catch (e) {
      toast.error("開始に失敗しました");
    }
  };

  // Parse time slot for card view
  const template = templates?.find((t: any) => t.id === activeQuest?.templateId);
  let slotLabel = "";
  try {
    if (activeQuest?.plannedTimeSlot) {
      const parsed = JSON.parse(activeQuest.plannedTimeSlot);
      if (Array.isArray(parsed)) slotLabel = parsed.join(", ");
      else slotLabel = String(parsed);
    }
  } catch (e) {
    slotLabel = activeQuest?.plannedTimeSlot || "";
  }

  // Floating bubble pastel styles
  const BUBBLE_STYLES = [
    "bg-sky-100/70 border-sky-300/80 text-sky-950 dark:bg-sky-950/40 dark:border-sky-700/60 dark:text-sky-200",
    "bg-purple-100/70 border-purple-300/80 text-purple-950 dark:bg-purple-950/40 dark:border-purple-700/60 dark:text-purple-200",
    "bg-amber-100/70 border-amber-300/80 text-amber-950 dark:bg-amber-950/40 dark:border-amber-700/60 dark:text-amber-200",
    "bg-emerald-100/70 border-emerald-300/80 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-700/60 dark:text-emerald-200",
    "bg-rose-100/70 border-rose-300/80 text-rose-950 dark:bg-rose-950/40 dark:border-rose-700/60 dark:text-rose-200",
  ];

  return (
    <div className="w-full rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-gradient-to-b from-[#fdfcf9] via-[#f9f8f4] to-[#f4f2ea] dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 shadow-sm overflow-hidden mb-6 transition-all duration-300">
      {/* Panel Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-stone-200/60 dark:border-stone-800/80 bg-white/40 dark:bg-stone-900/40 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs">
            🗿
          </div>
          <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
            {activeQuest ? "モアイミッション・集中中" : "モアイミッション（待機中）"}
          </span>
          {activeQuest && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
              RUNNING
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Button: [ 📋 カード ⇄ 🗿 モアイ ] */}
          <div className="flex items-center p-0.5 bg-stone-200/70 dark:bg-stone-800 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setDisplayMode("moai")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                displayMode === "moai"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs"
                  : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              <span>🗿 モアイ</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("card")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                displayMode === "card"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs"
                  : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              <span>📋 カード</span>
            </button>
          </div>

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-md transition-colors"
            title={isPanelCollapsed ? "パネルを展開" : "パネルを折りたたむ"}
          >
            {isPanelCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Body */}
      {!isPanelCollapsed && (
        <div className="p-4 sm:p-6 transition-all duration-300">
          {/* MODE 1: MOAI VIEW (モアイ集中モード) */}
          {displayMode === "moai" ? (
            <div className="relative flex flex-col items-center justify-center min-h-[380px] sm:min-h-[420px]">
              {/* Main Headline */}
              <div className="text-center mb-4 sm:mb-6">
                <h3 className="text-xl sm:text-2xl font-black text-stone-800 dark:text-stone-100 tracking-tight">
                  {activeQuest ? "今は、これに集中。" : "何からやろう？"}
                </h3>
              </div>

              {/* Center Moai & Floating Area */}
              <div className="relative w-full max-w-2xl flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-10 my-2">
                {/* Floating "やらないこと" bubbles - Left Side (Desktop) */}
                <div className="hidden md:flex flex-col gap-3 items-end absolute left-2 lg:left-8 top-6 pointer-events-auto z-20">
                  {notToDoList.slice(0, 2).map((item, idx) => (
                    <div
                      key={idx}
                      className={`relative group px-3.5 py-2.5 rounded-full border shadow-xs backdrop-blur-xs text-xs font-bold flex items-center gap-1.5 transition-transform hover:scale-105 select-none ${
                        BUBBLE_STYLES[idx % BUBBLE_STYLES.length]
                      }`}
                    >
                      <span>🎈 {item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveNotToDo(idx)}
                        className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-opacity ml-1 cursor-pointer"
                        title="このやらないことを消す"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Central Moai Character */}
                <div className="relative z-10">
                  <ThinkingMoai
                    state={effectiveMoaiState}
                    brainText={
                      transientState === "completed"
                        ? "できた！"
                        : transientState === "resting"
                        ? "ひと休み"
                        : activeQuest
                        ? activeQuest.questName
                        : "何からやろう？"
                    }
                    brainSubtitle={activeQuest ? "いま、やること" : "未着手"}
                    width={220}
                    height={265}
                  />
                </div>

                {/* Right Side: Active Task Card / Controls */}
                <div className="w-full sm:w-72 bg-white/90 dark:bg-stone-800/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-stone-200/80 dark:border-stone-700 shadow-sm flex flex-col justify-between gap-4 z-20">
                  {activeQuest ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            実行中
                          </span>
                          {slotLabel && (
                            <span className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {slotLabel}
                            </span>
                          )}
                        </div>

                        <div className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug break-words">
                          {activeQuest.questName}
                        </div>

                        {activeQuest.note && (
                          <div className="text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-900/50 p-2 rounded-lg">
                            {activeQuest.note}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons: ✓ 完了 / ⏸ 中断 */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 dark:border-stone-700">
                        <Button
                          onClick={handleComplete}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs gap-1.5 shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          完了
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handlePause}
                          className="border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-bold h-9 text-xs gap-1.5"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          中断
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3 text-center py-2">
                      <div className="text-xs font-bold text-stone-600 dark:text-stone-400">
                        実行中のミッションはありません
                      </div>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        下のプランニング（時間枠）のミッションの丸印を押して「RUNNING」にすると、ここに自動反映されます。
                      </p>

                      {/* Quick start uncompleted quest if available */}
                      {todayQuests.filter((q: any) => q.status !== "cleared" && q.status !== "failed").length > 0 && (
                        <div className="pt-2 border-t border-stone-100 dark:border-stone-700">
                          <span className="text-[10px] font-bold text-stone-400 block mb-1.5 text-left">
                            本日のミッションから選んで開始:
                          </span>
                          <div className="max-h-28 overflow-y-auto space-y-1 text-left">
                            {todayQuests
                              .filter((q: any) => q.status !== "cleared" && q.status !== "failed")
                              .slice(0, 4)
                              .map((q: any) => (
                                <button
                                  key={q.id}
                                  type="button"
                                  onClick={() => handleStartQuest(q.id)}
                                  className="w-full text-left p-1.5 text-xs rounded-lg hover:bg-amber-500/10 text-stone-700 dark:text-stone-300 truncate flex items-center justify-between group cursor-pointer transition-colors"
                                >
                                  <span className="truncate">{q.questName}</span>
                                  <Play className="w-3 h-3 text-amber-500 opacity-0 group-hover:opacity-100 shrink-0" />
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Floating "やらないこと" bubbles - Bottom / Mobile Row */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4 z-20 max-w-xl">
                {/* On mobile or additional items on desktop */}
                {notToDoList.map((item, idx) => (
                  <div
                    key={idx}
                    className={`md:hidden relative group px-3 py-1.5 rounded-full border shadow-xs backdrop-blur-xs text-xs font-bold flex items-center gap-1.5 transition-transform hover:scale-105 select-none ${
                      BUBBLE_STYLES[idx % BUBBLE_STYLES.length]
                    }`}
                  >
                    <span>🎈 {item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNotToDo(idx)}
                      className="text-stone-400 hover:text-red-500 transition-opacity ml-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Additional desktop bottom items (index 2+) */}
                <div className="hidden md:flex flex-wrap items-center justify-center gap-2">
                  {notToDoList.slice(2).map((item, idx) => (
                    <div
                      key={idx + 2}
                      className={`relative group px-3.5 py-2 rounded-full border shadow-xs backdrop-blur-xs text-xs font-bold flex items-center gap-1.5 transition-transform hover:scale-105 select-none ${
                        BUBBLE_STYLES[(idx + 2) % BUBBLE_STYLES.length]
                      }`}
                    >
                      <span>🎈 {item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveNotToDo(idx + 2)}
                        className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-opacity ml-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new "やらないこと" bubble button */}
                {isAddingNotToDo ? (
                  <div className="flex items-center gap-1.5 bg-white dark:bg-stone-800 p-1 rounded-full border border-amber-500/60 shadow-xs animate-fade-in">
                    <Input
                      value={newNotToDoText}
                      onChange={(e) => setNewNotToDoText(e.target.value)}
                      placeholder="例: スマホを見ない"
                      className="h-7 text-xs border-none focus-visible:ring-0 px-2.5 w-36"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddNotToDo();
                        if (e.key === "Escape") setIsAddingNotToDo(false);
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleAddNotToDo}
                      className="h-6 px-2 text-[11px] rounded-full bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold"
                    >
                      追加
                    </Button>
                    <button
                      type="button"
                      onClick={() => setIsAddingNotToDo(false)}
                      className="p-1 text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingNotToDo(true)}
                    className="px-3.5 py-1.5 rounded-full border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer bg-white/40 dark:bg-stone-800/40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>やらないことを書く</span>
                  </button>
                )}
              </div>

              {/* Subtitle Footer */}
              <div className="text-center mt-5 text-[11px] sm:text-xs text-stone-500 dark:text-stone-400">
                ほかの作業（やらないこと）は、いったん外に置いておく。
              </div>
            </div>
          ) : (
            /* MODE 2: CARD VIEW (通常カード詳細モード) */
            <div className="space-y-4">
              {activeQuest ? (
                <div className="p-4 sm:p-5 rounded-xl border border-amber-500/40 bg-white dark:bg-stone-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-500 text-stone-950">
                        ⚡ 実行中
                      </span>
                      {slotLabel && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          予定時間枠: {slotLabel}
                        </span>
                      )}
                      {activeQuest.projectName && (
                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 font-medium">
                          {activeQuest.projectName}
                        </span>
                      )}
                    </div>

                    <h4 className="text-lg sm:text-xl font-bold text-foreground leading-snug">
                      {activeQuest.questName}
                    </h4>

                    {activeQuest.note && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {activeQuest.note}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={handleComplete}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      完了にする
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handlePause}
                      className="border-stone-300 dark:border-stone-600 text-xs font-bold h-9 px-3 gap-1.5"
                    >
                      <Pause className="w-4 h-4" />
                      一時中断
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  現在「実行中（RUNNING）」のミッションはありません。時間枠のミッションから選んで開始してください。
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
