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
  Clock,
  ArrowLeft,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { ThinkingMoai, MoaiState } from "./ThinkingMoai";

interface ActiveMissionMoaiPanelProps {
  activeQuest: any | null;
  todayQuests: any[];
  templates: any[];
  onStatusChange: () => void;
  onBackToPlanning?: () => void;
}

const DEFAULT_NOT_TO_DO = [
  "スマホを見ない",
  "SNSを開かない",
  "他の調べ物は後で",
];

const NOT_TO_DO_KEY = "quest_log_not_to_do_items";

// Pastel translucent balloon themes with real bubble specular highlights
const BALLOON_THEMES = [
  {
    gradient: "from-sky-200/65 via-sky-100/40 to-blue-200/50 dark:from-sky-900/40 dark:via-sky-950/20 dark:to-blue-900/30",
    border: "border-sky-300/60 dark:border-sky-700/50",
    text: "text-sky-950 dark:text-sky-100",
    glow: "shadow-sky-400/20",
    floatAnim: "animate-float-1",
  },
  {
    gradient: "from-pink-200/65 via-rose-100/40 to-purple-200/50 dark:from-pink-900/40 dark:via-rose-950/20 dark:to-purple-900/30",
    border: "border-pink-300/60 dark:border-pink-700/50",
    text: "text-rose-950 dark:text-pink-100",
    glow: "shadow-pink-400/20",
    floatAnim: "animate-float-2",
  },
  {
    gradient: "from-amber-200/65 via-amber-100/40 to-orange-200/50 dark:from-amber-900/40 dark:via-amber-950/20 dark:to-orange-900/30",
    border: "border-amber-300/60 dark:border-amber-700/50",
    text: "text-amber-950 dark:text-amber-100",
    glow: "shadow-amber-400/20",
    floatAnim: "animate-float-3",
  },
  {
    gradient: "from-emerald-200/65 via-teal-100/40 to-emerald-200/50 dark:from-emerald-900/40 dark:via-teal-950/20 dark:to-emerald-900/30",
    border: "border-emerald-300/60 dark:border-emerald-700/50",
    text: "text-emerald-950 dark:text-emerald-100",
    glow: "shadow-emerald-400/20",
    floatAnim: "animate-float-1",
  },
  {
    gradient: "from-violet-200/65 via-purple-100/40 to-indigo-200/50 dark:from-violet-900/40 dark:via-purple-950/20 dark:to-indigo-900/30",
    border: "border-violet-300/60 dark:border-violet-700/50",
    text: "text-violet-950 dark:text-violet-100",
    glow: "shadow-violet-400/20",
    floatAnim: "animate-float-2",
  },
];

export function ActiveMissionMoaiPanel({
  activeQuest,
  todayQuests,
  templates,
  onStatusChange,
  onBackToPlanning,
}: ActiveMissionMoaiPanelProps) {
  const updateStatus = trpc.quest.updateStatus.useMutation();

  // Mode toggle between moai and card
  const [displayMode, setDisplayMode] = useState<"moai" | "card">("moai");

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
    toast.success("やらないことバルーンを浮かべました 🎈");
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
    if (window.navigator?.vibrate) window.navigator.vibrate([40, 60, 40]);

    try {
      await updateStatus.mutateAsync({
        questId: activeQuest.id,
        status: "cleared",
      });
      toast.success(`「${activeQuest.questName}」を完了しました！🎉✨`);
      setTimeout(() => {
        setTransientState(null);
        onStatusChange();
      }, 2200);
    } catch (e) {
      setTransientState(null);
      toast.error("ステータスの更新に失敗しました");
    }
  };

  const handlePause = async () => {
    if (!activeQuest) return;
    setTransientState("resting");
    if (window.navigator?.vibrate) window.navigator.vibrate(25);

    try {
      await updateStatus.mutateAsync({
        questId: activeQuest.id,
        status: "accepted",
      });
      toast.info("ミッションを一時中断しました（ひと休み 🍵）");
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

  // Parse time slot for display
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

  // Parse template & notes
  const activeQuestTemplate = templates?.find((t: any) => t.id === activeQuest?.templateId);
  const hasNote = Boolean(activeQuest?.note);
  const hasDesc = Boolean(activeQuestTemplate?.description && activeQuestTemplate.description !== activeQuest?.note);

  return (
    <div className="w-full rounded-3xl border border-stone-200/90 dark:border-stone-800 bg-gradient-to-b from-[#fefdfa] via-[#f7f5ee] to-[#ece7dc] dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 shadow-sm overflow-hidden transition-all duration-300">
      {/* Floating Keyframes Style */}
      <style>{`
        @keyframes floatGentle1 {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1.2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes floatGentle2 {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-13px) rotate(-1.5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes floatGentle3 {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        .animate-float-1 {
          animation: floatGentle1 5s ease-in-out infinite alternate;
        }
        .animate-float-2 {
          animation: floatGentle2 6.2s ease-in-out infinite alternate;
        }
        .animate-float-3 {
          animation: floatGentle3 4.6s ease-in-out infinite alternate;
        }
      `}</style>

      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-stone-200/70 dark:border-stone-800 bg-white/60 dark:bg-stone-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {onBackToPlanning && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToPlanning}
              className="h-8 px-2.5 rounded-xl text-stone-600 dark:text-stone-300 hover:text-stone-900 hover:bg-stone-200/60 dark:hover:bg-stone-800 gap-1.5 text-xs font-bold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>プランニングに戻る</span>
            </Button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-base">🗿</span>
            <span className="text-xs sm:text-sm font-black text-stone-800 dark:text-stone-100 tracking-tight">
              {activeQuest ? "集中モード (RUNNING)" : "集中待機室"}
            </span>
            {activeQuest && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 animate-pulse">
                ⚡ 実行中
              </span>
            )}
          </div>
        </div>

        {/* Display Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-stone-200/80 dark:bg-stone-800 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setDisplayMode("moai")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                displayMode === "moai"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs font-black"
                  : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              <span>🗿 モアイ脳内</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("card")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                displayMode === "card"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs font-black"
                  : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              <span>📋 詳細カード</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Focus Area */}
      <div className="p-4 sm:p-8">
        {displayMode === "moai" ? (
          /* ========================================================= */
          /* MODE 1: BEAUTIFUL MOAI & FLOATING BALLOONS FOCUS ROOM     */
          /* ========================================================= */
          <div className="flex flex-col items-center justify-center">
            {/* Ambient Headline */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-bold mb-2">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>いま、この瞬間に集中する</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-stone-800 dark:text-stone-100 tracking-tight">
                {activeQuest ? "モアイの脳内は、このタスクだけ。" : "何から始めよう？"}
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
                周りに浮かぶバルーンは「やらないこと」。頭の外に逃がして、目の前のことだけに専念しよう。
              </p>
            </div>

            {/* Stage: Left Balloons | Central Moai | Right Action Card */}
            <div className="relative w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-8 sm:gap-12 my-2">
              {/* LEFT SIDE: Floating "やらないこと" Balloon Bubbles (Desktop) */}
              <div className="hidden lg:flex flex-col gap-5 items-end justify-center w-64 shrink-0 pointer-events-auto">
                {notToDoList.slice(0, 3).map((item, idx) => {
                  const theme = BALLOON_THEMES[idx % BALLOON_THEMES.length];
                  return (
                    <div
                      key={idx}
                      className={`relative group w-28 h-28 xl:w-32 xl:h-32 aspect-square rounded-full flex flex-col items-center justify-center p-3.5 select-none backdrop-blur-md bg-gradient-to-br ${theme.gradient} border ${theme.border} shadow-lg ${theme.glow} ${theme.floatAnim} transition-all duration-300 hover:scale-105`}
                      style={{
                        marginRight: idx === 1 ? "18px" : "0px",
                      }}
                    >
                      {/* Specular White Glare Spot (Soap Bubble / Balloon reflection) */}
                      <div className="absolute top-2.5 left-3.5 xl:top-3 xl:left-4 w-7 h-3 rounded-full bg-white/70 dark:bg-white/40 blur-[0.4px] -rotate-40 pointer-events-none" />
                      <div className="absolute bottom-2.5 right-3.5 w-3.5 h-2 rounded-full bg-white/25 dark:bg-white/10 blur-[0.5px] pointer-events-none" />

                      {/* Dismiss / Pop Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveNotToDo(idx)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-white/90 dark:bg-stone-800 text-stone-400 hover:text-red-500 p-1 rounded-full shadow-xs transition-opacity cursor-pointer z-20"
                        title="このバルーンを割る"
                      >
                        <X className="w-3 h-3" />
                      </button>

                      {/* Balloon Content */}
                      <span className="text-[10px] uppercase font-extrabold tracking-wider opacity-60 mb-0.5 pointer-events-none">
                        やらない
                      </span>
                      <span
                        className={`text-xs xl:text-[13px] font-bold leading-snug text-center line-clamp-3 break-words ${theme.text}`}
                      >
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* CENTER: The Thinking Moai (Plenty of breathing clearance) */}
              <div className="relative shrink-0 z-10 px-4">
                <ThinkingMoai
                  state={effectiveMoaiState}
                  brainText={
                    transientState === "completed"
                      ? "ミッション達成！"
                      : transientState === "resting"
                      ? "ひと休み中"
                      : activeQuest
                      ? activeQuest.questName
                      : "何からやろう？"
                  }
                  brainSubtitle={
                    transientState === "completed"
                      ? "CLEAR ✨"
                      : transientState === "resting"
                      ? "REST 🍵"
                      : activeQuest
                      ? "いま、やること"
                      : "待機中"
                  }
                  width={260}
                  height={300}
                />
              </div>

              {/* RIGHT SIDE: Active Mission Card / Controls */}
              <div className="w-full sm:w-80 lg:w-76 xl:w-80 bg-white/95 dark:bg-stone-800/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-stone-200/90 dark:border-stone-700 shadow-md flex flex-col justify-between gap-5 z-20">
                {activeQuest ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/80">
                          ⚡ 実行中
                        </span>
                        {slotLabel && (
                          <span className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1 font-mono font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {slotLabel}
                          </span>
                        )}
                      </div>

                      {activeQuest.projectName && (
                        <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                          📁 {activeQuest.projectName}
                        </div>
                      )}

                      <h4 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 leading-snug break-words">
                        {activeQuest.questName}
                      </h4>

                      {/* Clean, spacious note & description display */}
                      {(hasNote || hasDesc) && (
                        <div className="w-full text-xs sm:text-sm text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-900/60 p-3.5 rounded-2xl border border-stone-200/60 dark:border-stone-700/60 whitespace-pre-wrap break-words leading-relaxed">
                          <span className="font-bold text-[10px] text-stone-400 block mb-1">備考 / メモ:</span>
                          {hasNote && <div>{activeQuest.note}</div>}
                          {hasDesc && (
                            <div className={`text-xs text-stone-500 dark:text-stone-400 ${hasNote ? 'mt-2 pt-2 border-t border-stone-200/50 dark:border-stone-700/50' : ''}`}>
                              {activeQuestTemplate?.description}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Complete & Pause Buttons */}
                    <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-stone-100 dark:border-stone-700/80">
                      <Button
                        onClick={handleComplete}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-10 rounded-xl text-xs gap-1.5 shadow-sm hover:scale-[1.02] transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        できた！(完了)
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handlePause}
                        className="border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-bold h-10 rounded-xl text-xs gap-1.5"
                      >
                        <Pause className="w-4 h-4" />
                        ひと休み(中断)
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 py-2">
                    <div className="text-center space-y-1">
                      <div className="text-sm font-bold text-stone-700 dark:text-stone-300">
                        実行中のミッションはありません
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                        下のリストからミッションを選んで開始すると、モアイの脳内にセットされます。
                      </p>
                    </div>

                    {/* List of today's accepted quests for quick start */}
                    {todayQuests.filter((q: any) => q.status !== "cleared" && q.status !== "failed").length > 0 ? (
                      <div className="pt-2 border-t border-stone-100 dark:border-stone-700/80">
                        <span className="text-[11px] font-bold text-stone-400 block mb-2">
                          本日のミッションから選んで開始:
                        </span>
                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                          {todayQuests
                            .filter((q: any) => q.status !== "cleared" && q.status !== "failed")
                            .slice(0, 5)
                            .map((q: any) => (
                              <button
                                key={q.id}
                                type="button"
                                onClick={() => handleStartQuest(q.id)}
                                className="w-full text-left p-2 rounded-xl hover:bg-amber-500/15 border border-transparent hover:border-amber-500/30 text-stone-800 dark:text-stone-200 text-xs font-bold flex items-center justify-between group cursor-pointer transition-all"
                              >
                                <span className="truncate mr-2">{q.questName}</span>
                                <div className="flex items-center gap-1 shrink-0 text-amber-600 dark:text-amber-400 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span>開始</span>
                                  <Play className="w-3 h-3 fill-current" />
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center pt-2">
                        {onBackToPlanning && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onBackToPlanning}
                            className="rounded-xl text-xs font-bold"
                          >
                            プランニングでミッションを追加
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* BOTTOM AREA: Remaining Balloons & Add New Balloon (Responsive for all screens) */}
            <div className="mt-8 w-full max-w-3xl flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {/* On mobile: display all balloons here */}
              <div className="flex lg:hidden flex-wrap items-center justify-center gap-3">
                {notToDoList.map((item, idx) => {
                  const theme = BALLOON_THEMES[idx % BALLOON_THEMES.length];
                  return (
                    <div
                      key={idx}
                      className={`relative group w-24 h-24 sm:w-28 sm:h-28 aspect-square rounded-full flex flex-col items-center justify-center p-3 select-none backdrop-blur-md bg-gradient-to-br ${theme.gradient} border ${theme.border} shadow-md ${theme.glow} ${theme.floatAnim}`}
                    >
                      <div className="absolute top-2 left-3 w-5 h-2 rounded-full bg-white/70 dark:bg-white/40 blur-[0.4px] -rotate-40 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => handleRemoveNotToDo(idx)}
                        className="absolute top-1 right-1 bg-white/90 dark:bg-stone-800 text-stone-400 hover:text-red-500 p-1 rounded-full shadow-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="text-[9px] uppercase font-bold opacity-60 mb-0.5">やらない</span>
                      <span className={`text-[11px] sm:text-xs font-bold leading-tight text-center line-clamp-2 break-words ${theme.text}`}>
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* On Desktop: display balloons beyond index 2 */}
              <div className="hidden lg:flex flex-wrap items-center justify-center gap-4">
                {notToDoList.slice(3).map((item, idx) => {
                  const theme = BALLOON_THEMES[(idx + 3) % BALLOON_THEMES.length];
                  return (
                    <div
                      key={idx + 3}
                      className={`relative group w-28 h-28 xl:w-32 xl:h-32 aspect-square rounded-full flex flex-col items-center justify-center p-3.5 select-none backdrop-blur-md bg-gradient-to-br ${theme.gradient} border ${theme.border} shadow-lg ${theme.glow} ${theme.floatAnim} transition-all duration-300 hover:scale-105`}
                    >
                      <div className="absolute top-2.5 left-3.5 w-7 h-3 rounded-full bg-white/70 dark:bg-white/40 blur-[0.4px] -rotate-40 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => handleRemoveNotToDo(idx + 3)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-white/90 dark:bg-stone-800 text-stone-400 hover:text-red-500 p-1 rounded-full shadow-xs transition-opacity cursor-pointer z-20"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] uppercase font-extrabold tracking-wider opacity-60 mb-0.5">
                        やらない
                      </span>
                      <span className={`text-xs font-bold leading-snug text-center line-clamp-3 break-words ${theme.text}`}>
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Add New Balloon Circular Button */}
              {isAddingNotToDo ? (
                <div className="w-32 sm:w-36 h-32 sm:h-36 aspect-square rounded-full border-2 border-amber-400 bg-white dark:bg-stone-800 shadow-lg flex flex-col items-center justify-center p-3 animate-fade-in z-20">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-1">
                    やらないこと追加
                  </span>
                  <Input
                    value={newNotToDoText}
                    onChange={(e) => setNewNotToDoText(e.target.value)}
                    placeholder="例: スマホ見ない"
                    className="h-7 text-xs text-center border-stone-200 dark:border-stone-700 px-1 w-28"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddNotToDo();
                      if (e.key === "Escape") setIsAddingNotToDo(false);
                    }}
                  />
                  <div className="flex items-center gap-1 mt-2">
                    <Button
                      size="sm"
                      onClick={handleAddNotToDo}
                      className="h-6 px-2.5 text-[10px] rounded-full bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold"
                    >
                      浮かべる
                    </Button>
                    <button
                      type="button"
                      onClick={() => setIsAddingNotToDo(false)}
                      className="p-1 text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingNotToDo(true)}
                  className="w-24 h-24 sm:w-28 sm:h-28 xl:w-32 xl:h-32 aspect-square rounded-full border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-stone-500 hover:text-amber-800 dark:hover:text-amber-300 flex flex-col items-center justify-center p-3 transition-all cursor-pointer group"
                >
                  <Plus className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform text-amber-500" />
                  <span className="text-[11px] sm:text-xs font-bold text-center leading-tight">
                    やらないことを
                    <br />
                    書く
                  </span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* MODE 2: DETAILED CARD MODE                                */
          /* ========================================================= */
          <div className="space-y-4 max-w-3xl mx-auto py-4">
            {activeQuest ? (
              <div className="p-6 rounded-2xl border border-amber-500/40 bg-white dark:bg-stone-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-500 text-stone-950">
                      ⚡ 実行中 (RUNNING)
                    </span>
                    {slotLabel && (
                      <span className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1 font-mono font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        予定時間枠: {slotLabel}
                      </span>
                    )}
                    {activeQuest.projectName && (
                      <span className="text-xs px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 font-semibold">
                        {activeQuest.projectName}
                      </span>
                    )}
                  </div>

                  <h4 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 leading-snug break-words">
                    {activeQuest.questName}
                  </h4>

                  {/* Clean, spacious note & description display */}
                  {(hasNote || hasDesc) && (
                    <div className="w-full text-xs sm:text-sm text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-900/60 p-3.5 rounded-xl whitespace-pre-wrap break-words leading-relaxed border border-stone-200/60 dark:border-stone-700/60">
                      <span className="font-bold text-[10px] text-stone-400 block mb-1">備考 / メモ:</span>
                      {hasNote && <div>{activeQuest.note}</div>}
                      {hasDesc && (
                        <div className={`text-xs text-stone-500 dark:text-stone-400 ${hasNote ? 'mt-2 pt-2 border-t border-stone-200/50 dark:border-stone-700/50' : ''}`}>
                          {activeQuestTemplate?.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Button
                    onClick={handleComplete}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-10 px-5 rounded-xl gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    完了にする
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePause}
                    className="border-stone-300 dark:border-stone-600 text-xs font-bold h-10 px-4 rounded-xl gap-1.5"
                  >
                    <Pause className="w-4 h-4" />
                    一時中断
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-2xl bg-stone-50/50 dark:bg-stone-900/30">
                現在「実行中（RUNNING）」のミッションはありません。プランニングの時間枠からミッションを開始してください。
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
