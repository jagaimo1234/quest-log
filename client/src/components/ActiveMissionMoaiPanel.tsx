import React, { useState, useEffect, useRef } from "react";
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
  RotateCcw,
  Volume2,
  Bell,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { ThinkingMoai, MoaiState } from "./ThinkingMoai";
import {
  MoaiCylinderGauge,
  MoaiAuraCanvas,
  YogurtPotionButton,
  getMpRhythmByHour,
  getCurrentTimeHour,
} from "./MoaiMpFlameGauge";

// Clear, pleasant chime using Web Audio API (no external file needed)
function playTimerCompleteSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Pleasant two-tone chime (E5 -> G#5 -> B5 major triad arpeggio)
    const notes = [659.25, 830.61, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.85);
    });
  } catch (e) {
    // Audio might be blocked if no user interaction yet, ignore
  }
}

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

  // MP Energy state (CODEX flame & rhythm based on current time + potion bonuses)
  const [baseMp] = useState<number>(() => getMpRhythmByHour(getCurrentTimeHour()));
  const [mpBonus, setMpBonus] = useState<number>(0);
  const [currentEnergy, setCurrentEnergy] = useState<number>(() => getMpRhythmByHour(getCurrentTimeHour()));
  const [recoveryAge, setRecoveryAge] = useState<number>(10);
  const [isRecovering, setIsRecovering] = useState<boolean>(false);

  // Target energy clamped between 0 and 100
  const targetEnergy = Math.min(100, Math.max(0, baseMp + mpBonus));

  // Smooth exponential interpolation for energy value + recovery age ticker
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      setCurrentEnergy((prev) => {
        const diff = targetEnergy - prev;
        if (Math.abs(diff) < 0.05) return targetEnergy;
        return prev + diff * (1 - Math.exp(-dt * 3.5));
      });

      setRecoveryAge((prev) => {
        if (prev < 2.5) return prev + dt;
        return prev;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [targetEnergy]);

  const handleYogurtRecovery = () => {
    if (currentEnergy >= 100) return;
    setMpBonus((prev) => Math.min(100 - baseMp, prev + 30));
    setRecoveryAge(0);
    setIsRecovering(true);
    playTimerCompleteSound();
    toast.success("ヨーグルトでMPが30回復しました！✨🥛");
    setTimeout(() => {
      setIsRecovering(false);
    }, 2400);
  };

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

  const updateQuest = trpc.quest.update.useMutation();

  // ------------------------------------------------------------------
  // FOCUS TIMER STATE (サーバー同期型集中フォーカスタイマー)
  // ------------------------------------------------------------------
  // DBの activeQuest (timerDuration, timerStartedAt, timerSecondsLeft) を真実のソースとして同期
  const TIMER_STORAGE_KEY = "quest_log_focus_timer_duration";
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(TIMER_STORAGE_KEY);
      if (saved) return Number(saved) || 30;
    } catch {}
    return 30;
  });

  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(30 * 60);
  const [timerTotalSeconds, setTimerTotalSeconds] = useState<number>(30 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isCustomInputOpen, setIsCustomInputOpen] = useState<boolean>(false);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>("");

  // activeQuest のDB状態から現在残り秒数と動作状態をリアルタイム計算して同期
  useEffect(() => {
    if (!activeQuest) {
      setIsTimerRunning(false);
      const total = selectedDurationMinutes * 60;
      setTimerTotalSeconds(total);
      setTimerSecondsLeft(total);
      return;
    }

    const durationMins = activeQuest.timerDuration || selectedDurationMinutes;
    setSelectedDurationMinutes(durationMins);
    const totalSecs = durationMins * 60;
    setTimerTotalSeconds(totalSecs);

    if (activeQuest.timerStartedAt) {
      // 進行中：開始時刻からの経過時間をミリ秒単位で計算
      const startedTime = new Date(activeQuest.timerStartedAt).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor(Math.max(0, now - startedTime) / 1000);
      const remaining = Math.max(0, totalSecs - elapsedSeconds);
      setTimerSecondsLeft(remaining);
      setIsTimerRunning(remaining > 0);
    } else if (activeQuest.timerSecondsLeft !== undefined && activeQuest.timerSecondsLeft !== null) {
      // 一時停止中
      setTimerSecondsLeft(activeQuest.timerSecondsLeft);
      setIsTimerRunning(false);
    } else {
      // まだタイマー未設定または新規開始：自動開始
      const now = new Date();
      setTimerSecondsLeft(totalSecs);
      setIsTimerRunning(true);
      // DBに開始時刻を保存（他端末・リロードでも同一基準）
      updateQuest.mutate({
        questId: activeQuest.id,
        timerDuration: durationMins,
        timerStartedAt: now,
        timerSecondsLeft: null,
      });
    }
  }, [activeQuest?.id, activeQuest?.timerStartedAt, activeQuest?.timerSecondsLeft, activeQuest?.timerDuration]);

  // ローカル側での1秒刻みカウントダウン＆0秒判定
  useEffect(() => {
    if (!isTimerRunning || !activeQuest) return;

    const interval = setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsTimerRunning(false);
          // Play sound and notification
          playTimerCompleteSound();
          if (window.navigator?.vibrate) window.navigator.vibrate([100, 80, 100]);
          toast.success("⏳ 集中タイマーが終了しました！お疲れ様でした🍵✨", {
            duration: 6000,
          });
          // DBに残り0秒として一時停止保存
          if (activeQuest) {
            updateQuest.mutate({
              questId: activeQuest.id,
              timerStartedAt: null,
              timerSecondsLeft: 0,
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, activeQuest?.id]);

  // Set Preset Duration (DB同期)
  const handleSelectPreset = (minutes: number) => {
    setSelectedDurationMinutes(minutes);
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, String(minutes));
    } catch {}

    const total = minutes * 60;
    setTimerTotalSeconds(total);
    setTimerSecondsLeft(total);
    setIsTimerRunning(true);
    setIsCustomInputOpen(false);

    if (activeQuest) {
      updateQuest.mutate({
        questId: activeQuest.id,
        timerDuration: minutes,
        timerStartedAt: new Date(),
        timerSecondsLeft: null,
      }, {
        onSuccess: () => onStatusChange()
      });
    }
    toast.info(`タイマーを ${minutes} 分にセットしました ⏱️`);
  };

  // Set Custom Duration (DB同期)
  const handleApplyCustomMinutes = () => {
    const mins = parseInt(customMinutesInput, 10);
    if (!mins || mins <= 0 || mins > 300) {
      toast.error("1〜300分の間で入力してください");
      return;
    }
    handleSelectPreset(mins);
    setCustomMinutesInput("");
    setIsCustomInputOpen(false);
  };

  // 一時停止 / 再開の切り替え (DB同期)
  const handleToggleTimerRunning = () => {
    if (!activeQuest) return;

    if (isTimerRunning) {
      // 一時停止する
      setIsTimerRunning(false);
      updateQuest.mutate({
        questId: activeQuest.id,
        timerStartedAt: null,
        timerSecondsLeft: timerSecondsLeft,
      }, {
        onSuccess: () => onStatusChange()
      });
    } else {
      // 再開する：現在残っている timerSecondsLeft 分を今から逆算
      const now = Date.now();
      // startedAt を (現在 - (トータル - 残り)) と見なして再設定
      const artificialStartTime = new Date(now - (timerTotalSeconds - timerSecondsLeft) * 1000);
      setIsTimerRunning(true);
      updateQuest.mutate({
        questId: activeQuest.id,
        timerStartedAt: artificialStartTime,
        timerSecondsLeft: null,
      }, {
        onSuccess: () => onStatusChange()
      });
    }
  };

  // Add 5 minutes extension (DB同期)
  const handleAddFiveMinutes = () => {
    const newSecondsLeft = timerSecondsLeft + 5 * 60;
    const newTotal = Math.max(timerTotalSeconds, newSecondsLeft);
    setTimerSecondsLeft(newSecondsLeft);
    setTimerTotalSeconds(newTotal);
    setIsTimerRunning(true);

    if (activeQuest) {
      const now = Date.now();
      const artificialStartTime = new Date(now - (newTotal - newSecondsLeft) * 1000);
      const newDurationMins = Math.ceil(newTotal / 60);
      setSelectedDurationMinutes(newDurationMins);
      updateQuest.mutate({
        questId: activeQuest.id,
        timerDuration: newDurationMins,
        timerStartedAt: artificialStartTime,
        timerSecondsLeft: null,
      }, {
        onSuccess: () => onStatusChange()
      });
    }
    toast.success("+5分 延長しました ⚡");
  };

  // Reset timer (DB同期)
  const handleResetTimer = () => {
    const total = selectedDurationMinutes * 60;
    setTimerTotalSeconds(total);
    setTimerSecondsLeft(total);
    setIsTimerRunning(false);

    if (activeQuest) {
      updateQuest.mutate({
        questId: activeQuest.id,
        timerDuration: selectedDurationMinutes,
        timerStartedAt: null,
        timerSecondsLeft: total,
      }, {
        onSuccess: () => onStatusChange()
      });
    }
  };

  // Format time MM:SS
  const formatTimerDisplay = (secLeft: number) => {
    const m = Math.floor(secLeft / 60);
    const s = secLeft % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Progress percentage (0% = finished, 100% = start)
  const timerProgress = timerTotalSeconds > 0
    ? Math.max(0, Math.min(100, (timerSecondsLeft / timerTotalSeconds) * 100))
    : 0;

  // Actions
  const handleComplete = async () => {
    if (!activeQuest) return;
    setIsTimerRunning(false);
    setTransientState("completed");
    if (window.navigator?.vibrate) window.navigator.vibrate([40, 60, 40]);

    try {
      await updateStatus.mutateAsync({
        questId: activeQuest.id,
        status: "cleared",
      });
      // タイマーリセット
      await updateQuest.mutateAsync({
        questId: activeQuest.id,
        timerStartedAt: null,
        timerSecondsLeft: null,
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
    setIsTimerRunning(false);
    setTransientState("resting");
    if (window.navigator?.vibrate) window.navigator.vibrate(25);

    try {
      await updateStatus.mutateAsync({
        questId: activeQuest.id,
        status: "accepted",
      });
      // 一時中断時はタイマー状態を保持
      await updateQuest.mutateAsync({
        questId: activeQuest.id,
        timerStartedAt: null,
        timerSecondsLeft: timerSecondsLeft,
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
      // 集中タイマーをDB基準で即時発動
      const total = selectedDurationMinutes * 60;
      setTimerTotalSeconds(total);
      setTimerSecondsLeft(total);
      setIsTimerRunning(true);
      await updateQuest.mutateAsync({
        questId,
        timerDuration: selectedDurationMinutes,
        timerStartedAt: new Date(),
        timerSecondsLeft: null,
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

              {/* CENTER: The Thinking Moai (with Living Flame Aura & Yogurt Potion) */}
              <div className="relative shrink-0 z-10 flex flex-col items-center">
                <div className="relative px-2 flex items-center justify-center">
                  {/* Living Flame Aura Canvas (CODEX algorithm) Behind Moai */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10 overflow-visible">
                    <MoaiAuraCanvas energy={currentEnergy} className="scale-110 sm:scale-125" />
                  </div>

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
                        ? (isTimerRunning || timerSecondsLeft > 0)
                          ? `⏱️ ${formatTimerDisplay(timerSecondsLeft)} 集中`
                          : "いま、やること"
                        : "待機中"
                    }
                    width={260}
                    height={300}
                  />
                </div>

                {/* YOGURT POTION (足元の回復アイテム) */}
                <div className="relative -mt-4 z-20">
                  <YogurtPotionButton
                    onRecover={handleYogurtRecovery}
                    isRecovering={isRecovering}
                    disabled={currentEnergy >= 100}
                  />
                </div>
              </div>

              {/* MP CYLINDER GAUGE (モアイ右脇: ゲーム風縦型エネルギーシリンダー) */}
              <div className="flex flex-col items-center justify-center shrink-0 z-20">
                <div className="relative">
                  <MoaiCylinderGauge energy={currentEnergy} recoveryAge={recoveryAge} />
                  {isRecovering && (
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 pointer-events-none z-30 font-mono text-base font-black text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-bounce">
                      +30
                    </div>
                  )}
                </div>
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

                      {/* ---------------------------------------------------- */}
                      {/* FOCUS TIMER SECTION (優れた集中タイマーUI)            */}
                      {/* ---------------------------------------------------- */}
                      <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-stone-50/90 to-stone-100/90 dark:from-stone-900/90 dark:to-stone-950/90 border border-stone-200/80 dark:border-stone-700/70 shadow-inner flex flex-col gap-3">
                        {/* Timer Header & Presets */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300 text-xs font-black">
                            <Timer className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                            <span>集中タイマー</span>
                          </div>
                          
                          {/* Presets: 15, 30, 60, Custom */}
                          <div className="flex items-center gap-1 bg-stone-200/70 dark:bg-stone-800/80 p-0.5 rounded-xl text-[10.5px] font-bold">
                            {[15, 30, 60].map((mins) => {
                              const isSelected = selectedDurationMinutes === mins && !isCustomInputOpen;
                              return (
                                <button
                                  key={mins}
                                  type="button"
                                  onClick={() => handleSelectPreset(mins)}
                                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-amber-500 text-stone-950 font-black shadow-2xs scale-105"
                                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                                  }`}
                                  title={`${mins}分にセットして開始`}
                                >
                                  {mins}分
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => setIsCustomInputOpen((prev) => !prev)}
                              className={`px-1.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                                isCustomInputOpen || ![15, 30, 60].includes(selectedDurationMinutes)
                                  ? "bg-amber-500 text-stone-950 font-black shadow-2xs"
                                  : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
                              }`}
                              title="任意のタイマー分数を設定"
                            >
                              設定
                            </button>
                          </div>
                        </div>

                        {/* Inline Custom Minutes Input */}
                        {isCustomInputOpen && (
                          <div className="flex items-center gap-1.5 p-2 bg-white dark:bg-stone-800 rounded-xl border border-amber-500/40 shadow-xs animate-in fade-in-50 duration-200">
                            <span className="text-[11px] font-bold text-stone-500 pl-1">分数:</span>
                            <Input
                              type="number"
                              min={1}
                              max={300}
                              placeholder="例: 25, 45"
                              value={customMinutesInput}
                              onChange={(e) => setCustomMinutesInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleApplyCustomMinutes();
                                if (e.key === "Escape") setIsCustomInputOpen(false);
                              }}
                              className="h-6 text-xs w-20 text-center font-mono font-bold"
                              autoFocus
                            />
                            <span className="text-[11px] text-stone-500 font-bold">分</span>
                            <Button
                              size="sm"
                              onClick={handleApplyCustomMinutes}
                              className="h-6 px-2 text-[10px] bg-amber-500 hover:bg-amber-600 text-stone-950 font-black rounded-lg ml-auto"
                            >
                              適用
                            </Button>
                          </div>
                        )}

                        {/* Big Digital Countdown & Controls */}
                        <div className="flex items-center justify-between gap-3 pt-1">
                          <div className="flex flex-col">
                            <div className="flex items-baseline gap-1.5">
                              <span className={`font-mono text-3xl sm:text-4xl font-black tracking-tight drop-shadow-xs transition-colors ${
                                timerSecondsLeft === 0
                                  ? "text-red-500 animate-bounce"
                                  : timerSecondsLeft < 180
                                  ? "text-rose-600 dark:text-rose-400"
                                  : isTimerRunning
                                  ? "text-stone-900 dark:text-stone-50"
                                  : "text-stone-400 dark:text-stone-500"
                              }`}>
                                {formatTimerDisplay(timerSecondsLeft)}
                              </span>
                              {timerSecondsLeft === 0 && (
                                <span className="text-xs font-black px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                                  FINISH!
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-stone-400 font-bold">
                              {isTimerRunning ? "集中カウントダウン中 ⚡" : timerSecondsLeft === 0 ? "お疲れ様でした！" : "タイマー一時停止中"}
                            </span>
                          </div>

                          {/* Quick Controls: Play/Pause, +5m, Reset */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              onClick={handleToggleTimerRunning}
                              className={`h-9 px-3 rounded-xl font-black text-xs gap-1 shadow-sm transition-all active:scale-95 ${
                                isTimerRunning
                                  ? "bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/60 dark:hover:bg-amber-900 dark:text-amber-200 border border-amber-300/60"
                                  : "bg-amber-500 hover:bg-amber-600 text-stone-950 font-black"
                              }`}
                              title={isTimerRunning ? "一時停止" : "タイマー開始"}
                            >
                              {isTimerRunning ? (
                                <>
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                  <span>停止</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>開始</span>
                                </>
                              )}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleAddFiveMinutes}
                              className="h-9 px-2 text-[10.5px] font-black rounded-xl border-stone-300 dark:border-stone-700 hover:bg-stone-200/60 dark:hover:bg-stone-800"
                              title="残り時間を5分延長"
                            >
                              +5分
                            </Button>

                            <button
                              type="button"
                              onClick={handleResetTimer}
                              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-all cursor-pointer"
                              title="タイマーをリセット"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar Gauge */}
                        <div className="w-full bg-stone-200/80 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 rounded-full ${
                              timerSecondsLeft < 180
                                ? "bg-rose-500"
                                : "bg-gradient-to-r from-amber-500 to-emerald-400"
                            }`}
                            style={{ width: `${timerProgress}%` }}
                          />
                        </div>
                      </div>
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
                  {/* Focus Timer in Card Mode */}
                  <div className="mt-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-700/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-stone-600 dark:text-stone-300">
                        <Timer className="w-3.5 h-3.5 text-amber-500" />
                        <span>タイマー:</span>
                      </div>
                      <span className={`font-mono text-xl font-black ${
                        timerSecondsLeft === 0
                          ? "text-red-500"
                          : timerSecondsLeft < 180
                          ? "text-rose-500"
                          : isTimerRunning
                          ? "text-stone-900 dark:text-stone-100"
                          : "text-stone-400"
                      }`}>
                        {formatTimerDisplay(timerSecondsLeft)}
                      </span>
                      <div className="flex items-center gap-1 bg-stone-200/60 dark:bg-stone-800 rounded-lg p-0.5 text-[10px]">
                        {[15, 30, 60].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => handleSelectPreset(mins)}
                            className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                              selectedDurationMinutes === mins
                                ? "bg-amber-500 text-stone-950"
                                : "text-stone-600 dark:text-stone-400"
                            }`}
                          >
                            {mins}分
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        onClick={handleToggleTimerRunning}
                        className={`h-7 px-2.5 rounded-lg text-xs font-black ${
                          isTimerRunning
                            ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                            : "bg-amber-500 hover:bg-amber-600 text-stone-950"
                        }`}
                      >
                        {isTimerRunning ? "停止" : "開始"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddFiveMinutes}
                        className="h-7 px-2 text-[10px] rounded-lg"
                      >
                        +5分
                      </Button>
                      <button
                        type="button"
                        onClick={handleResetTimer}
                        className="p-1 text-stone-400 hover:text-stone-600"
                        title="リセット"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
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
