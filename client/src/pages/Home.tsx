import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import { Loader2, Plus, Flame, CheckCircle2, Circle, XCircle, Pencil, LayoutGrid, Calendar as CalendarIcon, Trash2, ArrowRight, PlayCircle, Folder, GripVertical, Database, History, MessageSquarePlus, ChevronLeft, ChevronRight, Lightbulb, Activity, CornerDownRight, Heart, Maximize2, ChevronUp, ChevronDown, Clock, ArrowLeftToLine, ArrowRightToLine, Check, Film } from "lucide-react";
import { toast } from "sonner";
import { CalendarView } from "@/components/CalendarView";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter, isBefore, isEqual, parseISO, isWithinInterval } from "date-fns";
import { BonfireDiary } from "@/components/BonfireDiary";
import { ImageAttachmentArea, ImageAttachmentAreaRef } from "@/components/ImageAttachmentArea";
import { RichDocEditor } from "@/components/RichDocEditor";
import { ActiveMissionMoaiPanel } from "@/components/ActiveMissionMoaiPanel";
import { MoaiDashboard } from "@/components/MoaiDashboard";
import { MovieStockDialog } from "@/components/MovieStockDialog";

const QUEST_TYPE_LABELS: Record<string, string> = {
  Daily: "D",
  Weekly: "W",
  Monthly: "M",
  Yearly: "Y",
  Free: "F",
  Project: "P",
  Relax: "R",
};

const SHORT_WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const SHORT_WEEKS = ["第1週", "第2週", "第3週", "第4週", "第5週"];

// Custom UI Color Theme System (Persisted in localStorage)
interface CustomUiColors {
  pageBg: string;
  goalBg: string;
  goalText: string;
  bulletinBg: string;
  bulletinText: string;
  glassBg: string;
}

const UI_COLORS_STORAGE_KEY = "questlog_ui_colors_v1";
const UI_COLORS_EVENT = "questlog-ui-colors-changed";

const DEFAULT_UI_COLORS: CustomUiColors = {
  pageBg: "#F4F6FA",
  goalBg: "#F2FDF7",
  goalText: "#0F291E",
  bulletinBg: "#FFFDF7",
  bulletinText: "#1C1917",
  glassBg: "#FFFFFF",
};

const UI_COLOR_PRESETS: { id: string; label: string; desc: string; colors: CustomUiColors }[] = [
  {
    id: "standard",
    label: "🌿 標準（ミント＆生成り）",
    desc: "目標は爽やかなミント、掲示板は温かみのある生成り",
    colors: DEFAULT_UI_COLORS,
  },
  {
    id: "pure-white",
    label: "☀️ ピュアホワイト（くっきり高視認性）",
    desc: "純白の背景に漆黒の文字でコントラストを最大化",
    colors: {
      pageBg: "#EEF2F6",
      goalBg: "#FFFFFF",
      goalText: "#0F172A",
      bulletinBg: "#FFFFFF",
      bulletinText: "#0F172A",
      glassBg: "#FFFFFF",
    },
  },
  {
    id: "warm-paper",
    label: "📜 ウォームペーパー（目に優しいノート）",
    desc: "上質な紙のようなクリーム色で長時間の作業でも疲れにくい",
    colors: {
      pageBg: "#F5F2EB",
      goalBg: "#FCF9F2",
      goalText: "#1C1917",
      bulletinBg: "#FFFBF2",
      bulletinText: "#1C1917",
      glassBg: "#FDFBF7",
    },
  },
  {
    id: "cool-sky",
    label: "💠 クールスカイ（澄んだブルー）",
    desc: "透明感のあるスカイブルー基調で頭が冴える配色",
    colors: {
      pageBg: "#EAF2FA",
      goalBg: "#F0F9FF",
      goalText: "#0C4A6E",
      bulletinBg: "#F8FAFC",
      bulletinText: "#0F172A",
      glassBg: "#FFFFFF",
    },
  },
  {
    id: "sakura",
    label: "🌸 サクラブロッサム（華やかピンク）",
    desc: "明るく優しい桜色トーンで気分が上がる配色",
    colors: {
      pageBg: "#FDF2F6",
      goalBg: "#FFF5F7",
      goalText: "#4C0519",
      bulletinBg: "#FFFAFC",
      bulletinText: "#1C1917",
      glassBg: "#FFFFFF",
    },
  },
  {
    id: "dark-slate",
    label: "🌙 ダークガラス（夜モード）",
    desc: "深いネイビー背景に白文字で夜間の眩しさを軽減",
    colors: {
      pageBg: "#0F172A",
      goalBg: "#1E293B",
      goalText: "#F8FAFC",
      bulletinBg: "#1E293B",
      bulletinText: "#F8FAFC",
      glassBg: "#1E293B",
    },
  },
];

function loadSavedUiColors(): CustomUiColors {
  try {
    const raw = localStorage.getItem(UI_COLORS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_UI_COLORS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_UI_COLORS;
}

function useCustomUiColors() {
  const [colors, setColorsState] = useState<CustomUiColors>(() => loadSavedUiColors());

  useEffect(() => {
    const syncHandler = () => {
      setColorsState(loadSavedUiColors());
    };
    window.addEventListener(UI_COLORS_EVENT, syncHandler);
    return () => window.removeEventListener(UI_COLORS_EVENT, syncHandler);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--custom-page-bg", colors.pageBg);
    root.style.setProperty("--custom-goal-bg", colors.goalBg);
    root.style.setProperty("--custom-goal-text", colors.goalText);
    root.style.setProperty("--custom-bulletin-bg", colors.bulletinBg);
    root.style.setProperty("--custom-bulletin-text", colors.bulletinText);
    root.style.setProperty("--custom-glass-bg", colors.glassBg);
  }, [colors]);

  const updateColors = (partial: Partial<CustomUiColors>) => {
    const next = { ...loadSavedUiColors(), ...partial };
    try {
      localStorage.setItem(UI_COLORS_STORAGE_KEY, JSON.stringify(next));
    } catch {}
    setColorsState(next);
    window.dispatchEvent(new CustomEvent(UI_COLORS_EVENT));
  };

  const resetColors = () => {
    try {
      localStorage.removeItem(UI_COLORS_STORAGE_KEY);
    } catch {}
    setColorsState(DEFAULT_UI_COLORS);
    window.dispatchEvent(new CustomEvent(UI_COLORS_EVENT));
  };

  return { colors, updateColors, resetColors };
}

function ColorStudioButton({ compact = false }: { compact?: boolean }) {
  const { colors, updateColors, resetColors } = useCustomUiColors();
  const [open, setOpen] = useState(false);

  const bgSwatches = ["#FFFFFF", "#FFFDF7", "#F2FDF7", "#F0F9FF", "#FFF5F7", "#FCF9F2", "#EEF2F6", "#1E293B"];
  const textSwatches = ["#0F172A", "#1C1917", "#0F291E", "#0C4A6E", "#334155", "#4C0519", "#F8FAFC", "#E2E8F0"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <button
            type="button"
            className="h-7 px-2.5 rounded-full bg-white/80 hover:bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="背景色・文字色をカスタマイズ"
          >
            <span>🎨</span>
            <span>色設定</span>
          </button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full bg-white/80 hover:bg-white border border-slate-200/80 text-slate-700 font-bold shrink-0 text-xs h-8 px-3.5 shadow-2xs transition-all cursor-pointer"
          >
            <span className="mr-1.5">🎨</span> 背景・文字色
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white text-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-black flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-2xl bg-slate-100 flex items-center justify-center text-base">🎨</span>
              <span>背景色・文字色カスタム設定</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetColors();
                toast.success("標準の色設定に戻しました");
              }}
              className="h-7 rounded-full text-xs text-slate-600"
            >
              初期値に戻す
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2 text-xs">
          {/* Presets */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700">✨ ワンタップ・テーマプリセット</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {UI_COLOR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => updateColors(p.colors)}
                  className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/40 text-left transition-all cursor-pointer group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-slate-800 group-hover:text-sky-700">{p.label}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{p.desc}</div>
                  </div>
                  <div className="flex items-center -space-x-1 shrink-0">
                    <span className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: p.colors.pageBg }} />
                    <span className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: p.colors.goalBg }} />
                    <span className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: p.colors.bulletinBg }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Goal Board Colors */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-800 flex items-center gap-1.5">🎯 月間目標ボード（背景色 ＆ 文字色）</span>
              <span
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-black/10 shadow-2xs"
                style={{ backgroundColor: colors.goalBg, color: colors.goalText }}
              >
                プレビュー文字 Aa
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                  <span>背景色</span>
                  <span className="font-mono text-[10px] text-slate-400">{colors.goalBg}</span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    type="color"
                    value={colors.goalBg}
                    onChange={(e) => updateColors({ goalBg: e.target.value })}
                    className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 bg-white p-0.5"
                  />
                  {bgSwatches.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => updateColors({ goalBg: hex })}
                      className={`w-5 h-5 rounded-full border ${colors.goalBg.toLowerCase() === hex.toLowerCase() ? "ring-2 ring-sky-500 border-white" : "border-slate-300"}`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                  <span>文字色</span>
                  <span className="font-mono text-[10px] text-slate-400">{colors.goalText}</span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    type="color"
                    value={colors.goalText}
                    onChange={(e) => updateColors({ goalText: e.target.value })}
                    className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 bg-white p-0.5"
                  />
                  {textSwatches.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => updateColors({ goalText: hex })}
                      className={`w-5 h-5 rounded-full border ${colors.goalText.toLowerCase() === hex.toLowerCase() ? "ring-2 ring-sky-500 border-white" : "border-slate-300"}`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bulletin Board Colors */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-800 flex items-center gap-1.5">📌 掲示板（背景色 ＆ 文字色）</span>
              <span
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-black/10 shadow-2xs"
                style={{ backgroundColor: colors.bulletinBg, color: colors.bulletinText }}
              >
                プレビュー文字 Aa
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                  <span>背景色</span>
                  <span className="font-mono text-[10px] text-slate-400">{colors.bulletinBg}</span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    type="color"
                    value={colors.bulletinBg}
                    onChange={(e) => updateColors({ bulletinBg: e.target.value })}
                    className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 bg-white p-0.5"
                  />
                  {bgSwatches.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => updateColors({ bulletinBg: hex })}
                      className={`w-5 h-5 rounded-full border ${colors.bulletinBg.toLowerCase() === hex.toLowerCase() ? "ring-2 ring-sky-500 border-white" : "border-slate-300"}`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                  <span>文字色</span>
                  <span className="font-mono text-[10px] text-slate-400">{colors.bulletinText}</span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    type="color"
                    value={colors.bulletinText}
                    onChange={(e) => updateColors({ bulletinText: e.target.value })}
                    className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 bg-white p-0.5"
                  />
                  {textSwatches.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => updateColors({ bulletinText: hex })}
                      className={`w-5 h-5 rounded-full border ${colors.bulletinText.toLowerCase() === hex.toLowerCase() ? "ring-2 ring-sky-500 border-white" : "border-slate-300"}`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Page & Mission Stage Background */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>🖼️ ページ全体の背景色</span>
                <span className="font-mono text-[10px] text-slate-400">{colors.pageBg}</span>
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <input
                  type="color"
                  value={colors.pageBg}
                  onChange={(e) => updateColors({ pageBg: e.target.value })}
                  className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 bg-white p-0.5"
                />
                {["#F4F6FA", "#FFFFFF", "#F5F2EB", "#EAF2FA", "#FDF2F6", "#ECFDF5", "#E2E8F0", "#0F172A"].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => updateColors({ pageBg: hex })}
                    className={`w-5 h-5 rounded-full border ${colors.pageBg.toLowerCase() === hex.toLowerCase() ? "ring-2 ring-sky-500 border-white" : "border-slate-300"}`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>⚡ ミッション棚・枠の背景色</span>
                <span className="font-mono text-[10px] text-slate-400">{colors.glassBg}</span>
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <input
                  type="color"
                  value={colors.glassBg}
                  onChange={(e) => updateColors({ glassBg: e.target.value })}
                  className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 bg-white p-0.5"
                />
                {bgSwatches.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => updateColors({ glassBg: hex })}
                    className={`w-5 h-5 rounded-full border ${colors.glassBg.toLowerCase() === hex.toLowerCase() ? "ring-2 ring-sky-500 border-white" : "border-slate-300"}`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const getTemplateScheduleLabel = (t: any): string => {
  if (!t) return "";
  if (t.questType === "Daily") return "毎日";
  if (t.questType === "Weekly") {
    const days = t.daysOfWeek && t.daysOfWeek !== "[]" ? (typeof t.daysOfWeek === "string" ? JSON.parse(t.daysOfWeek) : t.daysOfWeek) : [];
    if (days.length > 0) {
      return days.map((d: number) => (SHORT_WEEKDAYS[d] != null ? `${SHORT_WEEKDAYS[d]}曜` : `${d}曜`)).join("・");
    }
    return "毎週";
  }
  if (t.questType === "Monthly") {
    const dates = t.datesOfMonth && t.datesOfMonth !== "[]" ? (typeof t.datesOfMonth === "string" ? JSON.parse(t.datesOfMonth) : t.datesOfMonth) : [];
    const weeks = t.weeksOfMonth && t.weeksOfMonth !== "[]" ? (typeof t.weeksOfMonth === "string" ? JSON.parse(t.weeksOfMonth) : t.weeksOfMonth) : [];
    const days = t.daysOfWeek && t.daysOfWeek !== "[]" ? (typeof t.daysOfWeek === "string" ? JSON.parse(t.daysOfWeek) : t.daysOfWeek) : [];
    const parts = [];
    if (dates.length > 0) parts.push(`${dates.join("・")}日`);
    if (weeks.length > 0) {
      const w = weeks.map((n: number) => SHORT_WEEKS[n - 1] || `第${n}週`).join("・");
      const d = days.length > 0 ? days.map((n: number) => (SHORT_WEEKDAYS[n] != null ? `${SHORT_WEEKDAYS[n]}曜` : `${n}曜`)).join("・") : "全日";
      parts.push(`${w}${d}`);
    }
    if (parts.length > 0) return parts.join(" / ");
    return "毎月";
  }
  if (t.questType === "Yearly") {
    const m = t.monthOfYear ? `${t.monthOfYear}月` : "";
    return m ? `${m}` : "毎年";
  }
  return "";
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

export function getQuestEarliestSlot(q: any): string | null {
  if (!q || !q.plannedTimeSlot) return null;
  try {
    const parsed = JSON.parse(q.plannedTimeSlot);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const sorted = [...parsed].sort();
      return sorted[0];
    }
    if (typeof parsed === 'string' && parsed) return parsed;
  } catch {
    if (typeof q.plannedTimeSlot === 'string' && q.plannedTimeSlot) return q.plannedTimeSlot;
  }
  return null;
}

/**
 * 1時間モード(60分)と30分モードの間でスロットIDを双方向マッピング・正規化
 * - 60分→30分: "09:00-10:00" -> "09:00-09:30" (開始枠に紐付け)
 * - 30分→60分: "10:30-11:00" や "10:00-10:30" -> "10:00-11:00" (該当時間枠に紐付け)
 */
export function normalizeSlotForInterval(slot: string, interval: 30 | 60): string {
  if (!slot) return slot;
  const match = slot.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return slot;

  const startH = parseInt(match[1], 10);
  const startM = parseInt(match[2], 10);
  const endH = parseInt(match[3], 10);
  const endM = parseInt(match[4], 10);

  const durationMin = (endH * 60 + endM) - (startH * 60 + startM);

  if (interval === 30) {
    if (durationMin === 60) {
      // 1時間スロット (例: "09:00-10:00") -> 最初の30分ブロック ("09:00-09:30")
      const sH = startH.toString().padStart(2, '0');
      return `${sH}:00-${sH}:30`;
    }
    const sH = startH.toString().padStart(2, '0');
    const sM = startM < 30 ? "00" : "30";
    const eM = sM === "00" ? "30" : "00";
    const eH = (sM === "00" ? startH : startH + 1).toString().padStart(2, '0');
    return `${sH}:${sM}-${eH}:${eM}`;
  } else {
    // interval === 60
    // その時間帯の1時間枠 (例: "10:30-11:00" -> "10:00-11:00")
    const sH = startH.toString().padStart(2, '0');
    const eH = (startH + 1).toString().padStart(2, '0');
    return `${sH}:00-${eH}:00`;
  }
}

/**
 * MOAI活動クエストかどうかを判定（フラグ、案件名、ミッション名から総合判定）
 */
export function isMoaiQuest(q: any): boolean {
  if (!q) return false;
  return (
    !!q.isMoai ||
    (typeof q.projectName === 'string' && (q.projectName.toLowerCase().includes('moai') || q.projectName.includes('モアイ'))) ||
    (typeof q.questName === 'string' && (q.questName.toLowerCase().includes('moai') || q.questName.includes('モアイ')))
  );
}

// ------------------------------------------------------------------
// CONFIGURATION (ユーザー設定)
// ------------------------------------------------------------------
// TODAY PLANNINGのカードの横幅と配置を設定します。
// Options (横幅): w-48 (192px), w-56 (224px), w-64 (256px), w-72 (288px), w-80 (320px), w-96 (384px), w-full (100%)
// Layout (配置): mx-auto (中央寄せ), ml-0 (左寄せ), mr-0 (右寄せ)
const MISSION_CARD_LAYOUT = "w-55 ml-0";


// 時間枠（左右のスペース）の横幅を設定します。
// Mobile: 68px, Desktop: w-28 (112px) ~ w-32 (128px)
const TIME_SLOT_WIDTH = "w-[68px] sm:w-28 md:w-32";

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------
// Parse "yyyy-MM-dd" to Date at LOCAL midnight (new Date("yyyy-MM-dd") creates UTC midnight which shifts in JST)
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getOffsetFromToday(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// ------------------------------------------------------------------
// MOAI RHYTHM ZONE DEFINITIONS (土日限定の自己暗示・リズム定着)
// ------------------------------------------------------------------
export function isWeekendDate(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday=0, Saturday=6
}

export interface MoaiZoneInfo {
  id: string;
  name: string;
  shortName: string;
  compactName: string;
  emoji: string;
  motto: string;
  actionGuidance: string;
  badgeClass: string;
  slotClass: string;
  headerBorderClass: string;
  barColorClass: string;
  dotColorClass: string;
  badgeText?: string;
  badgeSubText?: string;
}

export const MOAI_WEEKEND_ZONES: Record<string, MoaiZoneInfo> = {
  morning: {
    id: "morning",
    name: "朝：準備",
    shortName: "朝：準備",
    compactName: "朝・準備",
    emoji: "🌅",
    motto: "よし！1日を始めよう！",
    actionGuidance: "心と環境を整える・起床・軽い運動・部屋掃除・予定確認",
    badgeClass: "bg-amber-500/15 text-amber-900 border-amber-500/30",
    slotClass: "bg-gradient-to-r from-amber-50/90 to-white/90 border-amber-200/90",
    headerBorderClass: "border-amber-300/80 bg-gradient-to-r from-amber-100/90 to-amber-50/90 text-amber-900",
    barColorClass: "bg-amber-400",
    dotColorClass: "bg-amber-400",
    badgeSubText: "MP↑",
  },
  golden: {
    id: "golden",
    name: "午前：ゴールデンタイム",
    shortName: "ゴールデンタイム",
    compactName: "ゴールデン",
    emoji: "🌟",
    motto: "今が勝負だ！高MPで一番使える時間帯！",
    actionGuidance: "重要な判断や考える作業・ものづくり・企画・試作・発信",
    badgeClass: "bg-amber-400/25 text-amber-950 border-amber-500/50 shadow-xs",
    slotClass: "bg-gradient-to-r from-amber-100/85 via-yellow-50/80 to-white/95 border-amber-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
    headerBorderClass: "border-amber-400/90 bg-gradient-to-r from-amber-400/25 via-yellow-300/30 to-amber-400/20 text-amber-950 shadow-2xs",
    barColorClass: "bg-amber-500",
    dotColorClass: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)]",
    badgeText: "高MP!",
  },
  lunch: {
    id: "lunch",
    name: "昼：休憩",
    shortName: "昼：休憩",
    compactName: "昼・休憩",
    emoji: "🍱",
    motto: "うまい…しっかり食べて午後もやるぞ",
    actionGuidance: "昼ごはん・ゆっくり休憩",
    badgeClass: "bg-emerald-500/15 text-emerald-900 border-emerald-500/30",
    slotClass: "bg-gradient-to-r from-emerald-50/85 to-white/90 border-emerald-200/80",
    headerBorderClass: "border-emerald-300/80 bg-gradient-to-r from-emerald-100/90 to-emerald-50/90 text-emerald-900",
    barColorClass: "bg-emerald-400",
    dotColorClass: "bg-emerald-400",
    badgeSubText: "回復",
  },
  afternoon: {
    id: "afternoon",
    name: "午後前半",
    shortName: "午後前半",
    compactName: "午後前半",
    emoji: "⚡",
    motto: "まだまだ戦える！よし、続きやるぞ！",
    actionGuidance: "モアイの作業の続き・中MPタスク・制作・試作・イベント検討",
    badgeClass: "bg-sky-500/15 text-sky-900 border-sky-500/30",
    slotClass: "bg-gradient-to-r from-sky-50/85 to-white/90 border-sky-200/80",
    headerBorderClass: "border-sky-300/80 bg-gradient-to-r from-sky-100/90 to-sky-50/90 text-sky-900",
    barColorClass: "bg-sky-400",
    dotColorClass: "bg-sky-400",
    badgeSubText: "中MP",
  },
  slump: {
    id: "slump",
    name: "だれやすい時間帯",
    shortName: "だれ注意帯",
    compactName: "だれ注意",
    emoji: "☕",
    motto: "だんだん低下…ここがだれやすい。無理せず軽作業へ！",
    actionGuidance: "頭を使わない作業に切替・整理・軽作業・SNS・散歩・コーヒー",
    badgeClass: "bg-rose-500/15 text-rose-900 border-rose-500/30",
    slotClass: "bg-gradient-to-r from-rose-50/85 to-white/90 border-rose-200/85",
    headerBorderClass: "border-rose-300/80 bg-gradient-to-r from-rose-100/90 to-rose-50/90 text-rose-900",
    barColorClass: "bg-rose-400",
    dotColorClass: "bg-rose-400",
    badgeText: "軽作業へ",
  },
  evening: {
    id: "evening",
    name: "夕方：ひと息",
    shortName: "夕方：ひと息",
    compactName: "夕方ひと息",
    emoji: "🍳",
    motto: "よし ご飯作ってひと息つこう",
    actionGuidance: "夕食の準備・食事・休憩・リラックス・家事",
    badgeClass: "bg-orange-500/15 text-orange-900 border-orange-500/30",
    slotClass: "bg-gradient-to-r from-orange-50/85 to-white/90 border-orange-200/80",
    headerBorderClass: "border-orange-300/80 bg-gradient-to-r from-orange-100/90 to-orange-50/90 text-orange-900",
    barColorClass: "bg-orange-400",
    dotColorClass: "bg-orange-400",
    badgeSubText: "ひと息",
  },
  night: {
    id: "night",
    name: "夜：頭使わない時間",
    shortName: "夜：頭使わない",
    compactName: "夜・休脳",
    emoji: "🌙",
    motto: "ほぼ戦力外。無理すんな！ここからは体を動かす！考えないぞ！",
    actionGuidance: "筋トレ・運動・洗濯・皿洗い・映画・ゲーム・AIに指示して進める",
    badgeClass: "bg-indigo-500/15 text-indigo-900 border-indigo-500/30",
    slotClass: "bg-gradient-to-r from-indigo-50/85 to-white/90 border-indigo-200/85",
    headerBorderClass: "border-indigo-300/80 bg-gradient-to-r from-indigo-100/90 via-purple-50/85 to-indigo-50/90 text-indigo-950",
    barColorClass: "bg-indigo-400",
    dotColorClass: "bg-indigo-400",
    badgeText: "考えない!",
  },
  midnight: {
    id: "midnight",
    name: "深夜：回復＆就寝",
    shortName: "深夜：回復＆就寝",
    compactName: "深夜・就寝",
    emoji: "🛁",
    motto: "夜は遊び・回復の時間。それでいい。今日もよくやった…寝ろ！",
    actionGuidance: "23:00 お風呂・23:30 スマホ終了・0:00前に就寝",
    badgeClass: "bg-slate-500/20 text-slate-800 border-slate-500/40",
    slotClass: "bg-gradient-to-r from-slate-100/90 to-white/90 border-slate-300/80",
    headerBorderClass: "border-slate-300/90 bg-gradient-to-r from-slate-200/80 to-slate-100/80 text-slate-800",
    barColorClass: "bg-slate-500",
    dotColorClass: "bg-slate-400",
    badgeSubText: "睡眠",
  },
};

export function getMoaiZoneInfo(slotLabel: string): { zone: MoaiZoneInfo; isFirstSlotOfZone: boolean } {
  const [startPart] = slotLabel.split("-");
  const [hStr, mStr] = startPart.split(":");
  const hour = parseInt(hStr, 10);
  const min = parseInt(mStr || "0", 10);

  let zoneKey = "morning";
  let zoneStartHour = 6;

  if (hour >= 6 && hour < 8) {
    zoneKey = "morning";
    zoneStartHour = 6;
  } else if (hour >= 8 && hour < 12) {
    zoneKey = "golden";
    zoneStartHour = 8;
  } else if (hour >= 12 && hour < 13) {
    zoneKey = "lunch";
    zoneStartHour = 12;
  } else if (hour >= 13 && hour < 15) {
    zoneKey = "afternoon";
    zoneStartHour = 13;
  } else if (hour >= 15 && hour < 17) {
    zoneKey = "slump";
    zoneStartHour = 15;
  } else if (hour >= 17 && hour < 19) {
    zoneKey = "evening";
    zoneStartHour = 17;
  } else if (hour >= 19 && hour < 22) {
    zoneKey = "night";
    zoneStartHour = 19;
  } else {
    zoneKey = "midnight";
    zoneStartHour = 22;
  }

  const isFirstSlotOfZone = (hour === zoneStartHour && min === 0);
  return { zone: MOAI_WEEKEND_ZONES[zoneKey], isFirstSlotOfZone };
}

function MoaiRhythmGuideDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗿</span>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100">
                自分のリズムで動く、モアイの1日
              </DialogTitle>
              <div className="text-xs text-amber-700 dark:text-amber-400 font-bold mt-0.5">
                〜 MPがあるうちに“悩みたくないこと”をやり、夜は頭を休めて楽しむ。〜
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Infographic Image */}
        <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-sm bg-stone-900">
          <img
            src="/moai_rhythm.jpg"
            alt="自分のリズムで動く、モアイの1日"
            className="w-full h-auto object-contain cursor-zoom-in"
            onClick={() => window.open('/moai_rhythm.jpg', '_blank')}
            title="クリックで拡大表示"
          />
        </div>

        {/* Tactical Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
            <div className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-200 text-sm">
              <span>☀️</span>
              <span>昼モアイ軍団（高MP）</span>
            </div>
            <div className="text-xs text-amber-950 dark:text-amber-100 font-bold">
              「お前たちは 昼間のうちに全力で働け！！」
            </div>
            <ul className="text-[11px] text-stone-700 dark:text-stone-300 space-y-1 list-disc list-inside">
              <li>新作の発想・デザイン・企画・試作方針</li>
              <li>重要な判断や考える作業（ゴールデンタイム 8:00-12:00）</li>
              <li>イベント戦略、SNSの発信など</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 space-y-2">
            <div className="flex items-center gap-2 font-black text-indigo-900 dark:text-indigo-200 text-sm">
              <span>🌙</span>
              <span>夜モアイ軍団（低MP・頭使わない）</span>
            </div>
            <div className="text-xs text-indigo-950 dark:text-indigo-100 font-bold">
              「お前たちは 夜は休め！遊べ！戦力じゃねえよ！！」
            </div>
            <ul className="text-[11px] text-stone-700 dark:text-stone-300 space-y-1 list-disc list-inside">
              <li>運動・筋トレ、洗濯物・皿洗い・掃除</li>
              <li>映画・ドラマ・ゲーム、英語・料理の勉強</li>
              <li>ミッションシステムの改善（AIに指示して進めるだけ）</li>
            </ul>
          </div>
        </div>

        {/* 6 Golden Rules */}
        <div className="p-4 rounded-xl bg-white/80 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 space-y-2.5 mt-2">
          <div className="text-xs font-black text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <span>💡</span>
            <span>うまくいくための6つのポイント</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-start gap-2 bg-stone-100/60 dark:bg-stone-800/60 p-2 rounded-lg">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
              <span>MPが高い時間帯に、悩みたくないことをやる。</span>
            </div>
            <div className="flex items-start gap-2 bg-stone-100/60 dark:bg-stone-800/60 p-2 rounded-lg">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
              <span>夕方以降は、予定達成のための時間としない。</span>
            </div>
            <div className="flex items-start gap-2 bg-stone-100/60 dark:bg-stone-800/60 p-2 rounded-lg">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
              <span>15〜18時は、無理せず軽作業・散歩に切り替える。</span>
            </div>
            <div className="flex items-start gap-2 bg-stone-100/60 dark:bg-stone-800/60 p-2 rounded-lg">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">4</span>
              <span>モアイ活動は「考える」と「作業する」に分ける。</span>
            </div>
            <div className="flex items-start gap-2 bg-stone-100/60 dark:bg-stone-800/60 p-2 rounded-lg">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">5</span>
              <span>ミッションシステムの改善は夜枠でOK（AI指示で負担小）。</span>
            </div>
            <div className="flex items-start gap-2 bg-stone-100/60 dark:bg-stone-800/60 p-2 rounded-lg">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">6</span>
              <span>23:30以降はスマホを触らず、0時前に布団に入る。</span>
            </div>
          </div>
        </div>

        <div className="text-center py-2 text-xs font-black text-stone-500 tracking-wider">
          「昼間は、戦う。夜は、休むか遊べ。それでいい。」
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// COMPONENTS
// ------------------------------------------------------------------

function DayColumn({
  date,
  quests,
  templates,
  timeSlots,
  isJobModeActive,
  isJobSlot,
  handleUnlink,
  refreshAll,
  dragState,
  handleTouchStart,
  handleMouseDown,
  isToday,
  cardWidth = 300,
  lineGapWidth = 32,
  isSelected,
  onSelect,
  isDragHovered,
  onSortByTime,
  isMoaiRhythmActive = true,
  isForcePreview = false,
  onOpenRhythmGuide,
}: {
  date: Date;
  quests: any[];
  templates: any[];
  timeSlots: any[];
  isJobModeActive: boolean;
  isJobSlot: (label: string) => boolean;
  handleUnlink: (questId: number, slotId: string) => void;
  refreshAll: () => void;
  dragState: any;
  handleTouchStart: any;
  handleMouseDown: any;
  isToday: boolean;
  cardWidth?: number;
  lineGapWidth?: number;
  isSelected: boolean;
  onSelect: () => void;
  isDragHovered?: boolean;
  onSortByTime?: (dateStr: string) => void;
  isMoaiRhythmActive?: boolean;
  isForcePreview?: boolean;
  onOpenRhythmGuide?: () => void;
}) {
  const columnRef = useRef<HTMLDivElement>(null);
  const dateStr = format(date, "yyyy-MM-dd");
  const isWeekend = isWeekendDate(date);
  const showMoaiRhythm = !!isMoaiRhythmActive && (isWeekend || !!isForcePreview);

  // Query & mutation for daily bulletin board content
  const { data: board, refetch: refetchBoard } = trpc.bulletin.get.useQuery({ date: dateStr });
  const saveBoard = trpc.bulletin.save.useMutation();
  const [localContent, setLocalContent] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const contentTimeout = useRef<NodeJS.Timeout | null>(null);

  const [isHideDone, setIsHideDone] = useState<boolean>(() => {
    try {
      return localStorage.getItem("quest_board_hide_done") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleSync = () => {
      try {
        setIsHideDone(localStorage.getItem("quest_board_hide_done") === "true");
      } catch {}
    };
    window.addEventListener("quest_board_hide_done_change", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("quest_board_hide_done_change", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  useEffect(() => {
    setLocalContent(board?.content || "");
  }, [board?.content]);

  const handleContentChange = (val: string) => {
    setLocalContent(val);
    if (contentTimeout.current) clearTimeout(contentTimeout.current);
    contentTimeout.current = setTimeout(() => {
      saveBoard.mutate({
        content: val,
        diary: board?.diary || "",
        date: dateStr
      }, {
        onSuccess: () => refetchBoard()
      });
    }, 1000);
  };

  return (
    <div
      ref={columnRef}
      data-column-date={dateStr}
      style={{ gap: `${lineGapWidth}px` }}
      className={`flex p-4 rounded-3xl shrink-0 relative transition-all duration-300 apple-glass ${
        isDragHovered
          ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-500/[0.08] shadow-xl scale-[1.01]'
          : isSelected
            ? 'ring-2 ring-sky-500/40 border-sky-400/60 shadow-lg'
            : isToday
              ? 'ring-1 ring-amber-400/60 shadow-[0_8px_30px_rgba(245,158,11,0.12)]'
              : ''
      }`}
    >
      {/* SVG Connecting Lines inside this column */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-visible">
        <ConnectionLines
          quests={quests}
          parentRef={columnRef as React.RefObject<HTMLDivElement>}
          templates={templates}
          onUnlink={handleUnlink}
          timelineInterval={timeSlots.length <= 18 ? 60 : 30}
        />
      </div>

      {/* Sub-column 1: Day Info & Card List */}
      <div
        className="flex flex-col gap-3 shrink-0 z-20 min-w-0"
        style={{ width: `${cardWidth}px`, maxWidth: `${cardWidth}px` }}
      >
        {/* Header */}
        <div onClick={onSelect} className="flex items-center justify-between border-b pb-2.5 mb-0.5 border-slate-200/60 dark:border-stone-800 select-none cursor-pointer hover:opacity-85 transition-opacity">
          <span className={`text-xs font-black uppercase tracking-wider ${isToday ? 'text-amber-500 font-black' : 'text-slate-600 dark:text-stone-300'} flex items-center gap-1.5`}>
            {format(date, "E M/d")}
            {isToday && <span className="text-[9px] font-bold text-white bg-amber-500 px-1.5 py-0.5 rounded-full leading-none shadow-2xs">TODAY</span>}
            {isSelected && <span className="text-[9px] font-bold text-sky-600 dark:text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded-full leading-none border border-sky-500/20">🎯 選択中</span>}
          </span>
          <div className="flex items-center gap-1.5">
            {quests.length > 1 && onSortByTime && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSortByTime(dateStr);
                }}
                className="text-[9.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 px-2 py-0.5 rounded-full flex items-center gap-0.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                title="時間枠の早い順に並び替えて保存"
              >
                <Clock className="w-2.5 h-2.5" />
                時間順
              </button>
            )}
            <span className="text-[10px] font-bold text-slate-500 dark:text-stone-400 bg-slate-100/80 dark:bg-stone-800 px-2 py-0.5 rounded-full">
              {quests.length} tasks
            </span>
          </div>
        </div>

        {/* Bulletin Board Daily Note (Focus / Reflection) */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-stone-800 bg-white/85 dark:bg-stone-900/70 backdrop-blur-md shadow-2xs overflow-hidden transition-all hover:shadow-sm">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 dark:border-stone-800/80 text-[10px] text-muted-foreground select-none bg-slate-50/60 dark:bg-stone-800/40">
            <span className="font-bold flex items-center gap-1 text-slate-600 dark:text-stone-300">
              📝 フォーカス・メモ
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-0.5 hover:bg-slate-200/60 dark:hover:bg-stone-700 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-stone-200 transition cursor-pointer"
                title={isExpanded ? "枠を縮小" : "枠を縦に広げる"}
              >
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalContent(localContent);
                  setIsModalOpen(true);
                }}
                className="p-0.5 hover:bg-slate-200/60 dark:hover:bg-stone-700 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-stone-200 transition cursor-pointer"
                title="大画面で拡大表示・編集"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div
            onClick={() => {
              setModalContent(localContent);
              setIsModalOpen(true);
            }}
            className={`p-2.5 text-[10.5px] sm:text-[11px] leading-relaxed cursor-pointer hover:bg-amber-50/20 transition-all overflow-y-auto break-words ${
              isExpanded ? "max-h-[260px] min-h-[120px]" : "max-h-[80px] min-h-[46px]"
            }`}
          >
            {localContent ? (
              <div
                dangerouslySetInnerHTML={{ __html: localContent }}
                className={`text-slate-700 dark:text-stone-300 [&_div]:my-0.5 [&_img]:max-h-24 [&_img]:rounded-md ${
                  isHideDone ? "hide-done-active" : ""
                }`}
              />
            ) : (
              <span className="text-slate-400/70 dark:text-stone-600 italic select-none">
                タップしてフォーカス・振り返りを記入...
              </span>
            )}
          </div>
        </div>

        {/* 拡大編集モーダル */}
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          if (!open) {
            setIsModalOpen(false);
            if (modalContent !== localContent) {
              handleContentChange(modalContent);
            }
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-4 sm:p-6 rounded-3xl">
            <DialogHeader className="pb-2 border-b border-border/50">
              <DialogTitle className="text-sm sm:text-base font-bold flex items-center justify-between">
                <span>📝 {format(date, "yyyy年M月d日 (E)")} のフォーカス・日間メモ</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-2">
              <RichDocEditor
                value={modalContent}
                onChange={(val) => {
                  setModalContent(val);
                  handleContentChange(val);
                }}
                placeholder="今日のフォーカス、やること、振り返り、気づきなどを自由に書き込み..."
                showToolbar={true}
                minHeight={280}
                theme="stone"
                textAreaClassName="text-sm leading-6 text-stone-700 dark:text-stone-300"
              />
            </div>

            <DialogFooter className="pt-2 border-t border-border/50 flex items-center justify-between sm:justify-between">
              <span className="text-[11px] text-muted-foreground">
                ※ 入力内容は自動保存されます
              </span>
              <Button
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-full px-4"
              >
                閉じる
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Quest Dialog trigger inside this day */}
        <QuestCreateDialog
          onCreated={refreshAll}
          defaultDate={date}
          trigger={
            <button className="w-full py-2 text-[11px] font-bold border border-dashed border-slate-300/80 dark:border-stone-700 rounded-2xl text-slate-500 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50/50 dark:hover:bg-stone-800/60 transition-all select-none flex items-center justify-center gap-1 cursor-pointer active:scale-[0.98]">
              <Plus className="w-3.5 h-3.5" />
              <span>新規タスク</span>
            </button>
          }
        />

        {/* Quests list */}
        <div className="flex flex-col gap-2.5 min-h-[100px]">
          {quests.length === 0 ? (
            <div className="text-[11px] text-muted-foreground/40 italic text-center py-8 select-none">No tasks</div>
          ) : (
            quests.map(q => {
              const isDraggingCurrent = dragState.itemId === q.id && dragState.mode === 'sort';
              const effectiveAdhoc = isDraggingCurrent
                ? (dragState.adhocPreview !== undefined ? dragState.adhocPreview : !!q.isAdhoc)
                : !!q.isAdhoc;

              return (
                <div
                  id={`source-${q.id}`}
                  key={q.id}
                  data-sort-id={q.id}
                  data-sort-date={dateStr}
                  className={`cursor-default relative rounded-2xl z-20 transition-all duration-200 ${
                    effectiveAdhoc ? 'ml-4 sm:ml-5 w-[calc(100%-1rem)] sm:w-[calc(100%-1.25rem)]' : 'ml-0 w-full'
                  } ${
                    isDraggingCurrent
                      ? 'shadow-2xl scale-105 z-50 ring-2 ring-sky-500'
                      : ''
                  }`}
                >
                  <TodayItem
                    quest={q}
                    templates={templates}
                    onStatusChange={refreshAll}
                    isAdhocEffective={effectiveAdhoc}
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
              );
            })
          )}
        </div>
      </div>

      {/* Sub-column 2: Timeline Column (Zero horizontal expansion; inline rhythm zone headers) */}
      <div className={`flex flex-col gap-1.5 shrink-0 ${TIME_SLOT_WIDTH} z-10`}>
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 tracking-wider mb-1 px-1 select-none">
          <span>TIMELINE</span>
          {showMoaiRhythm && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenRhythmGuide?.(); }}
              className="hover:text-amber-700 flex items-center gap-0.5 text-[8.5px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/20 transition-all cursor-pointer"
              title="モアイの1日リズム図を表示"
            >
              <span>🗿</span>
              <span>図解</span>
            </button>
          )}
        </div>
        {timeSlots.map(slot => {
          const currentInterval: 30 | 60 = timeSlots.length <= 18 ? 60 : 30;
          const { zone, isFirstSlotOfZone } = getMoaiZoneInfo(slot.label);
          const isUsed = quests.some(q => {
            if (!q.plannedTimeSlot) return false;
            try {
              const parsed = JSON.parse(q.plannedTimeSlot);
              const list = Array.isArray(parsed) ? parsed : [parsed];
              return list.some(s => s === slot.id || normalizeSlotForInterval(s, currentInterval) === slot.id);
            } catch {
              return q.plannedTimeSlot === slot.id || normalizeSlotForInterval(q.plannedTimeSlot, currentInterval) === slot.id;
            }
          });

          return (
            <React.Fragment key={slot.id}>
              {showMoaiRhythm && isFirstSlotOfZone && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOpenRhythmGuide?.(); }}
                  title={`${zone.name}: ${zone.motto}\nおすすめ: ${zone.actionGuidance}`}
                  className={`w-full mt-1.5 first:mt-0 px-2 py-0.5 rounded-lg border text-[8.5px] sm:text-[9.5px] font-black flex items-center justify-between gap-1 select-none transition-all hover:brightness-95 cursor-pointer ${zone.headerBorderClass}`}
                >
                  <span className="flex items-center gap-1 truncate">
                    <span className="shrink-0">{zone.emoji}</span>
                    <span className="truncate">{zone.compactName}</span>
                  </span>
                  {(zone.badgeText || zone.badgeSubText) && (
                    <span className="hidden sm:inline-block text-[7.5px] px-1 py-0.1 rounded bg-black/10 font-black shrink-0">
                      {zone.badgeText || zone.badgeSubText}
                    </span>
                  )}
                </button>
              )}
              <div
                data-slot-id={slot.id}
                data-slot-date={dateStr}
                title={showMoaiRhythm ? `${slot.label} 【${zone.name}】\n「${zone.motto}」\nおすすめ: ${zone.actionGuidance}` : undefined}
                className={`w-full rounded-xl px-2 py-1.5 min-h-[30px] flex items-center justify-center transition-all duration-200 group relative overflow-hidden border ${
                  isUsed
                    ? 'bg-white border-sky-400/80 shadow-xs ring-2 ring-sky-500/15'
                    : showMoaiRhythm
                      ? `${zone.slotClass} hover:border-sky-300/80 hover:shadow-xs`
                      : 'bg-white/65 border-slate-200/70 hover:bg-white hover:border-sky-300/70 hover:shadow-xs'
                }`}
              >
                {showMoaiRhythm && !isUsed && (
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${zone.dotColorClass}`} />
                )}
                <span className={`z-10 font-mono text-[11px] sm:text-[11.5px] tracking-tight select-none pointer-events-none transition-colors ${
                  isUsed
                    ? 'font-black text-slate-900'
                    : 'font-semibold text-slate-600 group-hover:text-slate-900'
                }`}>
                  {slot.label}
                </span>
                {isUsed && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 ml-1.5 shrink-0 shadow-[0_0_6px_rgba(14,165,233,0.8)]" />
                )}
                {!isUsed && isJobModeActive && isJobSlot(slot.label) && (
                  <span className="ml-1 text-[8px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-slate-200/80 text-slate-500 select-none pointer-events-none">
                    JOB
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function QuestCreateDialog({
  onCreated,
  planningDayOffset = 0,
  defaultDate,
  defaultType = "FreeDirect",
  defaultIsMoai = false,
  isOpen,
  onOpenChange,
  trigger
}: {
  onCreated: () => void;
  planningDayOffset?: number;
  defaultDate?: Date;
  defaultType?: "FreeDirect" | "Free" | "Relax";
  defaultIsMoai?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [questType, setQuestType] = useState<string>(defaultType);
  const [startDateVal, setStartDateVal] = useState("");
  const [deadlineVal, setDeadlineVal] = useState("");
  const [targetCountVal, setTargetCountVal] = useState("1");
  const [isMoaiVal, setIsMoaiVal] = useState(defaultIsMoai);
  const createQuest = trpc.quest.create.useMutation();
  const createTemplate = trpc.template.create.useMutation();

  // When dialog opens, auto-fill startDate and defaultType
  useEffect(() => {
    if (open) {
      setQuestType(defaultType);
      setIsMoaiVal(defaultIsMoai);
      if (defaultDate) {
        setStartDateVal(format(defaultDate, "yyyy-MM-dd"));
      } else if (planningDayOffset > 0) {
        const d = new Date();
        d.setDate(d.getDate() + planningDayOffset);
        setStartDateVal(format(d, "yyyy-MM-dd"));
      } else {
        setStartDateVal(format(new Date(), "yyyy-MM-dd"));
      }
      setDeadlineVal("");
      setTargetCountVal("1");
    }
  }, [open, planningDayOffset, defaultDate, defaultType, defaultIsMoai]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get("questType") as string;
    const name = (formData.get("questName") as string)?.trim() || "Untitled Mission";

    if (type === "Relax") {
      await createTemplate.mutateAsync({
        questName: name,
        projectName: isMoaiVal ? "MOAI活動" : undefined,
        questType: "Relax",
        difficulty: "1",
        frequency: 1,
        isMoai: isMoaiVal,
      });
      toast.success("Created Relax Mission");
    } else if (type === "Free") {
      // Free (Pool only)
      await createTemplate.mutateAsync({
        questName: name,
        projectName: isMoaiVal ? "MOAI活動" : undefined,
        questType: "Free",
        difficulty: (formData.get("difficulty") as any) || "1",
        startDate: startDateVal ? parseLocalDate(startDateVal) : undefined,
        endDate: deadlineVal ? parseLocalDate(deadlineVal) : undefined,
        frequency: parseInt(targetCountVal) || 1,
        isMoai: isMoaiVal,
      });
      toast.success("Created One-off Mission (Pool)");
    } else if (type === "FreeDirect") {
      // 1. Create Free Template (so it appears in ONE-OFF shelf)
      const template = await createTemplate.mutateAsync({
        questName: name,
        projectName: isMoaiVal ? "MOAI活動" : undefined,
        questType: "Free",
        difficulty: (formData.get("difficulty") as any) || "1",
        startDate: startDateVal ? parseLocalDate(startDateVal) : (defaultDate || new Date()),
        endDate: deadlineVal ? parseLocalDate(deadlineVal) : undefined,
        frequency: parseInt(targetCountVal) || 1,
        isMoai: isMoaiVal,
      });

      // 2. Determine target start date for instant plan placement
      let targetStartDate: Date;
      if (startDateVal) {
        targetStartDate = parseLocalDate(startDateVal);
      } else if (defaultDate) {
        targetStartDate = defaultDate;
      } else if (planningDayOffset > 0) {
        const d = new Date();
        d.setDate(d.getDate() + planningDayOffset);
        d.setHours(0, 0, 0, 0);
        targetStartDate = d;
      } else {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        targetStartDate = d;
      }

      // 3. Immediately instantiate into Planning
      await createQuest.mutateAsync({
        questName: name,
        projectName: isMoaiVal ? "MOAI活動" : undefined,
        questType: "Free" as any,
        difficulty: (formData.get("difficulty") as any) || "1",
        templateId: template.id,
        status: "accepted",
        startDate: targetStartDate,
        deadline: deadlineVal ? parseLocalDate(deadlineVal) : undefined,
        autoDeadline: false,
        targetCount: 1,
        isMoai: isMoaiVal,
      } as any);

      toast.success(isMoaiVal ? "🗿 MOAI活動ミッションを作成しました！" : "Created & Added to Plan!");
    } else {
      const status = "unreceived";
      let startDate: Date | undefined;
      if (startDateVal) {
        startDate = parseLocalDate(startDateVal);
      } else if (defaultDate) {
        startDate = defaultDate;
      } else if (planningDayOffset > 0) {
        const d = new Date();
        d.setDate(d.getDate() + planningDayOffset);
        d.setHours(0, 0, 0, 0);
        startDate = d;
      }
      await createQuest.mutateAsync({
        questName: name,
        projectName: isMoaiVal ? "MOAI活動" : undefined,
        questType: type as any,
        difficulty: formData.get("difficulty") as any,
        status: status,
        startDate: startDate,
        deadline: deadlineVal ? parseLocalDate(deadlineVal) : undefined,
        autoDeadline: false,
        targetCount: parseInt(targetCountVal) || 1,
        isMoai: isMoaiVal,
      } as any);
    }
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="icon" variant="ghost" className="h-6 w-6"><Plus className="w-4 h-4" /></Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Mission{planningDayOffset > 0 ? " (Tomorrow)" : ""}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Name</Label><Input name="questName" placeholder="ミッション名を入力..." autoFocus required /></div>
          <div><Label>Type</Label>
            <Select name="questType" value={questType} onValueChange={setQuestType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FreeDirect">⚡ One-off (即反映 / Direct to Plan)</SelectItem>
                <SelectItem value="Free">📦 One-off (待機列のみ / Pool only)</SelectItem>
                <SelectItem value="Relax">☕ Relax Mission (Saved)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(questType === "FreeDirect" || questType === "Free") && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <Input name="startDate" type="date" className="text-xs" value={startDateVal} onChange={(e) => setStartDateVal(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Deadline</Label>
                  <Input name="deadline" type="date" className="text-xs" value={deadlineVal} onChange={(e) => setDeadlineVal(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Target Count (e.g. 3 days)</Label>
                <Input name="targetCount" type="number" min="1" className="text-xs" value={targetCountVal} onChange={(e) => setTargetCountVal(e.target.value)} />
              </div>
            </div>
          )}

          {/* MOAI活動タグのトグル */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsMoaiVal(!isMoaiVal)}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                isMoaiVal
                  ? 'bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-100 ring-2 ring-amber-500/30 font-black shadow-xs'
                  : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🗿</span>
                <div className="text-left">
                  <div className="leading-tight">MOAI活動タグをつける</div>
                  <div className="text-[10px] opacity-75 font-normal">MOAI活動として記録・振り返り対象にします</div>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                isMoaiVal ? 'bg-amber-500 border-amber-600 text-white' : 'border-muted-foreground/30'
              }`}>
                {isMoaiVal && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          </div>

          <input type="hidden" name="difficulty" value="1" />
          <Button type="submit" className="w-full" disabled={createQuest.isPending || createTemplate.isPending}>
            {(createQuest.isPending || createTemplate.isPending) ? "Creating..." : "Create"}
          </Button>
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
  onReorderStart,
  isAdhocEffective
}: {
  quest: any,
  templates: any[],
  onStatusChange: () => void,
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void,
  onReorderStart?: (e: React.MouseEvent | React.TouchEvent) => void,
  isAdhocEffective?: boolean
}) {
  const isAdhoc = isAdhocEffective !== undefined ? isAdhocEffective : !!quest.isAdhoc;
  const isMoai = isMoaiQuest(quest);
  const updateStatus = trpc.quest.updateStatus.useMutation();
  const deleteQuest = trpc.quest.delete.useMutation();
  const incrementCount = trpc.quest.incrementCount.useMutation();
  const template = templates.find(t => t.id === quest.templateId);
  const isRelax = template?.questType === "Relax" || quest.questType === "Relax";

  // Optimistic local status for instant UI response
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
  const displayStatus = optimisticStatus ?? quest.status;

  // Reset optimistic state when server data arrives
  useEffect(() => {
    setOptimisticStatus(null);
  }, [quest.status]);

  const isCompleted = displayStatus === "cleared";
  const isFailed = displayStatus === "failed";
  const isChallenging = displayStatus === "challenging" || displayStatus === "almost";
  const isPending = updateStatus.isPending || incrementCount.isPending;
  const updateQuest = trpc.quest.update.useMutation();
  const createBook = trpc.book.create.useMutation();
  const createMovie = trpc.movie.create.useMutation();
  const { data: bookList } = trpc.book.list.useQuery();
  const { data: movieList } = trpc.movie.list.useQuery();
  const [note, setNote] = useState(quest.note || "");
  const [bookTitle, setBookTitle] = useState("");
  const [movieTitle, setMovieTitle] = useState("");
  const [isMovieStockSubOpen, setIsMovieStockSubOpen] = useState(false);

  const isReadingMission = isRelax && quest.questName.includes("読書");

  // 映画情報のパース（タイトル、上映時間、座席、ポスターの紐付け）
  const currentMovieInfo = React.useMemo(() => {
    const text = quest.note || quest.questName || "";
    if (!text.includes("🎬") && !quest.questName.includes("映画")) return null;

    // 形式: "🎬 クジラに落ちた男 [20:55 〜 22:41 / 💺劇場 A-1席]" または "🎬 映画: クジラに落ちた男"
    const match = text.match(/🎬\s*(?:映画:\s*)?([^\[\n\r]+)(?:\[([^\]]+)\])?/);
    let rawTitle = match ? match[1].trim() : "";
    let timeSlot = "";
    let seatInfo = "";

    if (match && match[2]) {
      const details = match[2].trim();
      const parts = details.split("/").map((s: string) => s.trim());
      timeSlot = parts[0] || "";
      seatInfo = parts[1] || "";
    } else if (!rawTitle && quest.questName.startsWith("🎬 映画: ")) {
      rawTitle = quest.questName.replace("🎬 映画: ", "").trim();
    }

    if (!rawTitle) return null;

    const movieObj = movieList?.find((m: any) =>
      m.title === rawTitle || m.officialTitle === rawTitle || (rawTitle && m.title?.includes(rawTitle))
    );

    return {
      title: movieObj?.officialTitle || movieObj?.title || rawTitle,
      timeSlot,
      seatInfo,
      movieObj,
    };
  }, [quest.note, quest.questName, movieList]);

  const isMovieMission = (isRelax && quest.questName.includes("映画")) || quest.questName.includes("映画") || quest.questName.startsWith("🎬") || !!currentMovieInfo;

  useEffect(() => {
    setNote(quest.note || "");
  }, [quest.note]);

  // 日付が変わっているか判定（深夜0時〜朝9時の間、前日の完了タスクを薄くする）
  const isPreviousDay = React.useMemo(() => {
    if (!isCompleted && !isFailed) return false;
    const updatedAt = new Date(quest.updatedAt);
    const now = new Date();
    // 日付文字列で比較 (YYYY-MM-DD)
    return updatedAt.toDateString() !== now.toDateString();
  }, [quest.updatedAt, isCompleted, isFailed]);

  const handleNext = async () => {
    if (isPreviousDay) return; // 過去分は操作不可
    if (updateStatus.isPending || incrementCount.isPending) return;
    if (displayStatus === "failed" || displayStatus === "cleared") return;

    // Normal clear
    const nextStatus = displayStatus === "accepted" ? "challenging" : displayStatus === "challenging" ? "cleared" : "cleared";

    // Optimistic: update UI instantly
    setOptimisticStatus(nextStatus);
    if (window.navigator?.vibrate) window.navigator.vibrate(15);

    // Fire mutation in background (don't await)
    updateStatus.mutateAsync({ questId: quest.id, status: nextStatus })
      .then(() => onStatusChange())
      .catch(() => setOptimisticStatus(null)); // Rollback on error
  };

  const handleDelete = async (skipConfirm = false) => {
    // Delete allowed anytime (even for past quests) to clean up list
    if (skipConfirm || confirm("Delete this quest?")) {
      await deleteQuest.mutateAsync({ questId: quest.id });
      onStatusChange();
    }
  };

  const handleAbort = async (skipConfirm = false) => {
    if (isPreviousDay) return; // 過去分は操作不可
    if (skipConfirm || confirm("Abort (Fail) this quest?")) {
      // Optimistic: update UI instantly
      setOptimisticStatus("failed");
      if (window.navigator?.vibrate) window.navigator.vibrate(15);

      updateStatus.mutateAsync({ questId: quest.id, status: "failed" })
        .then(() => onStatusChange())
        .catch(() => setOptimisticStatus(null));
    }
  };

  let borderClass = "border-l-emerald-500";
  let bgClass = "bg-card/90";

  const isDaily = template?.questType === "Daily";
  const isWeeklyPool = template?.questType === "Weekly" && (!template.daysOfWeek || JSON.parse(template.daysOfWeek).length === 0);
  const isMonthlyPool = template?.questType === "Monthly" && (!template.datesOfMonth || JSON.parse(template.datesOfMonth).length === 0) && (!template.weeksOfMonth || JSON.parse(template.weeksOfMonth).length === 0);
  const isProject = quest.questType === "Project";
  const isFree = template?.questType === "Free" || quest.questType === "Free";

  if (template) {
    if (isRelax) {
      borderClass = "border-l-emerald-500"; // Green for Relax
    } else if (isProject) {
      borderClass = "border-l-indigo-500";
    } else if (isWeeklyPool || isMonthlyPool) {
      borderClass = "border-l-fuchsia-500";
    } else if (isFree) {
      borderClass = "border-l-orange-500";
    } else {
      borderClass = "border-l-sky-500";
    }
  } else if (isProject) {
    borderClass = "border-l-indigo-500";
  } else if (isFree) {
    borderClass = "border-l-orange-500";
  } else {
    // Manual / unknown
    borderClass = "border-l-orange-500"; // Orange for Manual
  }

  if (isChallenging) {
    bgClass = "bg-amber-50/80 dark:bg-amber-900/10";
  }

  // 過去分は控えめに表示
  if (isPreviousDay) {
    bgClass += " opacity-90";
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

  // Long Press Logic
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const startPress = () => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      setIsMenuOpen(true);
      if (window.navigator.vibrate) window.navigator.vibrate(50); // Haptic feedback
    }, 500);
  };

  const endPress = (e: React.MouseEvent | React.TouchEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Dialog Actions
  const onAbort = async () => {
    setIsMenuOpen(false);
    await handleAbort(true);
  };

  const onDelete = async () => {
    setIsMenuOpen(false);
    await handleDelete(true);
  };

  const handleSaveNote = async () => {
    try {
      await updateQuest.mutateAsync({
        questId: quest.id,
        note: note
      });
      setIsMenuOpen(false);
      toast.success("Note saved");
      onStatusChange(); // Validate list update
    } catch (e) {
      toast.error("Failed to save note");
    }
  };

  const handleRecordBook = async () => {
    if (!bookTitle.trim()) return;
    try {
      await createBook.mutateAsync({ title: bookTitle.trim() });
      await updateQuest.mutateAsync({ questId: quest.id, note: `📚 ${bookTitle.trim()}` });
      toast.success("Book recorded!");
      setIsMenuOpen(false);
      setBookTitle("");
      onStatusChange();
    } catch (e) {
      toast.error("Failed to record book");
    }
  };

  const handleRecordMovie = async () => {
    if (!movieTitle.trim()) return;
    try {
      await createMovie.mutateAsync({ title: movieTitle.trim() });
      await updateQuest.mutateAsync({
        questId: quest.id,
        questName: `🎬 映画: ${movieTitle.trim()}`,
        note: `🎬 ${movieTitle.trim()}`,
      });
      toast.success("Movie recorded!");
      setIsMenuOpen(false);
      setMovieTitle("");
      onStatusChange();
    } catch (e) {
      toast.error("Failed to record movie");
    }
  };

  return (
    <div
      className={`group relative flex items-center gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-2xl apple-card border-l-[5px] ${borderClass} ${bgClass} ${isFailed ? 'opacity-60 grayscale' : ''} ${isPending ? 'opacity-70 cursor-wait' : ''} ${isChallenging ? 'ring-2 ring-amber-400/70 dark:ring-amber-600 shadow-[0_4px_20px_rgba(245,158,11,0.15)]' : ''}`}
      // 過去分でなければドラッグ開始イベントを有効にする
      onMouseDown={(e) => {
        if (!isPreviousDay) {
          startPress();
          onDragStart(e);
        }
      }}
      onTouchStart={(e) => {
        if (!isPreviousDay) {
          // Don't start drag if touching interactive elements (inputs, buttons, etc.)
          const target = e.target as HTMLElement;
          if (target.closest('input, textarea, button, a, select, label, [role="button"]')) return;
          startPress();
          onDragStart(e);
        }
      }}
      onMouseUp={endPress}
      onTouchEnd={endPress}
      onMouseLeave={cancelPress}
      onTouchMove={cancelPress} // Cancel long press if moving (dragging)
    >
      <div
        className={`shrink-0 cursor-grab text-slate-300 dark:text-stone-600 hover:text-slate-600 dark:hover:text-stone-300 active:cursor-grabbing p-1 -ml-1 transition-colors ${isPreviousDay ? 'hidden' : ''}`}
        onMouseDown={(e) => { e.stopPropagation(); onReorderStart && onReorderStart(e); }}
        onTouchStart={(e) => { e.stopPropagation(); onReorderStart && onReorderStart(e); }}
      >
        <GripVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </div>
      <div
        onClick={(e) => { e.stopPropagation(); handleNext(); }}
        className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-200 shrink-0 hover:scale-110 active:scale-90 ${
          isCompleted
            ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.4)]'
            : isFailed
              ? 'bg-destructive border-destructive text-destructive-foreground'
              : isChallenging
                ? 'border-amber-500 text-amber-600 bg-amber-100 dark:bg-amber-900/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'border-slate-300 dark:border-stone-600 bg-white/80 dark:bg-stone-800 hover:border-sky-500'
        } ${isPending ? 'pointer-events-none' : ''}`}
      >
        {isCompleted && <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />}
        {isFailed && <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
        {isChallenging && <PlayCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />}
      </div>
      <div className="flex-1 min-w-0 z-10">
        <div className={`font-bold text-[12px] sm:text-[13.5px] tracking-tight leading-snug break-words ${isCompleted ? 'text-slate-500 dark:text-stone-400' : 'text-slate-900 dark:text-stone-100'} ${isFailed ? 'line-through decoration-destructive' : ''} ${isChallenging ? 'text-amber-800 dark:text-amber-300' : ''}`}>
          {quest.projectName ? `${quest.questName} -${quest.projectName}-` : quest.questName}
        </div>
        {(quest.note || template?.description) && (
          <div className="w-full min-w-0 text-[10.5px] sm:text-xs text-slate-600 dark:text-stone-300 leading-snug sm:leading-relaxed mt-1.5 break-words line-clamp-2 sm:line-clamp-none bg-slate-100/70 dark:bg-stone-800/50 rounded-xl p-1.5 sm:p-2 border border-slate-200/60 dark:border-stone-700/50">
            {quest.note && <div>{quest.note}</div>}
            {template?.description && template.description !== quest.note && (
              <div className={`text-[9.5px] sm:text-[10px] text-muted-foreground ${quest.note ? 'mt-1 pt-1 border-t border-border/30' : ''}`}>
                {template.description}
              </div>
            )}
          </div>
        )}
        <div className="text-[9px] sm:text-[9.5px] text-slate-400 dark:text-stone-400 flex flex-wrap gap-1.5 items-center leading-none mt-1.5">
          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-stone-800 text-slate-600 dark:text-stone-300 uppercase tracking-wider font-bold text-[8.5px]">
            {QUEST_TYPE_LABELS[quest.questType]}
          </span>
          {isMoai && (
            <span className="text-amber-900 dark:text-amber-100 font-black bg-amber-500/20 border border-amber-500/35 px-1.5 py-0.5 rounded-full text-[8.5px] select-none flex items-center gap-0.5 shadow-2xs">
              🗿 MOAI
            </span>
          )}
          {isAdhoc && (
            <span className="text-amber-700 dark:text-amber-300 font-bold bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded-full text-[8.5px] select-none">
              隙間
            </span>
          )}
          {isChallenging && (
            <span className="text-amber-700 dark:text-amber-300 font-black bg-amber-400/25 border border-amber-500/30 px-2 py-0.5 rounded-full text-[8.5px] animate-pulse">
              ● RUNNING
            </span>
          )}
          {quest.targetCount > 1 && (
            <span className="flex items-center gap-1 font-bold text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400">
              <span className="px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/25 rounded-full">
                {quest.currentCount}/{quest.targetCount}
              </span>
            </span>
          )}
        </div>
      </div>

      {isCompleted && (
        <div className="z-10 animate-in zoom-in-50 duration-300 pointer-events-none shrink-0">
          <div className="rounded-full px-2 py-0.5 flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/35 shadow-2xs backdrop-blur-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[9.5px] font-black text-emerald-600 dark:text-emerald-400 tracking-wider leading-none">DONE</span>
          </div>
        </div>
      )}

      <div className={`flex gap-0.5 transition-opacity z-20 pointer-events-auto opacity-0 group-hover:opacity-100`}>
        {!isPreviousDay && (
          <button onClick={(e) => { e.stopPropagation(); handleAbort(); }} className="p-1.5 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors cursor-pointer" title="Abort">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-500/10 rounded-full transition-colors cursor-pointer" title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action Dialog for Touch Devices (Long Press) */}
      <Dialog open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold truncate">
              {quest.questName}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-4">
            {isReadingMission && (
              <div className="space-y-2 p-3 bg-fuchsia-50 dark:bg-fuchsia-900/20 border border-fuchsia-100 rounded-lg">
                <Label className="text-fuchsia-700 dark:text-fuchsia-300 font-bold flex items-center gap-1">
                  📚 レコーディング読書
                </Label>
                <div className="text-[10px] text-fuchsia-600/80 mb-2">これから読む本を登録して、Daily Insightの下の読書列に追加します。</div>
                {/* Uncompleted book list */}
                {(() => {
                  const unfinished = bookList?.filter((b: any) => b.status !== 'completed') || [];
                  if (unfinished.length === 0) return null;
                  return (
                    <div className="mb-2">
                      <div className="text-[10px] text-fuchsia-500 font-bold mb-1">未完了の本から選択:</div>
                      <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                        {unfinished.map((b: any) => (
                          <button
                            key={b.id}
                            onClick={async () => {
                              await updateQuest.mutateAsync({ questId: quest.id, note: `📚 ${b.title}` });
                              toast.success(`『${b.title}』を記録しました`);
                              setIsMenuOpen(false);
                              onStatusChange();
                            }}
                            className="text-[11px] px-2.5 py-1.5 rounded-md bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-700 border border-fuchsia-200 transition-colors text-left truncate max-w-full"
                          >
                            📖 {b.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRecordBook();
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="space-y-1.5"
                >
                  <div className="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-bold">または新規登録:</div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      autoComplete="off"
                      enterKeyHint="done"
                      placeholder="本のタイトルを入力..."
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                      onTouchStart={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => (e.target as HTMLInputElement).focus()}
                      style={{ touchAction: "manipulation" }}
                      className="h-9 text-xs sm:text-sm bg-white dark:bg-stone-900"
                    />
                    <Button
                      type="submit"
                      disabled={createBook.isPending || !bookTitle.trim()}
                      className="h-9 px-3 bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold text-xs shrink-0"
                    >
                      {createBook.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      登録
                    </Button>
                  </div>
                </form>
              </div>
            )}
            {isMovieMission && (
              <div className="space-y-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-rose-700 dark:text-rose-300 font-bold flex items-center gap-1">
                    🎬 レコーディング映画
                  </Label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMovieStockSubOpen(true);
                    }}
                    className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 px-2 py-0.5 rounded-full border border-rose-200 transition-colors flex items-center gap-1"
                  >
                    <span>🍿 ストック管理</span>
                  </button>
                </div>
                <div className="text-[10px] text-rose-600/80">これから観る映画を登録・選択して、記録します。</div>

                {/* 🎟️ セット中の映画チケット・鑑賞予定カード（ポスター・時間・座席・劇場情報を完全連動） */}
                {currentMovieInfo && (
                  <div className="p-3 rounded-xl bg-stone-900 border-2 border-amber-500/80 shadow-md text-white space-y-2">
                    <div className="flex items-start gap-3">
                      {currentMovieInfo.movieObj?.posterUrl ? (
                        <img
                          src={currentMovieInfo.movieObj.posterUrl}
                          alt={currentMovieInfo.title}
                          className="w-12 h-16 object-cover rounded-md shrink-0 shadow-md ring-1 ring-white/10"
                        />
                      ) : (
                        <div className="w-12 h-16 rounded-md bg-stone-800 flex items-center justify-center shrink-0">
                          <Film className="w-6 h-6 text-stone-500" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-stone-950">
                            🎟️ セット中の映画
                          </span>
                          {currentMovieInfo.movieObj?.status === "completed" && (
                            <span className="text-[10px] text-emerald-400 font-bold">
                              ✓ 鑑賞完了
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-black text-white mt-1 leading-snug break-words">
                          {currentMovieInfo.title}
                        </div>
                        <div className="text-[11px] text-stone-300 mt-1 flex flex-wrap gap-1.5 items-center font-mono">
                          {currentMovieInfo.timeSlot && (
                            <span className="px-1.5 py-0.5 rounded bg-stone-800 text-amber-300 border border-stone-700 font-bold">
                              ⏰ {currentMovieInfo.timeSlot}
                            </span>
                          )}
                          {currentMovieInfo.seatInfo && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                              {currentMovieInfo.seatInfo}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-stone-800 flex items-center justify-between text-[11px]">
                      <span className="text-stone-400 text-[10px]">
                        別の映画に変更する場合は下から選択
                      </span>
                      {currentMovieInfo.movieObj && currentMovieInfo.movieObj.status !== "completed" && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await updateStatus.mutateAsync({ questId: quest.id, status: "cleared" });
                            toast.success(`🎬『${currentMovieInfo.title}』を鑑賞完了にしました！`);
                            setIsMenuOpen(false);
                            onStatusChange();
                          }}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors cursor-pointer"
                        >
                          ✓ 鑑賞完了にする
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Uncompleted movie list */}
                {(() => {
                  const unfinished = movieList?.filter((m: any) => m.status !== 'completed') || [];
                  if (unfinished.length === 0) return null;
                  return (
                    <div className="mb-2">
                      <div className="text-[10px] text-rose-500 font-bold mb-1">ストック中の映画から選択:</div>
                      <div className="flex flex-wrap gap-1.5 max-h-[130px] overflow-y-auto custom-scrollbar">
                        {unfinished.map((m: any) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await updateQuest.mutateAsync({
                                questId: quest.id,
                                questName: `🎬 映画: ${m.title}`,
                                note: `🎬 ${m.title}`,
                              });
                              toast.success(`『${m.title}』を記録しました`);
                              setIsMenuOpen(false);
                              onStatusChange();
                            }}
                            className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-900 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-200/80 shadow-2xs transition-all text-left truncate max-w-full font-bold flex items-center gap-1 active:scale-95"
                          >
                            <span>🎥</span>
                            <span className="truncate">{m.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Mobile-Friendly Quick Add Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRecordMovie();
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="space-y-1.5"
                >
                  <div className="text-[10px] text-rose-500 dark:text-rose-400 font-bold">または新規登録してセット:</div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      autoComplete="off"
                      enterKeyHint="done"
                      placeholder="映画のタイトルを入力..."
                      value={movieTitle}
                      onChange={(e) => setMovieTitle(e.target.value)}
                      onTouchStart={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => (e.target as HTMLInputElement).focus()}
                      style={{ touchAction: "manipulation" }}
                      className="h-9 text-xs sm:text-sm bg-white dark:bg-stone-900"
                    />
                    <Button
                      type="submit"
                      disabled={createMovie.isPending || !movieTitle.trim()}
                      className="h-9 px-3 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shrink-0"
                    >
                      {createMovie.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      登録
                    </Button>
                  </div>
                </form>

                {/* Sub Dialog for Movie Stock from TodayItem */}
                {isMovieStockSubOpen && (
                  <MovieStockDialog
                    isOpen={isMovieStockSubOpen}
                    onOpenChange={setIsMovieStockSubOpen}
                    onSelectForActiveMission={async (title) => {
                      await updateQuest.mutateAsync({
                        questId: quest.id,
                        questName: `🎬 映画: ${title}`,
                        note: `🎬 ${title}`,
                      });
                      toast.success(`『${title}』を記録しました`);
                      setIsMenuOpen(false);
                      onStatusChange();
                    }}
                  />
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Description / Note</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="e.g. Read 'Atomic Habits'"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onTouchStart={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); (e.target as HTMLTextAreaElement).focus(); }}
                style={{ touchAction: 'manipulation' }}
              />
              <Button onClick={handleSaveNote} disabled={updateQuest.isPending} className="w-full">
                {updateQuest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Note
              </Button>
            </div>

            <div className="h-px bg-border my-2" />
            <Button
              variant="outline"
              size="lg"
              onClick={async () => {
                const nextAdhoc = !isAdhoc;
                await updateQuest.mutateAsync({ questId: quest.id, isAdhoc: nextAdhoc });
                setIsMenuOpen(false);
                toast.success(nextAdhoc ? "隙間時間（1段下げ）に設定しました" : "本予定に戻しました");
                onStatusChange();
              }}
              className="w-full justify-start h-14 text-sm font-bold text-foreground border-stone-200 dark:border-stone-800"
            >
              {isAdhoc ? (
                <>
                  <ArrowLeftToLine className="w-5 h-5 mr-3 text-muted-foreground" />
                  本予定に戻す（左揃え）
                </>
              ) : (
                <>
                  <ArrowRightToLine className="w-5 h-5 mr-3 text-amber-500" />
                  隙間時間に設定（1段下げる）
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={async () => {
                const nextMoai = !isMoai;
                await updateQuest.mutateAsync({
                  questId: quest.id,
                  isMoai: nextMoai,
                  projectName: nextMoai ? (quest.projectName || "MOAI活動") : (quest.projectName === "MOAI活動" ? null : quest.projectName)
                });
                setIsMenuOpen(false);
                toast.success(nextMoai ? "🗿 MOAI活動タグを設定しました" : "MOAI活動タグを解除しました");
                onStatusChange();
              }}
              className="w-full justify-start h-14 text-sm font-bold text-foreground border-stone-200 dark:border-stone-800"
            >
              {isMoai ? (
                <>
                  <span className="text-xl mr-3">✖️</span>
                  MOAI活動タグを解除する
                </>
              ) : (
                <>
                  <span className="text-xl mr-3">🗿</span>
                  MOAI活動タグを設定する
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onAbort}
              className="w-full text-destructive border-destructive/50 hover:bg-destructive/10 justify-start h-14 text-lg"
            >
              <XCircle className="w-6 h-6 mr-3" />
              Abort (Fail)
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onDelete}
              className="w-full text-red-600 border-red-200 hover:bg-red-50 justify-start h-14 text-lg"
            >
              <Trash2 className="w-6 h-6 mr-3" />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setIsMenuOpen(false)}
              className="w-full mt-2"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FixItem({ quest, executedCount, onReceive }: { quest: any, executedCount: number, onReceive: () => void }) {
  const isCompleted = quest.status === "cleared";
  const isTargetDay = quest.isTargetDay !== false;

  const handleClick = () => {
    if (isCompleted) return;
    if (!isTargetDay) {
      const scheduleText = quest.scheduleLabel ? `【${quest.scheduleLabel}】` : "指定日外";
      const confirmed = window.confirm(
        `「${quest.questName}」は${scheduleText}指定のタスクですが、本日受注しますか？`
      );
      if (!confirmed) return;
    }
    onReceive();
  };

  return (
    <div
      onClick={handleClick}
      className={`relative cursor-pointer group flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl transition-all ${
        isCompleted
          ? 'apple-card opacity-65'
          : isTargetDay
            ? 'apple-card hover:border-sky-300/80'
            : 'rounded-2xl border border-dashed border-slate-300/80 dark:border-stone-700 bg-white/45 dark:bg-stone-900/40 hover:bg-white/80 text-slate-600 transition-all'
      }`}
    >
      {isCompleted && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/35 text-[10px] font-black text-sky-600 dark:text-sky-400 tracking-wider">
            ✓ CLEAR
          </span>
        </div>
      )}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
          isCompleted
            ? 'bg-sky-100/70 text-sky-400 dark:bg-sky-950/50'
            : isTargetDay
              ? 'bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-sm shadow-sky-500/25 group-hover:scale-105'
              : 'bg-slate-200/70 dark:bg-stone-800 text-slate-400 group-hover:bg-slate-300 group-hover:text-slate-600'
        }`}
      >
        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`text-[13px] font-bold tracking-tight truncate ${isCompleted ? 'text-slate-400 line-through' : isTargetDay ? 'text-slate-900 dark:text-stone-100' : 'text-slate-600 dark:text-stone-400'}`}>
            {quest.projectName ? `${quest.questName} -${quest.projectName}-` : quest.questName}
          </div>
          {!isTargetDay && quest.scheduleLabel && (
            <span className="shrink-0 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-stone-800 text-slate-600 dark:text-stone-300 leading-tight">
              {quest.scheduleLabel}指定
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[9px] px-1.5 py-0.2 rounded-md uppercase tracking-wider font-bold ${isTargetDay ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'bg-slate-100 dark:bg-stone-800 text-slate-400'}`}>
            {QUEST_TYPE_LABELS[quest.questType]}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-stone-500 font-medium">達成回数: {executedCount}</span>
        </div>
      </div>
    </div>
  );
}

function NonFixItem({ template, history, onReceive, onDragStart }: { template: any, history: any[], onReceive: () => void, onDragStart?: (e: React.MouseEvent | React.TouchEvent) => void }) {
  const now = new Date();
  let periodStart = startOfWeek(now, { weekStartsOn: 1 });
  if (template.questType === "Monthly") periodStart = startOfMonth(now);

  const doneCount = history.filter(h =>
    h.templateId === template.id &&
    h.finalStatus === 'cleared' &&
    (isAfter(new Date(h.recordedAt), periodStart) || isEqual(new Date(h.recordedAt), periodStart))
  ).length;

  const quota = template.frequency || 1;
  const isCompleted = doneCount >= quota;
  const isExcellent = doneCount > quota;

  return (
    <div 
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.drag-handle')) return;
        onReceive();
      }}
      className={`relative group flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl apple-card cursor-pointer ${
        isExcellent
          ? 'ring-1 ring-amber-400/60 bg-amber-50/40 dark:bg-amber-950/20'
          : isCompleted
            ? 'opacity-70'
            : 'hover:border-fuchsia-300/80'
      }`}
    >
      {isCompleted && (
        <div className="absolute right-3 top-2.5 z-10 pointer-events-none">
          {isExcellent ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[9px] font-black tracking-wider shadow-xs uppercase">
              ★ EXCELLENT
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/35 text-[9.5px] font-black text-fuchsia-600 dark:text-fuchsia-400 tracking-wider">
              ✓ CLEAR
            </span>
          )}
        </div>
      )}
      {/* Drag handle */}
      <div
        className="shrink-0 cursor-grab text-slate-300 hover:text-fuchsia-500 p-1 -ml-1 touch-none drag-handle z-20 transition-colors"
        onMouseDown={(e) => { e.stopPropagation(); onDragStart && onDragStart(e); }}
        onTouchStart={(e) => { e.stopPropagation(); onDragStart && onDragStart(e); }}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      {/* Content area */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
          isExcellent
            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/25'
            : isCompleted
              ? 'bg-fuchsia-100/70 text-fuchsia-400 dark:bg-fuchsia-950/50'
              : 'bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-sm shadow-fuchsia-500/25 group-hover:scale-105'
        }`}>
          {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <div className={`text-[13px] font-bold tracking-tight truncate ${isExcellent ? 'text-amber-900 dark:text-amber-200' : isCompleted ? 'text-slate-500 dark:text-stone-400' : 'text-slate-900 dark:text-stone-100'}`}>
              {template.projectName ? `${template.questName} -${template.projectName}-` : template.questName}
            </div>
            <span className={`text-[10px] font-mono font-bold ml-2 shrink-0 px-1.5 py-0.2 rounded-full ${
              isExcellent
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                : isCompleted
                  ? 'bg-emerald-500/15 text-emerald-600'
                  : 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400'
            }`}>
              {doneCount}/{quota}
            </span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 uppercase tracking-wider font-bold">
                {QUEST_TYPE_LABELS[template.questType]}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-stone-500 font-medium">達成回数: {template.executedCount || 0}</span>
            </div>
            <div className="flex gap-1 items-center">
              {Array.from({ length: quota }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    quota > 6 ? 'w-2' : 'w-3'
                  } ${
                    i < doneCount
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                      : isExcellent
                        ? 'bg-amber-300'
                        : 'bg-slate-200/80 dark:bg-stone-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OneOffTemplateItem({
  template,
  onReceive,
  onStatusChange
}: {
  template: any,
  onReceive: () => void,
  onStatusChange?: () => void
}) {
  const isCompleted = template.executedCount >= (template.frequency || 1);
  const doneCount = template.executedCount || 0;
  const quota = template.frequency || 1;

  const handleNext = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompleted) return;
    onReceive();
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startPress = () => {
    timerRef.current = setTimeout(() => {
      setIsMenuOpen(true);
    }, 500);
  };
  const endPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const deleteTemplate = trpc.template.toggleActive.useMutation();
  const handleDelete = async () => {
    if (confirm("Delete this One-off task permanently?")) {
      await deleteTemplate.mutateAsync({ templateId: template.id, isActive: false });
      setIsMenuOpen(false);
      if (onStatusChange) onStatusChange();
    }
  };

  return (
    <>
      <div
        className={`relative group flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl apple-card ${isCompleted ? 'opacity-65' : 'hover:border-orange-300/80'}`}
        onMouseDown={(e) => { startPress(); }}
        onTouchStart={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('button, [role="button"]')) return;
          startPress();
        }}
        onMouseUp={endPress}
        onTouchEnd={endPress}
        onMouseLeave={cancelPress}
        onTouchMove={cancelPress}
      >
        {isCompleted && (
          <div className="absolute right-3 top-2.5 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/35 text-[9.5px] font-black text-orange-600 dark:text-orange-400 tracking-wider">
              ✓ CLEAR
            </span>
          </div>
        )}
        <div
          onClick={handleNext}
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 cursor-pointer z-20 pointer-events-auto transition-all duration-200 ${
            isCompleted
              ? 'bg-orange-100/70 text-orange-400 dark:bg-orange-950/50'
              : 'bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-sm shadow-orange-500/25 hover:scale-105 active:scale-95'
          }`}
        >
          {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
        </div>
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="flex justify-between items-center mb-1">
            <div className={`text-[13px] font-bold tracking-tight truncate ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900 dark:text-stone-100'}`}>
              {template.projectName ? `${template.questName} -${template.projectName}-` : template.questName}
            </div>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${isCompleted ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'}`}>
              {doneCount}/{quota}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 uppercase tracking-wider font-bold">
              {QUEST_TYPE_LABELS["Free"] || "ONE-OFF"}
            </span>
            <div className="flex gap-1 items-center" style={{ pointerEvents: 'auto' }}>
              {Array.from({ length: quota }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-3 rounded-full transition-all duration-300 ${
                    i < doneCount
                      ? 'bg-gradient-to-r from-orange-400 to-amber-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]'
                      : 'bg-slate-200/80 dark:bg-stone-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold truncate">
              {template.questName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleDelete}
              className="w-full text-red-600 border-red-200 hover:bg-red-50 justify-start h-14 text-lg rounded-2xl"
            >
              <Trash2 className="w-6 h-6 mr-3" />
              Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProjectTemplateItem({ template, onReceive }: { template: any, onReceive: () => void }) {
  return (
    <div onClick={onReceive} className="cursor-pointer group flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl apple-card hover:border-indigo-300/80">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/25 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
        <Plus className="w-4 h-4 stroke-[2.5]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold tracking-tight text-slate-900 dark:text-stone-100 truncate">
          {template.parentProjectName ? `${template.questName} -${template.parentProjectName}-` : template.questName}
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-bold">PROJECT</span>
          <span className="text-[10px] text-slate-400 font-medium">達成回数: {template.executedCount || 0}</span>
          {template.endDate && <span className="text-[10px] text-slate-400 font-mono">期間: {format(new Date(template.startDate || new Date()), "MM/dd")} - {format(new Date(template.endDate), "MM/dd")}</span>}
        </div>
      </div>
    </div>
  );
}

function ConnectionLines({
  quests,
  parentRef,
  templates,
  onUnlink,
  timelineInterval = 30
}: {
  quests: any[];
  parentRef: React.RefObject<HTMLDivElement>;
  templates: any[];
  onUnlink: (questId: number, slotId: string) => void;
  timelineInterval?: 30 | 60;
}) {
  const [paths, setPaths] = useState<{ id: string, questId: number, slotId: string, d: string, color: string, x1: number, y1: number, x2: number, y2: number }[]>([]);

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
        const sourceEl = parentRef.current?.querySelector(`#source-${q.id}`) || document.getElementById(`source-${q.id}`);
        const normalizedSlotId = normalizeSlotForInterval(slotId, timelineInterval);
        const targetEl = parentRef.current?.querySelector(`[data-slot-id="${normalizedSlotId}"]`) || parentRef.current?.querySelector(`[data-slot-id="${slotId}"]`);
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
            color: getColor(q),
            x1,
            y1,
            x2,
            y2,
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
  }, [quests, templates, timelineInterval]);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
      {paths.map(p => (
        <React.Fragment key={p.id}>
          {/* Soft Luminous Outer Glow */}
          <path d={p.d} fill="none" stroke={p.color} strokeWidth="7" strokeLinecap="round" className="opacity-15" />
          <path d={p.d} fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" className="opacity-70 dark:opacity-20" />
          <path d={p.d} fill="none" stroke={p.color} strokeWidth="2.5" strokeLinecap="round" />
          <path
            d={p.d}
            fill="none"
            stroke="transparent"
            strokeWidth="20"
            className="pointer-events-auto cursor-pointer hover:stroke-red-500/25 transition-all"
            onClick={() => onUnlink(p.questId, p.slotId)}
          >
            <title>クリックして時間の紐付けを解除</title>
          </path>
          <circle cx={p.x1} cy={p.y1} r="4.5" fill="white" stroke={p.color} strokeWidth="2.5" />
          <circle cx={p.x2} cy={p.y2} r="4.5" fill={p.color} stroke="white" strokeWidth="1.5" />
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Relax Mission</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="questName">Mission Name</Label>
            <Input
              id="questName"
              value={questName}
              onChange={(e) => setQuestName(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              Delete
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Restore History Dialog
function RestoreHistoryDialog({
  item,
  open,
  onOpenChange,
  onRestore
}: {
  item: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (item: any, frequency: number) => void;
}) {
  const [frequency, setFrequency] = useState("1");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(frequency, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onRestore(item, parsed);
      onOpenChange(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Restore ONE-OFF Mission</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Mission Name</Label>
            <div className="text-sm font-medium p-2 bg-muted rounded-md">{item.questName}</div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="frequency">Target Count (指定回数)</Label>
            <Input
              id="frequency"
              type="number"
              min="1"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">This mission will be completed after this many executions.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Restore</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FeedbackSection({ targetType, targetId }: { targetType: "daily" | "moai" | "kaizen", targetId: number }) {
  const [content, setContent] = useState("");
  const { data: feedbacks, refetch } = trpc.insightFeedback.list.useQuery({ targetType, targetId });
  const createMutation = trpc.insightFeedback.create.useMutation();
  const deleteMutation = trpc.insightFeedback.delete.useMutation();
  const likeMutation = trpc.insightFeedback.like.useMutation();
  const [animatingId, setAnimatingId] = useState<number | null>(null);

  const handleAdd = async () => {
    if (!content.trim()) return;
    await createMutation.mutateAsync({ targetType, targetId, content: content.trim() });
    setContent("");
    refetch();
    if (window.navigator?.vibrate) window.navigator.vibrate(20);
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync({ id });
    refetch();
  };

  const handleLike = async (id: number) => {
    setAnimatingId(id);
    await likeMutation.mutateAsync({ id });
    refetch();
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
    setTimeout(() => setAnimatingId(null), 300);
  };

  return (
    <div className="mt-2 ml-5 space-y-2 border-l-2 border-slate-100/50 pl-3 pb-1">
      {feedbacks?.map((f: any) => (
        <div key={f.id} className="group relative text-[11px] text-slate-500 bg-slate-50/50 p-2 rounded-md transition-colors hover:bg-slate-50">
          <div className="flex items-start gap-1 justify-between">
            <div className="flex items-start gap-1 flex-1 min-w-0">
              <CornerDownRight className="w-3 h-3 mt-0.5 shrink-0 opacity-40" />
              <span className="whitespace-pre-wrap">{f.content}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <button
                onClick={() => handleLike(f.id)}
                className="flex items-center gap-0.5 text-slate-300 hover:text-rose-400 transition-colors p-0.5"
              >
                <Heart
                  className={`w-3 h-3 transition-all duration-200 ${
                    (f.likes || 0) > 0 ? 'fill-rose-400 text-rose-400' : ''
                  } ${animatingId === f.id ? 'scale-150' : 'scale-100'}`}
                />
                {(f.likes || 0) > 0 && (
                  <span className="text-[9px] text-rose-400 font-bold">{f.likes}</span>
                )}
              </button>
              <button 
                onClick={() => handleDelete(f.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-opacity p-0.5"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
          <div className="text-[8px] text-slate-300 mt-0.5 pl-4">
            {new Date(f.createdAt).toLocaleString()}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1 px-1">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="リプを追記..."
          className="h-7 text-[10px] flex-1 bg-white/40 border-slate-100 focus-visible:ring-indigo-100 py-0"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
        />
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={handleAdd} 
          disabled={createMutation.isPending || !content.trim()}
          className="h-7 w-7 p-0 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("today");
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRelaxOpen, setIsRelaxOpen] = useState(false);
  const [isLunchCounterOpen, setIsLunchCounterOpen] = useState(false);
  const [planningDayOffset, setPlanningDayOffset] = useState(0); // 0=today, 1=tomorrow

  // Responsive mobile screen detection
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") return window.innerWidth < 640;
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { data: activeQuests, refetch: refetchQuests } = trpc.quest.list.useQuery(undefined, {
    enabled: isAuthenticated,
    // 他端末でのタイマー開始・停止やステータス変更を自動同期
    refetchInterval: 10000,
  });


  const { data: templates, refetch: refetchTemplates } = trpc.template.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: progression, refetch: refetchProgression } = trpc.progression.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: unreceivedQuests, refetch: refetchUnreceived } = trpc.quest.unreceived.useQuery(undefined, { enabled: isAuthenticated });
  const { data: books, refetch: refetchBooks } = trpc.book.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: movies, refetch: refetchMovies } = trpc.movie.list.useQuery(undefined, { enabled: isAuthenticated });

  const updateBookStatus = trpc.book.updateStatus.useMutation();
  const deleteBook = trpc.book.delete.useMutation();

  const updateMovieStatus = trpc.movie.updateStatus.useMutation();
  const deleteMovie = trpc.movie.delete.useMutation();

  const updateBookReview = trpc.book.updateReview.useMutation();
  const updateMovieReview = trpc.movie.updateReview.useMutation();
  const [reviewMedia, setReviewMedia] = useState<{ type: 'book' | 'movie', item: any } | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>("");

  const openReviewDialog = (type: 'book' | 'movie', item: any) => {
    setReviewMedia({ type, item });
    setReviewRating(item.rating || 0);
    setReviewText(item.review || "");
    if (window.navigator?.vibrate) window.navigator.vibrate(50);
  };

  const handleReviewSave = async () => {
    if (!reviewMedia) return;
    if (reviewMedia.type === 'book') {
      await updateBookReview.mutateAsync({ id: reviewMedia.item.id, rating: reviewRating, review: reviewText });
      refetchBooks();
    } else {
      await updateMovieReview.mutateAsync({ id: reviewMedia.item.id, rating: reviewRating, review: reviewText });
      refetchMovies();
    }
    setReviewMedia(null);
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return <span className="ml-2 text-yellow-500 tracking-tighter text-[10px]">{"★".repeat(rating)}{"☆".repeat(5-rating)}</span>;
  };

  const now = new Date();
  const startRange = format(startOfWeek(startOfMonth(now), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const endRange = format(endOfWeek(endOfMonth(now), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const { data: history, refetch: refetchHistory } = trpc.history.list.useQuery({ startDate: startRange, endDate: endRange }, { enabled: isAuthenticated });

  const updateStatus = trpc.quest.updateStatus.useMutation();
  const createQuest = trpc.quest.create.useMutation();
  const createTemplate = trpc.template.create.useMutation();
  const generateFromTemplates = trpc.template.generate.useMutation();
  const updateOrder = trpc.quest.updateOrder.useMutation();

  // ------------------------------------------------------------------
  // CONFIG & JOB MODE
  // ------------------------------------------------------------------
  // Get Target Date (string format for DB query)
  const targetDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + planningDayOffset);
    return format(d, "yyyy-MM-dd");
  }, [planningDayOffset]);

  const { data: dailyConfig, refetch: refetchConfig } = trpc.config.getDaily.useQuery(
    { date: targetDateStr },
    { enabled: isAuthenticated, staleTime: 1000 * 60 } // Cache for 1 minute
  );

  // ============================================
  // Yasuda Yogurt Counter logic
  // ============================================
  const targetYearMonth = useMemo(() => targetDateStr.substring(0, 7), [targetDateStr]);
  const { data: lunchCookedCount, refetch: refetchLunchCookedCount } = trpc.config.getLunchCookedCount.useQuery({ yearMonth: targetYearMonth }, { enabled: isAuthenticated });
  const setLunchCountMutaion = trpc.config.setLunchCount.useMutation();

  const handleAddLunch = async () => {
    const newCount = (dailyConfig?.lunchCount ?? 0) + 1;
    await setLunchCountMutaion.mutateAsync({ date: targetDateStr, count: newCount });
    refetchConfig();
    refetchLunchCookedCount();
  };

  const todayLunchCount = dailyConfig?.lunchCount ?? 0;
  const thisMonthLunchCount = lunchCookedCount ?? 0;
  const savedAmount = thisMonthLunchCount * 300;
  const yogurtCount = savedAmount / 603;

  const getYogurtComment = (count: number) => {
    if (count >= 10) return "「ヤスダヨーグルト箱買いレベル」";
    if (count >= 5) return "「ヨーグルトパーティーできる」";
    if (count >= 1) return `「ヤスダヨーグルト${Math.floor(count)}本分節約！」`;
    return "「あと少しで1本買える！」";
  };
  const disableJobModeMutation = trpc.config.disableJobMode.useMutation();

  const handleDisableJobMode = async () => {
    await disableJobModeMutation.mutateAsync({ date: targetDateStr });
    toast.success("Job Mode disabled for the day.");
    refetchConfig();
  };

  // Determine if today is a weekday (Monday=1, Sunday=0)
  const isWeekday = useMemo(() => {
    const d = parseLocalDate(targetDateStr);
    const day = d.getDay();
    return day >= 1 && day <= 5;
  }, [targetDateStr]);

  const isJobModeActive = isWeekday && !dailyConfig?.jobModeDisabled;

  // Render Time Slots (9:00 - 17:00 is Job Time)
  const isJobSlot = (slotLabel: string) => {
    const hour = parseInt(slotLabel.split(":")[0], 10);
    return hour >= 9 && hour < 17; // 09:00 up to 16:00 (16:00-17:00 block)
  };

  const handleDragStart = (e: React.DragEvent | React.TouchEvent, id: number, mode: 'plan' | 'sort' = 'plan') => {
    // Legacy drag start (can be removed or kept if needed else where)
  };

  const updateQuest = trpc.quest.update.useMutation();

  useEffect(() => {
    if (isAuthenticated) generateFromTemplates.mutateAsync().then(() => refetchQuests());
  }, [isAuthenticated]);

  const refreshAll = () => {
    refetchQuests();
    refetchTemplates();
    refetchUnreceived();
    refetchHistory();
    refetchProgression();
    refetchBooks();
    refetchMovies();
  };

  const [dragState, setDragState] = useState<{
    active: boolean,
    itemId: number | null,
    mode: 'plan' | 'sort', // 'plan' = time slot / move, 'sort' = reorder
    startX: number,
    startY: number,
    currentX: number,
    currentY: number,
    adhocPreview?: boolean
  }>({
    active: false, itemId: null, mode: 'plan', startX: 0, startY: 0, currentX: 0, currentY: 0, adhocPreview: false
  });
  const [hoveredColumnDate, setHoveredColumnDate] = useState<string | null>(null);

  /*
   * Reordering Logic (Server Sync - Scoped by Date)
   */
  const [dayOrders, setDayOrders] = useState<Record<string, number[]>>({});
  const dayOrdersRef = useRef<Record<string, number[]>>({});
  dayOrdersRef.current = dayOrders;

  const compareQuestsFallback = React.useCallback((a: any, b: any) => {
    // 1. Both have positive manual displayOrder
    if (a.displayOrder > 0 && b.displayOrder > 0 && a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    // 2. Earliest planned time slot (e.g. 07:00 < 09:00 < 21:00)
    const slotA = getQuestEarliestSlot(a);
    const slotB = getQuestEarliestSlot(b);
    if (slotA && slotB && slotA !== slotB) {
      return slotA.localeCompare(slotB);
    }
    if (slotA && !slotB) return -1;
    if (!slotA && slotB) return 1;

    // 3. One has manual displayOrder, one doesn't
    if (a.displayOrder > 0 && (!b.displayOrder || b.displayOrder <= 0)) return -1;
    if ((!a.displayOrder || a.displayOrder <= 0) && b.displayOrder > 0) return 1;

    // 4. Creation id
    return a.id - b.id;
  }, []);

  // Sync dayOrders when activeQuests changes from server
  useEffect(() => {
    if (!activeQuests) return;
    if (dragState.active) return; // Do not interrupt an in-progress drag

    const nextDayOrders: Record<string, number[]> = {};
    const questsByDate: Record<string, any[]> = {};

    activeQuests.forEach(q => {
      if (!["accepted", "challenging", "almost", "failed", "cleared"].includes(q.status)) return;
      const qDate = q.startDate ? new Date(q.startDate) : (q.createdAt ? new Date(q.createdAt) : null);
      if (!qDate) return;
      const dStr = format(qDate, "yyyy-MM-dd");
      if (!questsByDate[dStr]) questsByDate[dStr] = [];
      questsByDate[dStr].push(q);
    });

    Object.keys(questsByDate).forEach(dStr => {
      const sorted = [...questsByDate[dStr]].sort(compareQuestsFallback);
      nextDayOrders[dStr] = sorted.map(q => q.id);
    });

    setDayOrders(nextDayOrders);
    dayOrdersRef.current = nextDayOrders;
  }, [activeQuests, compareQuestsFallback, dragState.active]);

  const updateOrderMutation = trpc.quest.updateOrder.useMutation();

  const handleSortByTime = React.useCallback((dateStr: string) => {
    const questsOnDate = activeQuests?.filter(q => {
      if (!["accepted", "challenging", "almost", "failed", "cleared"].includes(q.status)) return false;
      const qDate = q.startDate ? new Date(q.startDate) : (q.createdAt ? new Date(q.createdAt) : null);
      if (!qDate) return false;
      return format(qDate, "yyyy-MM-dd") === dateStr;
    }) || [];

    if (questsOnDate.length <= 1) return;

    // Sort strictly by earliest time slot first, then unscheduled by id
    const sorted = [...questsOnDate].sort((a, b) => {
      const slotA = getQuestEarliestSlot(a);
      const slotB = getQuestEarliestSlot(b);
      if (slotA && slotB && slotA !== slotB) return slotA.localeCompare(slotB);
      if (slotA && !slotB) return -1;
      if (!slotA && slotB) return 1;
      return a.id - b.id;
    });

    const sortedIds = sorted.map(q => q.id);

    setDayOrders(prev => {
      const updated = { ...prev, [dateStr]: sortedIds };
      dayOrdersRef.current = updated;
      return updated;
    });

    const updates = sortedIds.map((id, index) => ({ questId: id, order: index + 1 }));
    updateOrderMutation.mutate(updates, {
      onSuccess: () => {
        toast.success("時間順に整列しました");
        refetchQuests();
      },
      onError: () => {
        toast.error("整列の保存に失敗しました");
      }
    });
  }, [activeQuests, updateOrderMutation, refetchQuests]);

  const [planningViewMode, setPlanningViewMode] = useState<'today' | 'weekly'>(() => {
    try {
      const mode = localStorage.getItem('planning_view_mode');
      return (mode === 'weekly' || mode === 'today') ? mode : 'today';
    } catch {
      return 'today';
    }
  });

  const [weeklyActiveDate, setWeeklyActiveDate] = useState(() => {
    // Get the JST start of week (Monday)
    const now = new Date();
    return startOfWeek(now, { weekStartsOn: 1 });
  });

  const [isMoaiBoardFilter, setIsMoaiBoardFilter] = useState(false);
  const [isMoaiCreateOpen, setIsMoaiCreateOpen] = useState(false);
  const [isMoaiRhythmActive, setIsMoaiRhythmActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('moai_rhythm_active');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true; // ON by default
  });
  const [isForceRhythmPreview, setIsForceRhythmPreview] = useState<boolean>(() => {
    try {
      return localStorage.getItem('moai_rhythm_force_preview') === 'true';
    } catch {}
    return false;
  });
  const [isMoaiRhythmGuideOpen, setIsMoaiRhythmGuideOpen] = useState(false);

  const isTodayWeekend = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + planningDayOffset);
    return isWeekendDate(d);
  }, [planningDayOffset]);

  const showMoaiRhythmToday = isMoaiRhythmActive && (isTodayWeekend || isForceRhythmPreview);

  const getQuestsForDate = React.useCallback((date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");

    const filtered = activeQuests?.filter(q => {
      if (isMoaiBoardFilter && !isMoaiQuest(q)) return false;
      if (!["accepted", "challenging", "almost", "failed", "cleared"].includes(q.status)) return false;
      
      const qDate = q.startDate ? new Date(q.startDate) : (q.createdAt ? new Date(q.createdAt) : null);
      if (!qDate) return false;
      const qDateStr = format(qDate, "yyyy-MM-dd");

      // Strictly match date: do not carry over uncleared tasks to the next day
      if (qDateStr !== dateStr) return false;

      return true;
    }) || [];

    const dayList = dayOrders[dateStr];
    if (dayList && dayList.length > 0) {
      return [...filtered].sort((a, b) => {
        const indexA = dayList.indexOf(a.id);
        const indexB = dayList.indexOf(b.id);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return compareQuestsFallback(a, b);
      });
    }

    return [...filtered].sort(compareQuestsFallback);
  }, [activeQuests, dayOrders, compareQuestsFallback, isMoaiBoardFilter]);

  const todayQuests = React.useMemo(() => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + planningDayOffset);
    return getQuestsForDate(targetDate);
  }, [getQuestsForDate, planningDayOffset]);

  const activeRunningQuest = React.useMemo(() => {
    return activeQuests?.find((q: any) => {
      if (q.status !== "challenging" && q.status !== "almost") return false;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + planningDayOffset);
      const dateStr = format(targetDate, "yyyy-MM-dd");
      const qDate = q.startDate ? new Date(q.startDate) : (q.createdAt ? new Date(q.createdAt) : null);
      if (!qDate) return false;
      return format(qDate, "yyyy-MM-dd") === dateStr;
    }) || null;
  }, [activeQuests, planningDayOffset]);

  // Slide transition sub-view: 'planning' (TODAY PLANNING) vs 'focus' (脳みその画面) vs 'moai' (MOAI活動ログ)
  const [todaySubView, setTodaySubView] = useState<'planning' | 'focus' | 'moai'>(() => {
    try {
      const saved = localStorage.getItem('today_sub_view');
      if (saved === 'focus' || saved === 'planning' || saved === 'moai') return saved;
    } catch {}
    return 'planning';
  });

  const handleSubViewChange = (mode: 'planning' | 'focus' | 'moai') => {
    setTodaySubView(mode);
    try { localStorage.setItem('today_sub_view', mode); } catch {}
    if (mode === 'planning') {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 550);
    }
  };

  const moaiWeekCount = React.useMemo(() => {
    const now = new Date();
    const wStart = startOfWeek(now, { weekStartsOn: 1 });
    const wEnd = endOfWeek(now, { weekStartsOn: 1 });
    let count = 0;
    const counted = new Set<string>();

    (activeQuests || []).forEach(q => {
      if (!isMoaiQuest(q)) return;
      const d = q.clearedAt ? new Date(q.clearedAt) : (q.startDate ? new Date(q.startDate) : (q.createdAt ? new Date(q.createdAt) : null));
      if (d && isWithinInterval(d, { start: wStart, end: wEnd })) {
        counted.add(`quest-${q.id}`);
        count++;
      }
    });

    (history || []).forEach((h: any) => {
      if (!isMoaiQuest(h)) return;
      const key = h.questId ? `quest-${h.questId}` : `hist-${h.id}`;
      if (counted.has(key)) return;
      const d = h.clearedAt ? new Date(h.clearedAt) : (h.recordedDate ? new Date(h.recordedDate) : (h.createdAt ? new Date(h.createdAt) : null));
      if (d && isWithinInterval(d, { start: wStart, end: wEnd })) {
        counted.add(key);
        count++;
      }
    });

    return count;
  }, [activeQuests, history]);

  const oneOffTemplates = React.useMemo(() => {
    return (templates || []).filter(t => {
      if (t.questType !== "Free" || !t.isActive) return false;

      const isCompleted = (t.executedCount || 0) >= (t.frequency || 1);
      
      if (isCompleted) {
        if (!history) return false;
        
        // If today or tomorrow planning, we only keep it visible if it was cleared specifically on that target date
        const clearedOnTargetDate = history.some(h => 
          h.templateId === t.id && 
          h.finalStatus === 'cleared' && 
          format(new Date(h.recordedAt), "yyyy-MM-dd") === targetDateStr
        );
        
        if (!clearedOnTargetDate) return false;
      }
      return true;
    });
  }, [templates, history, targetDateStr]);

  const [timelineInterval, setTimelineInterval] = useState<30 | 60>(() => {
    try {
      const saved = localStorage.getItem('timeline_interval');
      return saved === '60' ? 60 : 30;
    } catch {
      return 30;
    }
  });

  type DeviceProfileId = 'iphone' | 'ipad' | 'macbook' | 'desktop';

  const DEVICE_PROFILES: Record<DeviceProfileId, {
    label: string;
    defaultCardWidth: number;
    defaultLineGap: number;
    minCard: number;
    maxCard: number;
    minGap: number;
    maxGap: number;
  }> = {
    iphone: {
      label: '📱 iPhone',
      defaultCardWidth: 205,
      defaultLineGap: 24,
      minCard: 130,
      maxCard: 310,
      minGap: 8,
      maxGap: 110,
    },
    ipad: {
      label: '📲 iPad mini',
      defaultCardWidth: 290,
      defaultLineGap: 52,
      minCard: 180,
      maxCard: 500,
      minGap: 16,
      maxGap: 200,
    },
    macbook: {
      label: '💻 MacBook Air',
      defaultCardWidth: 360,
      defaultLineGap: 76,
      minCard: 200,
      maxCard: 620,
      minGap: 20,
      maxGap: 260,
    },
    desktop: {
      label: '🖥️ Desktop',
      defaultCardWidth: 460,
      defaultLineGap: 104,
      minCard: 220,
      maxCard: 720,
      minGap: 24,
      maxGap: 320,
    },
  };

  const detectDeviceProfile = (): DeviceProfileId => {
    if (typeof window === 'undefined') return 'macbook';
    const w = window.innerWidth;
    if (w < 640) return 'iphone';
    if (w < 1024) return 'ipad';
    if (w < 1536) return 'macbook';
    return 'desktop';
  };

  const loadProfileCardWidth = (profile: DeviceProfileId): number => {
    const cfg = DEVICE_PROFILES[profile];
    try {
      const saved = localStorage.getItem(`planning_card_width_${profile}`);
      const num = Number(saved);
      if (num && num >= cfg.minCard && num <= cfg.maxCard) return num;
      // Fallback migration for desktop/macbook legacy key if present
      if (profile === 'desktop' || profile === 'macbook') {
        const legacy = Number(localStorage.getItem('planning_card_width') || localStorage.getItem('column_spacing'));
        if (legacy && legacy >= cfg.minCard && legacy <= cfg.maxCard) return legacy;
      }
    } catch {}
    return cfg.defaultCardWidth;
  };

  const loadProfileLineGap = (profile: DeviceProfileId): number => {
    const cfg = DEVICE_PROFILES[profile];
    try {
      const saved = localStorage.getItem(`planning_line_gap_${profile}`);
      const num = Number(saved);
      if (!Number.isNaN(num) && saved !== null && num >= cfg.minGap && num <= cfg.maxGap) return num;
    } catch {}
    return cfg.defaultLineGap;
  };

  const [deviceProfile, setDeviceProfile] = useState<DeviceProfileId>(() => detectDeviceProfile());
  const currentProfileCfg = DEVICE_PROFILES[deviceProfile];

  const [cardWidth, setCardWidth] = useState<number>(() => loadProfileCardWidth(detectDeviceProfile()));
  const [lineGapWidth, setLineGapWidth] = useState<number>(() => loadProfileLineGap(detectDeviceProfile()));

  // Automatically switch profile & load that profile's saved values when viewport crosses device breakpoints
  useEffect(() => {
    const handleProfileResize = () => {
      const nextProfile = detectDeviceProfile();
      setDeviceProfile(prev => {
        if (prev !== nextProfile) {
          setCardWidth(loadProfileCardWidth(nextProfile));
          setLineGapWidth(loadProfileLineGap(nextProfile));
        }
        return nextProfile;
      });
    };
    window.addEventListener('resize', handleProfileResize);
    return () => window.removeEventListener('resize', handleProfileResize);
  }, []);

  const handleCardWidthChange = (val: number) => {
    setCardWidth(val);
    try {
      localStorage.setItem(`planning_card_width_${deviceProfile}`, String(val));
      if (deviceProfile === 'desktop' || deviceProfile === 'macbook') {
        localStorage.setItem('planning_card_width', String(val));
      }
    } catch {}
    setTimeout(() => window.dispatchEvent(new Event('resize')), 20);
  };

  const handleLineGapChange = (val: number) => {
    setLineGapWidth(val);
    try {
      localStorage.setItem(`planning_line_gap_${deviceProfile}`, String(val));
    } catch {}
    setTimeout(() => window.dispatchEvent(new Event('resize')), 20);
  };

  const handleResetDeviceLayout = () => {
    const cfg = DEVICE_PROFILES[deviceProfile];
    setCardWidth(cfg.defaultCardWidth);
    setLineGapWidth(cfg.defaultLineGap);
    try {
      localStorage.removeItem(`planning_card_width_${deviceProfile}`);
      localStorage.removeItem(`planning_line_gap_${deviceProfile}`);
    } catch {}
    toast.success(`${cfg.label} の最適サイズ（カード ${cfg.defaultCardWidth}px / 線幅 ${cfg.defaultLineGap}px）に戻しました`);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 30);
  };

  const colSpacing = cardWidth;
  const setColSpacing = setCardWidth;

  const timeSlots = Array.from({ length: timelineInterval === 30 ? 36 : 18 }, (_, i) => {
    const totalMinutes = i * timelineInterval + 6 * 60; // 06:00開始
    const startHour = Math.floor(totalMinutes / 60);
    const startMin = totalMinutes % 60;
    const endTotalMinutes = totalMinutes + timelineInterval;
    const endHour = Math.floor(endTotalMinutes / 60);
    const endMin = endTotalMinutes % 60;

    const label = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}-${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
    return { id: label, label };
  });

  const handleMouseDown = (e: React.MouseEvent, itemId: number, mode: 'plan' | 'sort' = 'plan') => {
    e.preventDefault();
    e.stopPropagation(); // Stop propagation to prevent conflict
    const q = activeQuests?.find(item => item.id === itemId);
    setDragState({
      active: true,
      itemId,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      adhocPreview: !!q?.isAdhoc
    });
  };

  const handleTouchStart = (e: React.TouchEvent, itemId: number, mode: 'plan' | 'sort' = 'plan') => {
    const touch = e.touches[0];
    e.stopPropagation();
    const q = activeQuests?.find(item => item.id === itemId);
    setDragState({
      active: true,
      itemId,
      mode,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      adhocPreview: !!q?.isAdhoc
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.active) return;
      setDragState(prev => ({ ...prev, currentX: e.clientX, currentY: e.clientY }));

      // Track hovered column
      const elementsUnder = document.elementsFromPoint(e.clientX, e.clientY);
      const colEl = elementsUnder.map(el => el.closest('[data-column-date]')).find(Boolean);
      const hDate = colEl ? colEl.getAttribute('data-column-date') : null;
      setHoveredColumnDate(hDate);

      // Horizontal slide detection for 隙間時間 (Adhoc) indent toggle
      if (dragState.mode === 'sort' && dragState.itemId) {
        const deltaX = e.clientX - dragState.startX;
        if (!dragState.adhocPreview && deltaX > 25) {
          setDragState(prev => ({ ...prev, adhocPreview: true }));
          if (window.navigator?.vibrate) window.navigator.vibrate(15);
        } else if (dragState.adhocPreview && deltaX < -20) {
          setDragState(prev => ({ ...prev, adhocPreview: false }));
          if (window.navigator?.vibrate) window.navigator.vibrate(15);
        }
      }

      // Reorder Logic (Swiss Swap) when dragging sort handle within same column
      if (dragState.mode === 'sort' && dragState.itemId) {
        const sortTarget = elementsUnder.map(el => el.closest('[data-sort-id]')).find(Boolean);
        if (sortTarget) {
          const targetId = Number(sortTarget.getAttribute('data-sort-id'));
          const sortDate = sortTarget.getAttribute('data-sort-date') || hoveredColumnDate;
          if (targetId && targetId !== dragState.itemId && sortDate) {
            setDayOrders(prev => {
              const currentList = prev[sortDate] || [];
              const fromIndex = currentList.indexOf(dragState.itemId!);
              const toIndex = currentList.indexOf(targetId);
              if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
                const nextList = [...currentList];
                nextList.splice(fromIndex, 1);
                nextList.splice(toIndex, 0, dragState.itemId!);
                const updated = { ...prev, [sortDate]: nextList };
                dayOrdersRef.current = updated;
                return updated;
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
      if (e.cancelable) {
        // Don't preventDefault if touching inside a dialog (allows textarea scrolling/input)
        const target = e.target as HTMLElement;
        if (!target.closest('[role="dialog"]')) {
          e.preventDefault();
        }
      }

      // Track hovered column
      const elementsUnder = document.elementsFromPoint(touch.clientX, touch.clientY);
      const colEl = elementsUnder.map(el => el.closest('[data-column-date]')).find(Boolean);
      const hDate = colEl ? colEl.getAttribute('data-column-date') : null;
      setHoveredColumnDate(hDate);

      // Horizontal slide detection for 隙間時間 (Adhoc) indent toggle
      if (dragState.mode === 'sort' && dragState.itemId) {
        const deltaX = touch.clientX - dragState.startX;
        if (!dragState.adhocPreview && deltaX > 25) {
          setDragState(prev => ({ ...prev, adhocPreview: true }));
          if (window.navigator?.vibrate) window.navigator.vibrate(15);
        } else if (dragState.adhocPreview && deltaX < -20) {
          setDragState(prev => ({ ...prev, adhocPreview: false }));
          if (window.navigator?.vibrate) window.navigator.vibrate(15);
        }
      }

      // Reorder Logic (Swiss Swap) - Touch
      if (dragState.mode === 'sort' && dragState.itemId) {
        const sortTarget = elementsUnder.map(el => el.closest('[data-sort-id]')).find(Boolean);
        if (sortTarget) {
          const targetId = Number(sortTarget.getAttribute('data-sort-id'));
          const sortDate = sortTarget.getAttribute('data-sort-date') || hoveredColumnDate;
          if (targetId && targetId !== dragState.itemId && sortDate) {
            setDayOrders(prev => {
              const currentList = prev[sortDate] || [];
              const fromIndex = currentList.indexOf(dragState.itemId!);
              const toIndex = currentList.indexOf(targetId);
              if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
                const nextList = [...currentList];
                nextList.splice(fromIndex, 1);
                nextList.splice(toIndex, 0, dragState.itemId!);
                const updated = { ...prev, [sortDate]: nextList };
                dayOrdersRef.current = updated;
                return updated;
              }
              return prev;
            });
          }
        }
      }
    };

    const handleMouseUp = async (e: MouseEvent | TouchEvent) => {
      if (!dragState.active) return;

      let clientX: number;
      let clientY: number;
      if ('changedTouches' in e) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      const elements = document.elementsFromPoint(clientX, clientY);
      const slotElement = elements.map(el => el.closest('[data-slot-id]')).find(Boolean);
      const columnElement = elements.map(el => el.closest('[data-column-date]')).find(Boolean);

      if (dragState.itemId) {
        const quest = activeQuests?.find(q => q.id === dragState.itemId);

        if (slotElement && quest) {
          const slotId = slotElement.getAttribute('data-slot-id');
          const slotDateStr = slotElement.getAttribute('data-slot-date');

          if (slotId) {
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

              const currentStartDateStr = quest.startDate ? format(new Date(quest.startDate), "yyyy-MM-dd") : null;

              if (slotDateStr && slotDateStr !== currentStartDateStr) {
                // Reschedule to a different day + assign to slot
                const newDate = parseLocalDate(slotDateStr);
                const newSlots = [slotId];
                await updateQuest.mutateAsync({
                  questId: dragState.itemId,
                  startDate: newDate,
                  plannedTimeSlot: JSON.stringify(newSlots)
                });
                toast.success(`${format(newDate, "M/d (E)")} ${slotId} に配置しました`);
                refreshAll();
              } else {
                const filtered = currentSlots.filter(s =>
                  s !== slotId &&
                  normalizeSlotForInterval(s, timelineInterval) !== slotId &&
                  normalizeSlotForInterval(slotId, timelineInterval === 60 ? 30 : 60) !== s
                );
                const newSlots = [...filtered, slotId];
                await updateQuest.mutateAsync({ questId: dragState.itemId, plannedTimeSlot: JSON.stringify(newSlots) });
                toast.success(`Planned for ${slotId}`);
                refreshAll();
              }
            } catch (err) {
              toast.error("Failed to plan");
            }
          }
        } else if (columnElement && quest) {
          const colDateStr = columnElement.getAttribute('data-column-date');
          if (colDateStr) {
            try {
              const currentStartDateStr = quest.startDate ? format(new Date(quest.startDate), "yyyy-MM-dd") : null;
              if (colDateStr !== currentStartDateStr) {
                const newDate = parseLocalDate(colDateStr);
                await updateQuest.mutateAsync({
                  questId: dragState.itemId,
                  startDate: newDate,
                  plannedTimeSlot: null
                });
                toast.success(`${format(newDate, "M/d (E)")} に移動しました`);
                refreshAll();
              }
            } catch (err) {
              toast.error("Failed to reschedule");
            }
          }
        }
      }

      setDragState(prev => ({ ...prev, active: false, itemId: null, mode: 'plan' }));
      setHoveredColumnDate(null);

      // Trigger server update if order changed or adhoc state changed
      if (dragState.mode === 'sort' && dragState.itemId) {
        const quest = activeQuests?.find(q => q.id === dragState.itemId);
        if (quest) {
          // Check if adhoc state changed via horizontal drag
          if (dragState.adhocPreview !== undefined && dragState.adhocPreview !== !!quest.isAdhoc) {
            const nextAdhoc = dragState.adhocPreview;
            updateQuest.mutate({ questId: quest.id, isAdhoc: nextAdhoc }, {
              onSuccess: () => {
                toast.success(nextAdhoc ? "隙間時間（1段下げ）に設定しました" : "本予定に戻しました");
                refetchQuests();
              }
            });
          }

          const qDate = quest.startDate ? new Date(quest.startDate) : (quest.createdAt ? new Date(quest.createdAt) : null);
          if (qDate) {
            const dateStr = format(qDate, "yyyy-MM-dd");
            const dayList = dayOrdersRef.current[dateStr];
            if (dayList && dayList.length > 0) {
              const updates = dayList.map((id, index) => ({ questId: id, order: index + 1 }));
              updateOrderMutation.mutate(updates, {
                onSuccess: () => {
                  refetchQuests();
                }
              });
            }
          }
        }
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
  }, [dragState.active, dragState.itemId, dragState.mode, dragState.adhocPreview, activeQuests]);

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
      const newSlots = currentSlots.filter(s =>
        s !== slotId &&
        normalizeSlotForInterval(s, timelineInterval) !== slotId &&
        normalizeSlotForInterval(slotId, timelineInterval === 60 ? 30 : 60) !== s
      );
      const val = newSlots.length === 0 ? null : JSON.stringify(newSlots);
      await updateQuest.mutateAsync({ questId, plannedTimeSlot: val });
      toast.success("Link removed");
      refreshAll();
    } catch (err) {
      toast.error("Failed to unlink");
    }
  };

  // SHELF LOGIC
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + planningDayOffset);
  const targetStr = format(targetDate, "yyyy-MM-dd");

  const fixShelfQuests = React.useMemo(() => {
    const arr: any[] = [];
    // 1. Add manual unreceived quests (no template)
    unreceivedQuests?.forEach(q => {
      if (q.questType === "Project" || q.questType === "Relax") return;
      if (!q.templateId) {
        const qDate = q.startDate ? new Date(q.startDate) : (q.createdAt ? new Date(q.createdAt) : null);
        if (qDate && format(qDate, "yyyy-MM-dd") === targetStr) {
          arr.push({ ...q, isSynthesized: false, isTargetDay: true });
        }
      }
    });

    // Helper: check if template is valid for targetDate
    const isTemplateValidForDate = (t: any, date: Date) => {
      if (t.questType === "Daily") return true;
      if (t.questType === "Weekly") {
        const days = t.daysOfWeek && t.daysOfWeek !== "[]" ? (typeof t.daysOfWeek === "string" ? JSON.parse(t.daysOfWeek) : t.daysOfWeek) : [];
        if (days.length === 0) return false;
        const dow0 = date.getDay(); // 0 is Sunday
        const dow7 = date.getDay() === 0 ? 7 : date.getDay();
        return days.includes(dow0) || days.includes(dow7);
      }
      if (t.questType === "Monthly" || t.questType === "Yearly") {
        if (t.questType === "Yearly") {
          const m = date.getMonth() + 1;
          if (t.monthOfYear !== m) return false;
        }
        const dates = t.datesOfMonth && t.datesOfMonth !== "[]" ? (typeof t.datesOfMonth === "string" ? JSON.parse(t.datesOfMonth) : t.datesOfMonth) : [];
        const weeks = t.weeksOfMonth && t.weeksOfMonth !== "[]" ? (typeof t.weeksOfMonth === "string" ? JSON.parse(t.weeksOfMonth) : t.weeksOfMonth) : [];
        const days = t.daysOfWeek && t.daysOfWeek !== "[]" ? (typeof t.daysOfWeek === "string" ? JSON.parse(t.daysOfWeek) : t.daysOfWeek) : [];

        const d = date.getDate();
        const dow0 = date.getDay();
        const dow7 = date.getDay() === 0 ? 7 : date.getDay();
        const wom = Math.ceil(d / 7);

        if (dates.length > 0) return dates.includes(d);
        if (weeks.length > 0) {
          return weeks.includes(wom) && (days.length === 0 || days.includes(dow0) || days.includes(dow7));
        }
        return false;
      }
      return false;
    };

    // 2. Add template-based FIX items
    templates?.forEach(t => {
      if (!t.isActive) return;
      if (t.questType === "Project" || t.questType === "Relax" || t.questType === "Free") return;

      const isPool = (t.questType === "Weekly" || t.questType === "Monthly") &&
        (!t.daysOfWeek || t.daysOfWeek === "[]") &&
        (!t.datesOfMonth || t.datesOfMonth === "[]");
      if (isPool) return;

      const isTargetDay = isTemplateValidForDate(t, targetDate);
      const scheduleLabel = getTemplateScheduleLabel(t);

      const alreadyPlanned = activeQuests?.some(aq => {
        if (aq.templateId !== t.id) return false;
        if (aq.status === "unreceived") return false;
        const qDate = aq.startDate ? new Date(aq.startDate) : (aq.createdAt ? new Date(aq.createdAt) : null);
        return qDate && format(qDate, "yyyy-MM-dd") === targetStr;
      }) || history?.some(hq =>
        hq.templateId === t.id &&
        hq.recordedAt && format(new Date(hq.recordedAt), "yyyy-MM-dd") === targetStr
      );

      if (alreadyPlanned) return;

      const existingUnreceived = unreceivedQuests?.find(q => {
        if (q.templateId !== t.id) return false;
        const qDate = q.startDate ? new Date(q.startDate) : (q.createdAt ? new Date(q.createdAt) : null);
        return qDate && format(qDate, "yyyy-MM-dd") === targetStr;
      });

      if (existingUnreceived && planningDayOffset === 0) {
        // We have a real quest generated for today
        if (!arr.find(x => x.id === existingUnreceived.id)) {
          arr.push({ ...existingUnreceived, isSynthesized: false, isTargetDay, scheduleLabel });
        }
      } else {
        // Synthesize for UI
        arr.push({
          id: `template-${t.id}`,
          questName: t.questName,
          projectName: t.projectName,
          questType: t.questType,
          difficulty: t.difficulty,
          templateId: t.id,
          status: "unreceived",
          isSynthesized: true,
          isTargetDay,
          scheduleLabel,
          template: t
        });
      }
    });

    // 3. Keep showing cleared targets for today so the user feels good.
    activeQuests?.forEach(q => {
      if (q.questType === "Project" || q.questType === "Relax" || q.questType === "Free") return;
      if (q.status !== "cleared") return;
      const qDate = q.startDate ? new Date(q.startDate) : (q.createdAt ? new Date(q.createdAt) : null);
      if (!qDate || format(qDate, "yyyy-MM-dd") !== targetStr) return;

      const t = templates?.find(tp => tp.id === q.templateId);
      if (!t) return;
      const isPool = (t.questType === "Weekly" || t.questType === "Monthly") &&
        (!t.daysOfWeek || JSON.parse(t.daysOfWeek).length === 0) &&
        (!t.datesOfMonth || JSON.parse(t.datesOfMonth).length === 0);
      if (isPool) return;

      if (!arr.find(x => x.id === q.id)) {
        arr.push({ ...q, isSynthesized: false, isTargetDay: true, scheduleLabel: getTemplateScheduleLabel(t) });
      }
    });

    return arr.sort((a, b) => {
      // 1. Cleared items at the end
      const aCleared = a.status === "cleared" ? 1 : 0;
      const bCleared = b.status === "cleared" ? 1 : 0;
      if (aCleared !== bCleared) return aCleared - bCleared;

      // 2. Today's target items first, off-day items below
      const aTarget = a.isTargetDay !== false ? 1 : 0;
      const bTarget = b.isTargetDay !== false ? 1 : 0;
      if (aTarget !== bTarget) return bTarget - aTarget;

      // 3. Sort consistently by templateId or quest id
      const idA = a.templateId ?? (typeof a.id === 'number' ? a.id : 0);
      const idB = b.templateId ?? (typeof b.id === 'number' ? b.id : 0);
      return idA - idB;
    });
  }, [unreceivedQuests, activeQuests, history, templates, targetStr, planningDayOffset]);

  // Project Shelf Logic (Now based on Templates)
  const projectTemplates = templates?.filter(t => {
    if (!t.isActive) return false;
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
    if (!t.isActive) return false;
    const isPool = (t.questType === "Weekly" || t.questType === "Monthly") &&
      (!t.daysOfWeek || JSON.parse(t.daysOfWeek).length === 0) &&
      (!t.datesOfMonth || JSON.parse(t.datesOfMonth).length === 0);
    return isPool;
  }) || [];

  const [orderedNonFixIds, setOrderedNonFixIds] = useState<number[]>([]);
  const updateTemplateOrder = trpc.template.updateOrder.useMutation();
  const [nonFixDragState, setNonFixDragState] = useState<{ active: boolean; itemId: number | null; startY: number; currentY: number }>({ active: false, itemId: null, startY: 0, currentY: 0 });

  useEffect(() => {
    if (nonFixTemplates.length > 0) {
      const serverIds = nonFixTemplates.map(t => t.id);
      const currentSet = new Set(orderedNonFixIds);
      const sameIds = serverIds.length === orderedNonFixIds.length && serverIds.every(id => currentSet.has(id));
      if (!sameIds) setOrderedNonFixIds(serverIds);
    }
  }, [nonFixTemplates.map(t => t.id).join(',')]);

  const orderedNonFix = orderedNonFixIds
    .map(id => nonFixTemplates.find(t => t.id === id))
    .filter(Boolean);

  const handleNonFixDragStart = (e: React.MouseEvent | React.TouchEvent, id: number) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setNonFixDragState({ active: true, itemId: id, startY: clientY, currentY: clientY });
  };

  const handleNonFixDragMove = (clientY: number) => {
    if (!nonFixDragState.active || !nonFixDragState.itemId) return;
    setNonFixDragState(s => ({ ...s, currentY: clientY }));
    const container = document.getElementById('nonfix-list');
    if (!container) return;
    const items = Array.from(container.querySelectorAll('[data-nonfix-id]')) as HTMLElement[];
    const dragIdx = orderedNonFixIds.indexOf(nonFixDragState.itemId);
    let targetIdx = dragIdx;
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) { targetIdx = i; break; }
      targetIdx = i;
    }
    if (targetIdx !== dragIdx) {
      const newIds = [...orderedNonFixIds];
      const [moved] = newIds.splice(dragIdx, 1);
      newIds.splice(targetIdx, 0, moved);
      setOrderedNonFixIds(newIds);
    }
  };

  const handleNonFixDragEnd = async () => {
    if (!nonFixDragState.active) return;
    setNonFixDragState({ active: false, itemId: null, startY: 0, currentY: 0 });
    if (orderedNonFixIds.length > 0) {
      await updateTemplateOrder.mutateAsync(
        orderedNonFixIds.map((id, idx) => ({ templateId: id, order: idx }))
      );
    }
  };

  const relaxTemplates = templates?.filter(t => t.questType === "Relax" && t.isActive) || [];

  // Helper: compute startDate for planning offset
  const getPlanningStartDate = () => {
    const d = new Date();
    if (planningDayOffset > 0) {
      d.setDate(d.getDate() + planningDayOffset);
      d.setHours(0, 0, 0, 0);
    }
    return d;
  };

  const handleReceiveFix = async (questIdOrString: number | string) => {
    let quest: any;
    let template: any;
    let isSynthesized = false;

    if (typeof questIdOrString === 'string' && questIdOrString.startsWith('template-')) {
      const tId = parseInt(questIdOrString.split('-')[1], 10);
      template = templates?.find(t => t.id === tId);
      quest = fixShelfQuests.find(q => q.id === questIdOrString);
      isSynthesized = true;
    } else {
      const questId = questIdOrString as number;
      quest = unreceivedQuests?.find(q => q.id === questId) || fixShelfQuests.find(q => q.id === questId);
      template = templates?.find(t => t.id === quest?.templateId);
    }

    if (!quest) return;

    let plannedTimeSlot: string | undefined = undefined;
    if (template && template.questType === "Daily" && template.scheduledHour != null) {
      const sh = template.scheduledHour;
      const nextHour = sh === 23 ? 24 : sh + 1;
      plannedTimeSlot = JSON.stringify([`${String(sh).padStart(2, '0')}:00-${String(nextHour).padStart(2, '0')}:00`]);
    }

    const sd = getPlanningStartDate() || new Date();

    if (isSynthesized || (planningDayOffset > 0 && quest.status === "unreceived")) {
      // Create a NEW quest for the target date since we don't have one or we don't want to move today's
      await createQuest.mutateAsync({
        questName: quest.questName,
        questType: quest.questType,
        difficulty: quest.difficulty || "1",
        templateId: template?.id,
        status: "accepted",
        startDate: sd,
        plannedTimeSlot: plannedTimeSlot
      } as any);
      toast.success(`Received for ${planningDayOffset > 0 ? "Tomorrow" : "Today"}`);
      refreshAll();
      return;
    }

    // Normal flow (Today, existing unreceived)
    await updateStatus.mutateAsync({ questId: quest.id, status: "accepted" });

    const updatePayload: any = { questId: quest.id };
    if (sd) updatePayload.startDate = sd;
    if (plannedTimeSlot) updatePayload.plannedTimeSlot = plannedTimeSlot;

    if (Object.keys(updatePayload).length > 1) {
      await updateQuest.mutateAsync(updatePayload);
    }

    toast.success("Received");
    refreshAll();
  };
  const handleReceiveNonFix = async (template: any) => {
    await createQuest.mutateAsync({
      questName: template.questName,
      questType: template.questType,
      difficulty: template.difficulty,
      templateId: template.id,
      status: "accepted",
      startDate: getPlanningStartDate(),
    } as any);
    toast.success("Received");
    refreshAll();
  };

  const handleReceiveOneOff = async (template: any) => {
    await createQuest.mutateAsync({
      questName: template.questName,
      questType: template.questType,
      difficulty: template.difficulty,
      templateId: template.id,
      status: "accepted",
      startDate: getPlanningStartDate(),
      targetCount: 1, // Instantiated quests are always single step now
    } as any);
    toast.success("Added to TODAY Plan");
    refreshAll();
  };

  // Create Instance from Project Template
  const handleReceiveProject = async (template: any) => {
    await createQuest.mutateAsync({
      questName: template.questName,
      projectName: template.parentProjectName || template.projectName,
      questType: "Project" as any,
      difficulty: template.difficulty,
      templateId: template.id,
      status: "accepted",
      startDate: getPlanningStartDate(),
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
      status: "accepted",
      startDate: getPlanningStartDate(),
    } as any);
    toast.success("Add Relax Mission");
    refreshAll();
  };

  const [isMovieStockOpen, setIsMovieStockOpen] = useState(false);
  const stockMovieCount = useMemo(() => movies?.filter((m: any) => m.status !== 'completed').length || 0, [movies]);

  const handleAddMovieToTodayMission = async (
    movieTitle: string,
    slotInfo?: { timeSlot?: string; seatName?: string }
  ) => {
    const movieTemplate = templates?.find(t => t.questType === "Relax" && t.questName?.includes("映画"));
    const noteText = slotInfo?.timeSlot
      ? `🎬 ${movieTitle} [${slotInfo.timeSlot} / 💺${slotInfo.seatName || "特等席"}]`
      : `🎬 ${movieTitle}`;

    const questTitle = `🎬 映画: ${movieTitle}`;

    await createQuest.mutateAsync({
      questName: questTitle,
      questType: "Relax" as any,
      difficulty: "1",
      templateId: movieTemplate?.id,
      status: "accepted",
      startDate: getPlanningStartDate(),
      note: noteText,
    } as any);

    if (slotInfo?.seatName) {
      toast.success(
        `🎟️ 発券完了！『${movieTitle}』をTODAYプランに追加しました (${slotInfo.seatName})`
      );
    } else {
      toast.success(`『${movieTitle}』をTODAYプランに追加しました`);
    }
    refreshAll();
  };

  const [editingRelaxTemplate, setEditingRelaxTemplate] = useState<any>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { data: historyItems } = trpc.quest.getQuestHistory.useQuery({ type: "Free", limit: 20 });

  // Memo (KAIZEN MEMO - 気付き＆アクション)
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [memoInput, setMemoInput] = useState("");
  const [memoActionInput, setMemoActionInput] = useState("");
  const { data: memoList, refetch: refetchMemos } = trpc.memo.list.useQuery();
  const createMemo = trpc.memo.create.useMutation();
  const deleteMemo = trpc.memo.delete.useMutation();
  const toggleMemo = trpc.memo.toggle.useMutation();
  const likeMemo = trpc.memo.like.useMutation();
  const [memoLikeAnimId, setMemoLikeAnimId] = useState<number | null>(null);
  const handleSaveMemo = async () => {
    if (!memoInput.trim()) return;
    await createMemo.mutateAsync({ content: memoInput.trim(), action: memoActionInput.trim() || undefined });
    setMemoInput("");
    setMemoActionInput("");
    refetchMemos();
    toast.success("気付きを保存しました");
  };
  const handleDeleteMemo = async (id: number) => {
    await deleteMemo.mutateAsync({ id });
    refetchMemos();
  };
  const handleToggleMemo = async (id: number, currentDone: boolean) => {
    await toggleMemo.mutateAsync({ id, done: !currentDone });
    refetchMemos();
  };
  const handleLikeMemo = async (id: number) => {
    setMemoLikeAnimId(id);
    await likeMemo.mutateAsync({ id });
    refetchMemos();
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
    setTimeout(() => setMemoLikeAnimId(null), 300);
  };

  // Reading & Watching Collapsible States (Persisted in localStorage)
  const [isReadingOpen, setIsReadingOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("is_reading_open");
      if (saved !== null) return saved === "true";
    } catch {}
    return false;
  });

  const [isWatchingOpen, setIsWatchingOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("is_watching_open");
      if (saved !== null) return saved === "true";
    } catch {}
    return false;
  });

  // Daily Insight
  const [isInsightOpen, setIsInsightOpen] = useState(false);
  const [insightInput, setInsightInput] = useState("");
  const [insightActionInput, setInsightActionInput] = useState("");
  const { data: insightsList, refetch: refetchInsights } = trpc.dailyInsight.list.useQuery();
  const createInsight = trpc.dailyInsight.create.useMutation();
  const toggleInsightApplied = trpc.dailyInsight.toggleApplied.useMutation();
  const deleteInsight = trpc.dailyInsight.delete.useMutation();

  const generalInsights = insightsList?.filter((i: any) => !i.date.startsWith('inv-'));
  const invInsights = insightsList?.filter((i: any) => i.date.startsWith('inv-'));

  const [isInvInsightOpen, setIsInvInsightOpen] = useState(false);
  const [invInsightInput, setInvInsightInput] = useState("");
  const [invInsightActionInput, setInvInsightActionInput] = useState("");

  const handleSaveInsight = async () => {
    if (!insightInput.trim()) return;
    await createInsight.mutateAsync({ insight: insightInput.trim(), action: insightActionInput.trim(), date: targetDateStr });
    setInsightInput("");
    setInsightActionInput("");
    refetchInsights();
    toast.success("Insight saved");
  };

  const handleSaveInvInsight = async () => {
    if (!invInsightInput.trim()) return;
    await createInsight.mutateAsync({ insight: invInsightInput.trim(), action: invInsightActionInput.trim(), date: `inv-${targetDateStr}` });
    setInvInsightInput("");
    setInvInsightActionInput("");
    refetchInsights();
    toast.success("Investment Insight saved");
  };
  const handleDeleteInsight = async (id: number) => {
    await deleteInsight.mutateAsync({ id });
    refetchInsights();
  };
  const handleToggleInsight = async (id: number, currentApplied: boolean) => {
    await toggleInsightApplied.mutateAsync({ id, applied: !currentApplied });
    refetchInsights();
  };

  const [restoringHistoryItem, setRestoringHistoryItem] = useState<any>(null);

  const handleRestoreHistory = async (item: any, frequency: number) => {
    await createTemplate.mutateAsync({
      questName: item.questName,
      questType: "Free",
      difficulty: "1",
      frequency: frequency,
    } as any);
    toast.success("Added to ONE-OFF (IN PROGRESS)");
    refreshAll();
  };

  // Mobile side-by-side columns horizontal swipe navigation
  const [mobileActiveCol, setMobileActiveCol] = useState<'left' | 'right'>('left');
  const mobileColumnsContainerRef = useRef<HTMLDivElement>(null);

  const scrollToMobileColumn = (col: 'left' | 'right') => {
    setMobileActiveCol(col);
    if (!mobileColumnsContainerRef.current) return;
    const container = mobileColumnsContainerRef.current;
    if (col === 'left') {
      container.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
    }
  };

  const handleMobileColumnsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const containerWidth = e.currentTarget.offsetWidth;
    if (scrollLeft > containerWidth * 0.35) {
      setMobileActiveCol('right');
    } else {
      setMobileActiveCol('left');
    }
  };

  const { colors: uiColors } = useCustomUiColors();

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div
      className="min-h-screen bg-background text-foreground relative selection:bg-sky-500/20 transition-colors duration-200"
      style={{ backgroundColor: uiColors.pageBg }}
      onClick={() => setIsRelaxOpen(false)}
    >
      {/* Ambient Apple Sonoma / iOS Mesh Gradient Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-[18%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-sky-400/[0.06] blur-[110px]" />
        <div className="absolute top-[15%] -right-[12%] w-[45vw] h-[45vw] rounded-full bg-indigo-400/[0.05] blur-[120px]" />
        <div className="absolute -bottom-[15%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-amber-300/[0.05] blur-[120px]" />
      </div>

      <main className={`relative z-10 ${planningViewMode === 'weekly' ? 'w-full max-w-none px-2.5 sm:px-8 py-3 sm:py-6' : 'max-w-[1600px] 2xl:max-w-[1720px] px-2.5 sm:px-6 lg:px-10 py-3 sm:py-6'} mx-auto overflow-x-hidden`}>
        {/* Top Floating Apple Glass Header Bar */}
        <div className="apple-glass rounded-3xl p-3 sm:px-5 sm:py-3.5 mb-4 sm:mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center shadow-md shadow-slate-900/10 font-black text-base tracking-tighter select-none">
                Q
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 leading-none">Quest Log</h1>
                  {(progression?.currentStreak ?? 0) > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-600 font-bold text-xs shadow-2xs">
                      <Flame className="fill-orange-500 text-orange-500 w-3.5 h-3.5" />
                      <span>{progression?.currentStreak}日連続</span>
                    </div>
                  )}
                </div>
                <p className="text-[10.5px] text-slate-400 font-medium mt-0.5 hidden sm:block">
                  Personal Mission & Life Rhythm OS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <ColorStudioButton compact />
              <QuestCreateDialog
                onCreated={refreshAll}
                planningDayOffset={planningDayOffset}
                trigger={
                  <button className="h-8 px-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer">
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>作成</span>
                  </button>
                }
              />
            </div>
          </div>

          {/* Sub Navigation Bar - Apple Pill Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 lg:pb-0 text-xs">
            <ColorStudioButton />
            <Button variant="ghost" size="sm" onClick={() => window.location.href = "/rhythm"} className="rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold shrink-0 text-xs h-8 px-3.5 transition-all">
              <Activity className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> 生活リズム
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = "/awareness"} className="rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold shrink-0 text-xs h-8 px-3.5 transition-all">
              <Lightbulb className="w-3.5 h-3.5 mr-1.5 fill-amber-500/30 text-amber-500" /> 意識を育てる
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = "/templates"} className="rounded-full hover:bg-slate-200/60 text-slate-600 font-semibold shrink-0 text-xs h-8 px-3">
              Templates
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = "/projects"} className="rounded-full hover:bg-slate-200/60 text-slate-600 font-semibold shrink-0 text-xs h-8 px-3">
              Projects
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = "/history"} className="rounded-full hover:bg-slate-200/60 text-slate-600 font-semibold shrink-0 text-xs h-8 px-3">
              <History className="w-3.5 h-3.5 mr-1" /> 履歴
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = "/admin/db"} className="rounded-full hover:bg-slate-200/60 text-slate-500 font-semibold shrink-0 text-xs h-8 px-3">
              <Database className="w-3.5 h-3.5 mr-1" /> DB
            </Button>
            <div className="hidden lg:block pl-1">
              <QuestCreateDialog
                onCreated={refreshAll}
                planningDayOffset={planningDayOffset}
                trigger={
                  <button className="h-8 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer">
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>新規ミッション</span>
                  </button>
                }
              />
            </div>
          </div>
        </div>

        <Tabs defaultValue="today" value={activeTab} onValueChange={setActiveTab}>
          {/* Mode & Tab Switcher Row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-5">
            {/* SLIDE NAVIGATION BAR: [ 📋 今日の計画 (TODAY PLANNING) | 🗿 集中モード (脳みその画面) | 🗿 MOAI活動ログ ] */}
            <div className="flex items-center gap-1 apple-segmented overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("today");
                  handleSubViewChange('planning');
                }}
                className={`px-3.5 py-1.5 rounded-[10px] text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === 'today' && todaySubView === 'planning'
                    ? 'apple-segmented-item-active font-black'
                    : 'text-slate-600 dark:text-stone-400 hover:text-slate-900 dark:hover:text-stone-100'
                }`}
              >
                <span>📋</span>
                <span>TODAY PLANNING</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'today' && todaySubView === 'planning'
                    ? 'bg-slate-900/10 dark:bg-white/20 text-slate-900 dark:text-white font-bold'
                    : 'bg-slate-200/70 dark:bg-stone-700'
                }`}>
                  {todayQuests.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("today");
                  handleSubViewChange('focus');
                }}
                className={`px-3.5 py-1.5 rounded-[10px] text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === 'today' && todaySubView === 'focus'
                    ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                    : 'text-slate-600 dark:text-stone-400 hover:text-slate-900 dark:hover:text-stone-100'
                }`}
              >
                <span>🗿</span>
                <span>脳みその画面 (FOCUS)</span>
                {activeRunningQuest && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("today");
                  handleSubViewChange('moai');
                }}
                className={`px-3.5 py-1.5 rounded-[10px] text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === 'today' && todaySubView === 'moai'
                    ? 'bg-amber-600 text-white dark:bg-amber-500 dark:text-stone-950 shadow-sm font-black'
                    : 'text-slate-600 dark:text-stone-400 hover:text-slate-900 dark:hover:text-stone-100'
                }`}
              >
                <span>🗿</span>
                <span>MOAI活動ログ</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 font-mono font-bold">
                  今週 {moaiWeekCount}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-2.5">
              {/* Quick banner if a quest is RUNNING */}
              {activeRunningQuest && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("today");
                    handleSubViewChange(todaySubView === 'focus' ? 'planning' : 'focus');
                  }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-all cursor-pointer group shadow-2xs"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                  <span className="truncate max-w-[180px] sm:max-w-[240px]">⚡ 実行中: {activeRunningQuest.questName}</span>
                  <span className="shrink-0 text-[11px] underline font-extrabold group-hover:translate-x-0.5 transition-transform">
                    {todaySubView === 'focus' ? '◀ 計画へ' : '集中画面へ ▶'}
                  </span>
                </button>
              )}

              <TabsList className="apple-segmented h-auto p-1 shrink-0">
                <TabsTrigger value="today" className="rounded-[9px] px-3.5 py-1 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Today
                </TabsTrigger>
                <TabsTrigger value="calendar" className="rounded-[9px] px-3.5 py-1 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Calendar
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="today" className="space-y-6 animate-fade-in">

            {/* SLIDING HORIZONTAL CONTAINER */}
            <div className="relative w-full overflow-hidden">
              <div
                className="flex w-[300%] transition-transform duration-500 ease-in-out items-start"
                style={{
                  transform:
                    todaySubView === 'planning'
                      ? 'translateX(0%)'
                      : todaySubView === 'focus'
                      ? 'translateX(-33.333333%)'
                      : 'translateX(-66.666666%)',
                }}
              >
                {/* SLIDE 1: TODAY / WEEKLY PLANNING (SHELF 1) */}
                <div
                  className={`w-1/3 shrink-0 pr-2 transition-all duration-300 ${
                    todaySubView === 'planning' ? 'opacity-100 h-auto' : 'opacity-0 pointer-events-none h-0 overflow-hidden'
                  }`}
                >
                  {/* SHELF 1: TODAY / WEEKLY PLANNING (Apple Glass Bento Stage) */}
                  <section className="apple-glass rounded-3xl p-4 sm:p-6 lg:p-8 space-y-6">
              {/* Header and iOS Control Center Bar */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-stone-800/80 select-none">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Apple Watch-style Mini Activity Ring */}
                  {(() => {
                    const totalCount = todayQuests.length;
                    const clearedCount = todayQuests.filter(q => q.status === 'cleared').length;
                    const pct = totalCount > 0 ? Math.round((clearedCount / totalCount) * 100) : 0;
                    const radius = 15;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = circumference - (pct / 100) * circumference;
                    return (
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 38 38">
                            <circle cx="19" cy="19" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-200/80 dark:text-stone-800" />
                            <circle
                              cx="19"
                              cy="19"
                              r={radius}
                              fill="none"
                              stroke="url(#appleRingGrad)"
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              className="transition-all duration-500 ease-out"
                            />
                            <defs>
                              <linearGradient id="appleRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#0ea5e9" />
                                <stop offset="100%" stopColor="#10b981" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <span className="absolute text-[9px] font-black font-mono text-slate-700 dark:text-stone-200">
                            {pct}%
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">
                              {planningViewMode === 'today'
                                ? (planningDayOffset === 0 ? "Today Planning" : "Tomorrow Planning")
                                : "1-Week Planning & Insights"
                              }
                            </h2>
                            <span className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
                              {format(targetDate, "M/d (E)")}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-stone-400 font-medium mt-1 flex items-center gap-2">
                            <span>完了 {clearedCount}/{totalCount}</span>
                            <span>•</span>
                            <span>タスクをドラッグして右の時間枠へ接続</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {planningViewMode === 'today' && (
                    <div className="flex items-center gap-1 apple-segmented ml-1">
                      <button
                        onClick={() => setPlanningDayOffset(Math.max(0, planningDayOffset - 1))}
                        disabled={planningDayOffset === 0}
                        className="p-1 rounded-lg hover:bg-white/80 disabled:opacity-25 transition-all cursor-pointer"
                        title="今日"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-700 dark:text-stone-200" />
                      </button>
                      <button
                        onClick={() => setPlanningDayOffset(Math.min(1, planningDayOffset + 1))}
                        disabled={planningDayOffset === 1}
                        className="p-1 rounded-lg hover:bg-white/80 disabled:opacity-25 transition-all cursor-pointer"
                        title="明日"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-700 dark:text-stone-200" />
                      </button>
                    </div>
                  )}

                  {planningViewMode === 'weekly' && (
                    <div className="flex items-center gap-1 apple-segmented text-xs">
                      <button
                        onClick={() => setWeeklyActiveDate(prev => {
                          const d = new Date(prev);
                          d.setDate(d.getDate() - 7);
                          return d;
                        })}
                        className="p-1 hover:bg-white/80 rounded-lg transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setWeeklyActiveDate(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                        className="px-2.5 py-1 bg-white dark:bg-stone-800 rounded-lg shadow-2xs transition-colors font-bold text-[10.5px] cursor-pointer"
                      >
                        今週
                      </button>
                      <button
                        onClick={() => setWeeklyActiveDate(prev => {
                          const d = new Date(prev);
                          d.setDate(d.getDate() + 7);
                          return d;
                        })}
                        className="p-1 hover:bg-white/80 rounded-lg transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10.5px] text-slate-500 px-2 font-mono font-semibold">
                        {format(weeklyActiveDate, "MM/dd")} - {format(new Date(weeklyActiveDate.getTime() + 6 * 24 * 60 * 60 * 1000), "MM/dd")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Granularity, Spacing & View controls (iOS Control Center Pills) */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  {/* Per-Device Card Width & Connection Line Width Sliders */}
                  <div className="flex flex-wrap items-center gap-2 text-xs apple-segmented px-2.5 py-1.5">
                    <button
                      type="button"
                      onClick={handleResetDeviceLayout}
                      title="クリックでこの端末の最適サイズにリセット（端末ごとに個別保存されます）"
                      className="px-2 py-0.5 rounded-md bg-white/90 hover:bg-white text-slate-700 font-bold text-[10px] shadow-2xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                    >
                      <span>{currentProfileCfg.label}</span>
                      <span className="text-slate-400">↺</span>
                    </button>

                    {/* Mission Card Width Slider */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-600 text-[10.5px] whitespace-nowrap">カード幅</span>
                      <input
                        type="range"
                        min={currentProfileCfg.minCard}
                        max={currentProfileCfg.maxCard}
                        step="5"
                        value={cardWidth}
                        onChange={(e) => handleCardWidthChange(Number(e.target.value))}
                        className="w-16 sm:w-20 accent-sky-500 cursor-ew-resize h-1.5 bg-slate-300/80 rounded-lg appearance-none"
                      />
                      <span className="font-mono text-[10px] text-slate-500 w-8 text-right">{cardWidth}</span>
                    </div>

                    <div className="w-px h-3.5 bg-slate-300/70 hidden sm:block" />

                    {/* Connection Line Horizontal Gap Slider */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-indigo-600 text-[10.5px] whitespace-nowrap">線の幅</span>
                      <input
                        type="range"
                        min={currentProfileCfg.minGap}
                        max={currentProfileCfg.maxGap}
                        step="4"
                        value={lineGapWidth}
                        onChange={(e) => handleLineGapChange(Number(e.target.value))}
                        className="w-16 sm:w-20 accent-indigo-500 cursor-ew-resize h-1.5 bg-slate-300/80 rounded-lg appearance-none"
                      />
                      <span className="font-mono text-[10px] text-indigo-600 font-semibold w-7 text-right">{lineGapWidth}</span>
                    </div>
                  </div>

                  {/* Granularity Toggle */}
                  <div className="flex apple-segmented text-xs">
                    <button
                      onClick={() => {
                        setTimelineInterval(30);
                        try { localStorage.setItem('timeline_interval', '30'); } catch {}
                      }}
                      className={`px-3 py-1 rounded-[9px] font-bold transition-all cursor-pointer ${
                        timelineInterval === 30
                          ? 'apple-segmented-item-active'
                          : 'text-slate-500 hover:text-slate-900 dark:text-stone-400'
                      }`}
                    >
                      30分
                    </button>
                    <button
                      onClick={() => {
                        setTimelineInterval(60);
                        try { localStorage.setItem('timeline_interval', '60'); } catch {}
                      }}
                      className={`px-3 py-1 rounded-[9px] font-bold transition-all cursor-pointer ${
                        timelineInterval === 60
                          ? 'apple-segmented-item-active'
                          : 'text-slate-500 hover:text-slate-900 dark:text-stone-400'
                      }`}
                    >
                      1時間
                    </button>
                  </div>

                  {/* Main View Toggle Buttons */}
                  <div className="flex apple-segmented text-xs">
                    <button
                      onClick={() => {
                        setPlanningViewMode('today');
                        try { localStorage.setItem('planning_view_mode', 'today'); } catch {}
                      }}
                      className={`px-3 py-1 rounded-[9px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        planningViewMode === 'today'
                          ? 'apple-segmented-item-active'
                          : 'text-slate-500 hover:text-slate-900 dark:text-stone-400'
                      }`}
                    >
                      🎯 今日集中 (Day)
                    </button>
                    <button
                      onClick={() => {
                        setPlanningViewMode('weekly');
                        try { localStorage.setItem('planning_view_mode', 'weekly'); } catch {}
                      }}
                      className={`px-3 py-1 rounded-[9px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        planningViewMode === 'weekly'
                          ? 'apple-segmented-item-active'
                          : 'text-slate-500 hover:text-slate-900 dark:text-stone-400'
                      }`}
                    >
                      📅 1週間 (7 Days)
                    </button>
                  </div>

                  {/* Quick MOAI Filter Button */}
                  <button
                    type="button"
                    onClick={() => setIsMoaiBoardFilter(prev => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                      isMoaiBoardFilter
                        ? 'bg-amber-500 text-stone-950 border-amber-600 font-black shadow-xs ring-2 ring-amber-500/40'
                        : 'bg-white/70 dark:bg-stone-800/70 hover:bg-white text-slate-600 dark:text-stone-300 border-slate-200/80 dark:border-stone-700'
                    }`}
                    title="MOAI活動のミッションのみ絞り込み表示します"
                  >
                    <span>🗿</span>
                    <span>MOAIのみ</span>
                    {isMoaiBoardFilter && (
                      <span className="w-2 h-2 rounded-full bg-stone-950 dark:bg-stone-900 animate-pulse" />
                    )}
                  </button>

                  {/* Moai Weekend Rhythm Toggle */}
                  <div className="flex items-center gap-1 apple-segmented text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isMoaiRhythmActive;
                        setIsMoaiRhythmActive(next);
                        try { localStorage.setItem('moai_rhythm_active', String(next)); } catch {}
                        toast.success(next ? "🗿 土日モアイリズム表示をONにしました（土日のみ自動適用）" : "モアイリズム表示をOFFにしました");
                        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
                      }}
                      className={`px-3 py-1 rounded-[9px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isMoaiRhythmActive
                          ? 'bg-amber-500 text-stone-950 shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-900 dark:text-stone-400'
                      }`}
                      title="土日のみモアイの1日リズム（ゴールデンタイム・だれ注意・夜モード等の暗示）を表示します（テスト切り替え）"
                    >
                      <span>✨</span>
                      <span>土日リズム {isMoaiRhythmActive ? 'ON' : 'OFF'}</span>
                    </button>
                    {isMoaiRhythmActive && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = !isForceRhythmPreview;
                          setIsForceRhythmPreview(next);
                          try { localStorage.setItem('moai_rhythm_force_preview', String(next)); } catch {}
                          toast.info(next ? "👀 平日でもテストプレビュー表示中（本来は土日限定）" : "土日のみ表示に戻しました");
                          setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
                        }}
                        className={`px-2 py-1 rounded-[8px] text-[10px] font-bold transition-all cursor-pointer ${
                          isForceRhythmPreview
                            ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 ring-1 ring-amber-400 font-black'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                        title="本来は土日限定ですが、平日（月〜金）でも今すぐ画面で確認できるテストプレビューモードです"
                      >
                        {isForceRhythmPreview ? "平日も表示中(テスト)" : "土日のみ"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {planningViewMode === 'today' ? (
                /* TODAY VIEW (Apple Glass Stage with Sweeping Bezier Curves) */
                <div className="relative w-full max-w-full pt-1">
                  <div
                    ref={containerRef}
                    style={{ gap: `${lineGapWidth}px` }}
                    className="flex justify-center items-start relative min-h-[500px] w-full max-w-full"
                  >
                    <ConnectionLines
                      quests={todayQuests}
                      parentRef={containerRef as React.RefObject<HTMLDivElement>}
                      templates={templates || []}
                      onUnlink={handleUnlink}
                      timelineInterval={timelineInterval}
                    />

                    <div
                      className="flex flex-col gap-2 sm:gap-3 rounded-2xl p-0.5 sm:p-2 z-20 min-h-[300px] shrink-0 transition-all duration-150 min-w-0"
                      style={{
                        width: `${cardWidth}px`,
                        maxWidth: `calc(100% - ${lineGapWidth + (isMobile ? 72 : 132)}px)`,
                      }}
                    >
                      <div className="flex items-center justify-between px-1.5 pb-1">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span>MISSIONS</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-stone-800 text-slate-600 dark:text-stone-300 font-mono text-[10px]">
                            {todayQuests.length}
                          </span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {todayQuests.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleSortByTime(targetDateStr)}
                              className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="時間枠の早い順に並び替えて保存"
                            >
                              <Clock className="w-2.5 h-2.5" />
                              時間順に整列
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quick Create Button inside Mission Column */}
                      <QuestCreateDialog
                        onCreated={refreshAll}
                        defaultDate={targetDate}
                        trigger={
                          <button className="w-full py-2 text-xs font-bold border border-dashed border-slate-300/90 dark:border-stone-700 rounded-2xl text-slate-400 hover:text-sky-600 hover:border-sky-300 hover:bg-white/80 dark:hover:bg-stone-800/60 transition-all select-none flex items-center justify-center gap-1 cursor-pointer active:scale-[0.99]">
                            <Plus className="w-3.5 h-3.5" />
                            <span>新規タスクを追加</span>
                          </button>
                        }
                      />

                      {todayQuests.map(q => {
                        const isDraggingCurrent = dragState.itemId === q.id && dragState.mode === 'sort';
                        const effectiveAdhoc = isDraggingCurrent
                          ? (dragState.adhocPreview !== undefined ? dragState.adhocPreview : !!q.isAdhoc)
                          : !!q.isAdhoc;

                        return (
                          <div
                            id={`source-${q.id}`}
                            key={q.id}
                            data-sort-id={q.id}
                            data-sort-date={targetDateStr}
                            className={`cursor-default relative rounded-2xl z-20 transition-all duration-150 ${
                              effectiveAdhoc ? 'ml-4 sm:ml-5 w-[calc(100%-1rem)] sm:w-[calc(100%-1.25rem)]' : 'ml-0 w-full'
                            } ${
                              isDraggingCurrent
                                ? 'shadow-2xl scale-105 z-50 ring-2 ring-sky-500'
                                : ''
                            }`}
                          >
                            <TodayItem
                              quest={q}
                              templates={templates || []}
                              onStatusChange={() => refreshAll()}
                              isAdhocEffective={effectiveAdhoc}
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
                        );
                      })}
                    </div>

                    <div className={`flex items-start gap-0 relative z-10 pl-0 shrink-0 ${TIME_SLOT_WIDTH}`}>
                      <div className="flex flex-col gap-1.5 w-full pb-10">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
                          <span>TIMELINE</span>
                          {showMoaiRhythmToday && (
                            <button
                              type="button"
                              onClick={() => setIsMoaiRhythmGuideOpen(true)}
                              className="hover:text-amber-700 flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-500/20 transition-all cursor-pointer"
                              title="モアイの1日リズム図を表示"
                            >
                              <span>🗿</span>
                              <span className="hidden sm:inline">リズム図</span>
                            </button>
                          )}
                        </div>
                        {timeSlots.map(slot => {
                          const { zone, isFirstSlotOfZone } = getMoaiZoneInfo(slot.label);
                          const isUsed = todayQuests.some(q => {
                            if (!q.plannedTimeSlot) return false;
                            try {
                              const parsed = JSON.parse(q.plannedTimeSlot);
                              const list = Array.isArray(parsed) ? parsed : [parsed];
                              return list.some(s => s === slot.id || normalizeSlotForInterval(s, timelineInterval) === slot.id);
                            } catch {
                              return q.plannedTimeSlot === slot.id || normalizeSlotForInterval(q.plannedTimeSlot, timelineInterval) === slot.id;
                            }
                          });

                          // Highlight current hour slot when viewing Today
                          const nowHour = new Date().getHours();
                          const slotStartHour = parseInt(slot.label.split(":")[0], 10);
                          const isCurrentHourSlot = planningDayOffset === 0 && nowHour === slotStartHour;

                          return (
                            <React.Fragment key={slot.id}>
                              {showMoaiRhythmToday && isFirstSlotOfZone && (
                                <button
                                  type="button"
                                  onClick={() => setIsMoaiRhythmGuideOpen(true)}
                                  title={`${zone.name}: ${zone.motto}\nおすすめ: ${zone.actionGuidance}\n(タップでリズム図を表示)`}
                                  className={`w-[68px] sm:w-32 md:w-36 mt-1.5 first:mt-0 px-1.5 sm:px-2.5 py-0.5 rounded-lg border text-[8.5px] sm:text-[10px] font-black flex items-center justify-between gap-1 select-none transition-all hover:brightness-95 active:scale-95 cursor-pointer ${zone.headerBorderClass}`}
                                >
                                  <span className="flex items-center gap-0.5 sm:gap-1 truncate">
                                    <span className="shrink-0">{zone.emoji}</span>
                                    <span className="truncate">{zone.compactName}</span>
                                  </span>
                                  {(zone.badgeText || zone.badgeSubText) && (
                                    <span className="hidden sm:inline-block text-[8px] px-1 py-0.1 rounded bg-black/10 font-black shrink-0">
                                      {zone.badgeText || zone.badgeSubText}
                                    </span>
                                  )}
                                </button>
                              )}
                              <div
                                data-slot-id={slot.id}
                                data-slot-date={format(targetDate, "yyyy-MM-dd")}
                                title={showMoaiRhythmToday ? `${slot.label} 【${zone.name}】\n「${zone.motto}」\nおすすめ: ${zone.actionGuidance}` : undefined}
                                className={`w-[68px] sm:w-32 md:w-36 shrink-0 rounded-xl px-1.5 sm:px-2 py-1.5 min-h-[30px] sm:min-h-[33px] flex items-center justify-center transition-all duration-200 group relative overflow-hidden border ${
                                  isUsed
                                    ? 'bg-white border-sky-400/80 shadow-xs ring-2 ring-sky-500/15'
                                    : isCurrentHourSlot
                                      ? 'bg-rose-50/90 border-rose-300/90 shadow-2xs'
                                      : showMoaiRhythmToday
                                        ? `${zone.slotClass} hover:border-sky-300/80 hover:shadow-xs`
                                        : 'bg-white/65 border-slate-200/70 hover:bg-white hover:border-sky-300/70 hover:shadow-xs'
                                }`}
                              >
                                {isCurrentHourSlot ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1 sm:mr-1.5 shrink-0 animate-pulse" title="現在時刻" />
                                ) : showMoaiRhythmToday && !isUsed ? (
                                  <span className={`w-1.5 h-1.5 rounded-full mr-1 sm:mr-1.5 shrink-0 ${zone.dotColorClass}`} />
                                ) : null}
                                <span className={`z-10 font-mono text-[10px] sm:text-[12px] tracking-tight select-none pointer-events-none transition-colors ${
                                  isUsed
                                    ? 'font-black text-slate-900'
                                    : isCurrentHourSlot
                                      ? 'font-bold text-rose-700'
                                      : 'font-semibold text-slate-600 group-hover:text-slate-900'
                                }`}>
                                  {slot.label}
                                </span>
                                {isUsed && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 ml-1 sm:ml-1.5 shrink-0 shadow-[0_0_6px_rgba(14,165,233,0.8)]" />
                                )}
                                {!isUsed && isJobModeActive && isJobSlot(slot.label) && (
                                  <span className="ml-1 text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider px-1 py-0.2 rounded-full bg-slate-200/80 text-slate-500 select-none pointer-events-none">
                                    JOB
                                  </span>
                                )}
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {/* Job Mode Disable Button */}
                      {isJobModeActive && (
                        <div className="absolute bottom-0 left-0 right-0 flex justify-center w-full px-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-[10px] h-7 rounded-full border-dashed bg-white/70 hover:bg-white"
                            onClick={handleDisableJobMode}
                          >
                            Job Mode 解除
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* WEEKLY VIEW (7 Columns, Mon-Sun) */
                <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin">
                  <div className="flex gap-4 min-w-max">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const colDate = new Date(weeklyActiveDate);
                      colDate.setDate(colDate.getDate() + i);
                      const colQuests = getQuestsForDate(colDate);
                      const isColToday = format(colDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                      const isColWeekday = colDate.getDay() !== 0 && colDate.getDay() !== 6;
                      const colJobActive = isColWeekday && !dailyConfig?.jobModeDisabled;
                      const colOffset = getOffsetFromToday(colDate);

                      const colDateStr = format(colDate, "yyyy-MM-dd");

                      return (
                        <DayColumn
                          key={i}
                          date={colDate}
                          quests={colQuests}
                          templates={templates || []}
                          timeSlots={timeSlots}
                          isJobModeActive={colJobActive}
                          isJobSlot={isJobSlot}
                          handleUnlink={handleUnlink}
                          refreshAll={refreshAll}
                          dragState={dragState}
                          handleTouchStart={handleTouchStart}
                          handleMouseDown={handleMouseDown}
                          isToday={isColToday}
                          cardWidth={cardWidth}
                          lineGapWidth={lineGapWidth}
                          isSelected={planningDayOffset === colOffset}
                          onSelect={() => setPlanningDayOffset(colOffset)}
                          isDragHovered={hoveredColumnDate === colDateStr && dragState.active}
                          onSortByTime={handleSortByTime}
                          isMoaiRhythmActive={isMoaiRhythmActive}
                          isForcePreview={isForceRhythmPreview}
                          onOpenRhythmGuide={() => setIsMoaiRhythmGuideOpen(true)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
                </div>

                {/* SLIDE 2: 脳みその画面 (MOAI FOCUS ROOM) */}
                <div
                  className={`w-1/3 shrink-0 px-2 transition-all duration-300 ${
                    todaySubView === 'focus' ? 'opacity-100 h-auto' : 'opacity-0 pointer-events-none h-0 overflow-hidden'
                  }`}
                >
                  <ActiveMissionMoaiPanel
                    activeQuest={activeRunningQuest}
                    todayQuests={todayQuests}
                    templates={templates || []}
                    onStatusChange={refreshAll}
                    onBackToPlanning={() => handleSubViewChange('planning')}
                  />
                </div>

                {/* SLIDE 3: 🗿 MOAI活動ログ (MOAI ACTIVITY DASHBOARD) */}
                <div
                  className={`w-1/3 shrink-0 pl-2 transition-all duration-300 ${
                    todaySubView === 'moai' ? 'opacity-100 h-auto' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <MoaiDashboard
                    activeQuests={activeQuests || []}
                    history={history || []}
                    templates={templates || []}
                    onStatusChange={refreshAll}
                    onBackToPlanning={() => handleSubViewChange('planning')}
                    onOpenCreateDialog={() => setIsMoaiCreateOpen(true)}
                  />
                </div>
              </div>
            </div>

            {/* Controlled creation dialog for MOAI quests (hidden trigger so no stray button appears) */}
            <QuestCreateDialog
              isOpen={isMoaiCreateOpen}
              onOpenChange={setIsMoaiCreateOpen}
              onCreated={refreshAll}
              planningDayOffset={planningDayOffset}
              defaultType="FreeDirect"
              defaultIsMoai={true}
              trigger={<span className="hidden" />}
            />

            {/* Moai Rhythm Guide Dialog */}
            <MoaiRhythmGuideDialog
              isOpen={isMoaiRhythmGuideOpen}
              onOpenChange={setIsMoaiRhythmGuideOpen}
            />

            {
              dragState.active && dragState.itemId && (
                <div className="fixed pointer-events-none z-50 p-2 opacity-80 scale-105" style={{ left: dragState.currentX, top: dragState.currentY, transform: 'translate(-50%, -50%)', width: `${cardWidth}px` }}>
                  {(() => {
                    const q = activeQuests?.find(i => i.id === dragState.itemId);
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
              )
            }

            {/* In weekly mode, wrap all lower shelves in max-w-[1600px] so only the 7-day schedule is full-width */}
            <div className={planningViewMode === 'weekly' ? 'max-w-[1600px] mx-auto w-full pt-2' : 'w-full pt-2'}>
              {/* Mobile Column Quick Switch Tabs (Visible only on mobile) */}
              <div className="flex items-center justify-between lg:hidden mb-3 px-1">
                <div className="flex items-center gap-1 apple-segmented text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => scrollToMobileColumn('left')}
                    className={`px-3.5 py-1.5 rounded-[9px] transition-all flex items-center gap-1.5 ${
                      mobileActiveCol === 'left'
                        ? 'apple-segmented-item-active font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>📝</span> 目標・日記
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToMobileColumn('right')}
                    className={`px-3.5 py-1.5 rounded-[9px] transition-all flex items-center gap-1.5 ${
                      mobileActiveCol === 'right'
                        ? 'apple-segmented-item-active font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>📋</span> タスク一覧
                  </button>
                </div>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium bg-white/60 dark:bg-stone-800/60 px-2.5 py-1 rounded-full border border-border/40">
                  <span className="text-sm leading-none">↔</span> 横スワイプ切替
                </span>
              </div>

              {/* SIDE-BY-SIDE 2 COLUMNS: Horizontal swipe on mobile, 2-column Bento grid on desktop */}
              <div
                ref={mobileColumnsContainerRef}
                onScroll={handleMobileColumnsScroll}
                className="flex lg:grid lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-7 items-start overflow-x-auto lg:overflow-visible snap-x snap-mandatory scroll-smooth pb-4 lg:pb-0 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 custom-scrollbar mb-8"
              >
                {/* LEFT COLUMN: Goals & Bulletin Diary (7 cols on 12-col grid for generous reading/writing comfort) */}
                <div className="w-[88vw] sm:w-[500px] lg:w-auto lg:col-span-7 shrink-0 lg:shrink min-w-0 snap-start space-y-6">
                  {/* MONTHLY GOALS */}
                  <MonthlyGoalBoard />

                  {/* BULLETIN BOARD */}
                  <BulletinBoard />
                </div>

                {/* RIGHT COLUMN: Task Shelves (5 cols on 12-col grid, styled as iOS Widget Bento Cards) */}
                <div className="w-[88vw] sm:w-[500px] lg:w-auto lg:col-span-5 shrink-0 lg:shrink min-w-0 snap-start space-y-5">

            {/* SHELF 2: FIX (Scheduled) */}
            <section className="apple-glass rounded-3xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3.5 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]" />
                  <h2 className="text-xs font-black text-slate-800 dark:text-stone-100 uppercase tracking-wider">FIX (Scheduled)</h2>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  {fixShelfQuests.length}
                </span>
              </div>
              {
                fixShelfQuests.length === 0 ? <div className="text-xs text-muted-foreground px-1 italic">No scheduled tasks.</div> : (
                  <div className="space-y-2.5">{fixShelfQuests.map(q => {
                    const t = templates?.find(tp => tp.id === q.templateId);
                    return <FixItem key={q.id} quest={q} executedCount={t?.executedCount || 0} onReceive={() => handleReceiveFix(q.id)} />;
                  })}</div>
                )
              }
            </section>

            {/* SHELF 3: NON-FIX (Pool) */}
            <section className="apple-glass rounded-3xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3.5 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.6)]" />
                  <h2 className="text-xs font-black text-slate-800 dark:text-stone-100 uppercase tracking-wider">Non-FIX (Pool)</h2>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400">
                  {orderedNonFix.length}
                </span>
              </div>
              {orderedNonFix.length === 0 ? <div className="text-xs text-muted-foreground px-1 italic">No pool templates.</div> : (
                <div
                  id="nonfix-list"
                  className="space-y-2.5"
                  onMouseMove={(e) => handleNonFixDragMove(e.clientY)}
                  onTouchMove={(e) => handleNonFixDragMove(e.touches[0].clientY)}
                  onMouseUp={handleNonFixDragEnd}
                  onTouchEnd={handleNonFixDragEnd}
                >
                  {orderedNonFix.map(t => (
                    <div
                      key={t!.id}
                      data-nonfix-id={t!.id}
                      className={nonFixDragState.itemId === t!.id ? 'opacity-50 scale-95 transition-all' : 'transition-all'}
                    >
                      <NonFixItem
                        template={t}
                        history={history || []}
                        onReceive={() => handleReceiveNonFix(t)}
                        onDragStart={(e) => handleNonFixDragStart(e, t!.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* SHELF 3.5: ONE-OFF (IN PROGRESS) */}
            <section className="apple-glass rounded-3xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3.5 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                  <h2 className="text-xs font-black text-slate-800 dark:text-stone-100 uppercase tracking-wider">ONE-OFF (IN PROGRESS)</h2>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  {oneOffTemplates.length}
                </span>
              </div>
              {oneOffTemplates.length === 0 ? <div className="text-xs text-muted-foreground px-1 italic">No active one-off missions.</div> : (
                <div className="space-y-2.5">
                  {oneOffTemplates.map(t => (
                    <OneOffTemplateItem
                      key={t.id}
                      template={t}
                      onReceive={() => handleReceiveOneOff(t)}
                      onStatusChange={refreshAll}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* SHELF 4: PROJECT */}
            <section className="apple-glass rounded-3xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3.5 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                  <h2 className="text-xs font-black text-slate-800 dark:text-stone-100 uppercase tracking-wider">PROJECT</h2>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  {projectTemplates.length}
                </span>
              </div>
              {projectTemplates.length === 0 ? <div className="text-xs text-muted-foreground px-1 italic">No active projects.</div> : (
                <div className="space-y-2.5">
                  {projectTemplates.map(t => <ProjectTemplateItem key={t.id} template={t} onReceive={() => handleReceiveProject(t)} />)}
                </div>
              )}
            </section>

            {/* SHELF 5: RELAX (Collapsible) */}
            <section className="apple-glass rounded-3xl p-4 sm:p-5">
              <div
                onClick={(e) => { e.stopPropagation(); setIsRelaxOpen(!isRelaxOpen); }}
                className="flex items-center justify-between px-1 cursor-pointer hover:opacity-80 rounded-xl py-0.5 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <h2 className="text-xs font-black text-slate-800 dark:text-stone-100 uppercase tracking-wider flex items-center gap-1">
                    <span>🌱</span> RELAX
                  </h2>
                  <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.2 rounded-full font-bold">Recover</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMovieStockOpen(true);
                    }}
                    className="h-6 px-2.5 text-[10px] font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-700 rounded-full border border-rose-500/20 flex items-center gap-1 shadow-2xs"
                  >
                    <span>🎬</span>
                    <span>映画ストック</span>
                    {stockMovieCount > 0 && (
                      <span className="bg-rose-500 text-white rounded-full px-1.5 py-0 text-[9px] font-bold">
                        {stockMovieCount}
                      </span>
                    )}
                  </Button>
                  <div className="text-slate-400 text-xs">
                    {isRelaxOpen ? "▼" : "▶"}
                  </div>
                </div>
              </div>

              {isRelaxOpen && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-200 mt-3.5">
                  {relaxTemplates.length === 0 ? <div className="text-xs text-muted-foreground px-1 italic">No relax missions.</div> : (
                    <div className="grid grid-cols-2 gap-2.5">
                      {relaxTemplates.map(t => {
                        const isMovie = t.questName?.includes("映画");
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleReceiveRelax(t)}
                            className="cursor-pointer group relative flex flex-col justify-between p-2.5 rounded-2xl apple-card hover:border-emerald-300/80 min-h-[62px]"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-sm shadow-emerald-500/25 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                <Plus className="w-4 h-4 stroke-[2.5]" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-900 dark:text-stone-100 truncate">{t.questName}</div>
                                <div className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-medium">Recovery</div>
                              </div>
                            </div>

                            {/* If movie template, show quick stock button */}
                            {isMovie && (
                              <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-stone-800 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMovieStockOpen(true);
                                  }}
                                  className="text-[10px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 hover:underline py-0.5"
                                >
                                  <span>🎬 観たい映画ストック ({stockMovieCount})</span>
                                </button>
                              </div>
                            )}

                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-6 h-6 rounded-full absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-100/50 text-emerald-500"
                              onClick={(e) => { e.stopPropagation(); setEditingRelaxTemplate(t); }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* SHELF 6: HISTORY (Collapsible) */}
            <section className="apple-glass rounded-3xl p-4 sm:p-5">
              <div
                onClick={(e) => { e.stopPropagation(); setIsHistoryOpen(!isHistoryOpen); }}
                className="flex items-center justify-between px-1 cursor-pointer hover:opacity-80 rounded-xl py-0.5 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <h2 className="text-xs font-black text-slate-700 dark:text-stone-200 uppercase tracking-wider">
                    HISTORY
                  </h2>
                  <span className="text-[10px] text-slate-500 bg-slate-200/70 dark:bg-stone-800 px-2 py-0.2 rounded-full font-semibold">One-off</span>
                </div>
                <div className="text-slate-400 text-xs">
                  {isHistoryOpen ? "▼" : "▶"}
                </div>
              </div>

              {isHistoryOpen && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-200 mt-3.5">
                  {!historyItems?.length ? <div className="text-xs text-muted-foreground px-1 italic">No history available.</div> : (
                    <div className="space-y-1.5">
                      {historyItems.map((item: any) => (
                        <div
                          key={item.id}
                          onClick={() => setRestoringHistoryItem(item)}
                          className="cursor-pointer group flex items-center justify-between p-2.5 rounded-2xl apple-card"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-700 dark:text-stone-200 truncate">{item.questName}</div>
                            {item.note && <div className="text-[10px] text-slate-400 truncate">{item.note}</div>}
                          </div>
                          <Button size="icon" variant="ghost" className="w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 text-slate-400">
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <RestoreHistoryDialog
                item={restoringHistoryItem}
                open={!!restoringHistoryItem}
                onOpenChange={(open) => !open && setRestoringHistoryItem(null)}
                onRestore={handleRestoreHistory}
              />
            </section>

            {/* SHELF 7: KAIZEN MEMO (Collapsible) - 気付き＆アクション */}
            <section className="apple-glass rounded-3xl p-4 sm:p-5">
              <div
                onClick={(e) => { e.stopPropagation(); setIsMemoOpen(!isMemoOpen); }}
                className="flex items-center justify-between px-1 cursor-pointer hover:opacity-80 rounded-xl py-0.5 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <MessageSquarePlus className="w-3.5 h-3.5 text-amber-500" />
                  <h2 className="text-xs font-black text-slate-800 dark:text-stone-100 uppercase tracking-wider">
                    KAIZEN MEMO
                  </h2>
                  <span className="text-[10px] text-amber-700 bg-amber-500/10 px-2 py-0.2 rounded-full font-semibold">気付き＆アクション</span>
                </div>
                <div className="text-slate-400 text-xs">
                  {isMemoOpen ? "▼" : "▶"}
                </div>
              </div>

              {isMemoOpen && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-200 space-y-3 mt-3.5">
                  <div className="flex flex-col gap-2 p-2.5 border border-slate-200/80 dark:border-stone-800 rounded-2xl bg-white/70 dark:bg-stone-900/50">
                    <div className="flex gap-2">
                      <Input
                        value={memoInput}
                        onChange={(e) => setMemoInput(e.target.value)}
                        placeholder="💡 気付きを入力... (必須)"
                        className="text-xs flex-1 rounded-xl border-slate-200/80 focus-visible:ring-amber-400"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={memoActionInput}
                        onChange={(e) => setMemoActionInput(e.target.value)}
                        placeholder="▶ アクション... (任意)"
                        className="text-xs flex-1 rounded-xl border-slate-200/80 focus-visible:ring-amber-400"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveMemo(); } }}
                      />
                      <Button size="sm" onClick={handleSaveMemo} disabled={createMemo.isPending || !memoInput.trim()} className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs px-4 rounded-xl">
                        Save
                      </Button>
                    </div>
                  </div>
                  {!memoList?.length ? <div className="text-xs text-muted-foreground px-1 italic">No insights yet.</div> : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                      {memoList.map((memo: any) => (
                        <div key={memo.id} className={`group flex items-start gap-2.5 p-3 rounded-2xl apple-card ${memo.done ? 'opacity-75' : ''} text-xs relative`}>
                          <button
                            onClick={() => handleToggleMemo(memo.id, memo.done)}
                            title={memo.done ? "アクション済み" : "アクションを実行する"}
                            className={`mt-0.5 shrink-0 w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-colors ${memo.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-amber-400'}`}
                          >
                            {memo.done && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className={`font-medium text-slate-800 dark:text-stone-200 whitespace-pre-wrap ${memo.done ? 'opacity-70' : ''}`}>
                              {memo.content}
                            </div>
                            {memo.action && (
                              <div className={`text-[11px] text-amber-600/90 flex items-start gap-1 mt-1 ${memo.done ? 'opacity-70' : ''}`}>
                                <ArrowRight className="w-3 h-3 shrink-0" />
                                <span className="whitespace-pre-wrap">{memo.action}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-3 pt-1">
                              <div className="text-[9px] text-slate-400">{new Date(memo.createdAt).toLocaleDateString()}</div>
                              <button
                                onClick={() => handleLikeMemo(memo.id)}
                                className="flex items-center gap-0.5 text-slate-300 hover:text-rose-400 transition-colors"
                              >
                                <Heart
                                  className={`w-3.5 h-3.5 transition-all duration-200 ${
                                    (memo.likes || 0) > 0 ? 'fill-rose-400 text-rose-400' : ''
                                  } ${memoLikeAnimId === memo.id ? 'scale-150' : 'scale-100'}`}
                                />
                                {(memo.likes || 0) > 0 && (
                                  <span className="text-[10px] text-rose-400 font-bold">{memo.likes}</span>
                                )}
                              </button>
                            </div>

                            {/* Reply Section */}
                            <FeedbackSection targetType="kaizen" targetId={memo.id} />

                            {/* Attached Photos */}
                            <div className="pt-1">
                              <ImageAttachmentArea
                                targetType="kaizen"
                                targetId={String(memo.id)}
                                compact
                                buttonLabel="写真"
                              />
                            </div>
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 text-slate-300 hover:text-destructive shrink-0"
                            onClick={() => handleDeleteMemo(memo.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
                </div>
                {/* Mobile trailing spacer for comfortable right gutter */}
                <div className="w-2 shrink-0 lg:hidden" aria-hidden="true" />
              </div>

              {/* LOWER FULL-WIDTH SECTION: Counters, Activity, Insights, Media, Investment */}
              <div className="space-y-6 mt-8">
                {/* YASUDA YOGURT COUNTER */}
                <section className="apple-glass p-5 rounded-3xl relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-[0.04] pointer-events-none grayscale">
                    <img src="/yasuda.png" alt="Yasuda Yogurt" className="w-48 h-auto object-contain" />
                  </div>
                  <div
                    className="flex items-center justify-between mb-3 cursor-pointer group"
                    onClick={() => setIsLunchCounterOpen(!isLunchCounterOpen)}
                  >
                    <h2 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2 transition-transform group-active:scale-95">
                      <span className="w-7 h-7 rounded-xl bg-sky-100 flex items-center justify-center text-base shadow-inner">🍱</span>
                      平日お昼自炊カウンター
                    </h2>
                    <div className="text-sky-600 bg-sky-50/80 px-3 py-1 rounded-full group-hover:bg-sky-100 transition-colors text-[10px] font-bold">
                      {isLunchCounterOpen ? '▲ とじる' : '▼ ひらく'}
                    </div>
                  </div>

                  {isLunchCounterOpen && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
                      {/* Left: Input */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase">今日</span>
                          <div className="flex flex-col items-end gap-1">
                            <button
                              onClick={handleAddLunch}
                              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-b from-sky-400 to-sky-500 text-white hover:from-sky-500 hover:to-sky-600 transition-all font-bold text-xs shadow-sm shadow-sky-200 active:scale-95"
                            >
                              <span className="text-base leading-none">+</span>
                              自炊を追加
                            </button>
                            {todayLunchCount > 0 && (
                              <div className="text-[10px] text-emerald-600 font-bold px-1">
                                本日: {todayLunchCount}回追加済み
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm bg-white/80 p-3 rounded-2xl border border-slate-200/60 shadow-sm">
                          <div>
                            <div className="text-[10px] text-muted-foreground font-bold">今月</div>
                            <div className="text-slate-700">自炊回数 <span className="font-black text-lg text-sky-600">{thisMonthLunchCount}</span><span className="text-xs font-bold ml-0.5">回</span></div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground font-bold">節約額 (1回300円)</div>
                            <div className="text-slate-700 font-black text-lg text-sky-600">{savedAmount.toLocaleString()}<span className="text-xs font-bold ml-0.5">円</span></div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Yogurt UI */}
                      <div className="flex flex-col justify-center bg-white/80 p-3.5 rounded-2xl border border-slate-200/60 shadow-sm relative">
                        <div className="text-[10px] font-bold text-sky-500 mb-1 flex items-center justify-between">
                          <span>ヤスダヨーグルト換算 (603円/本)</span>
                          <img src="/yasuda.png" alt="icon" className="w-7 h-7 object-contain drop-shadow-sm" />
                        </div>
                        <div className="flex items-baseline gap-1 mb-1 relative z-10">
                          <span className="text-3xl font-black text-sky-700">{yogurtCount.toFixed(1)}</span>
                          <span className="text-sm font-bold text-sky-600">本分</span>
                        </div>

                        {/* Visual Yogurt Gauge */}
                        <div className="flex flex-wrap gap-1.5 mb-3 mt-3 min-h-[2rem] items-end">
                          {Array.from({ length: Math.max(10, Math.ceil(yogurtCount)) }).map((_, i) => (
                            <div key={i} className={`transition-all duration-500 ${i < Math.floor(yogurtCount) ? 'grayscale-0 opacity-100 scale-110' : 'grayscale opacity-30 scale-90'}`}>
                              <img src="/yasuda.png" alt="yogurt" className="w-6 h-auto object-contain drop-shadow" />
                            </div>
                          ))}
                        </div>

                        <div className="text-xs font-bold text-emerald-600 bg-emerald-50/80 p-1.5 rounded-xl text-center">
                          {getYogurtComment(yogurtCount)}
                        </div>
                      </div>
                    </div>
                  )}
                </section>

            {/* SHELF 7.5: MOAI ACTIVITY (Collapsible) */}
            <MoaiActivityBoard targetDateStr={targetDateStr} />

            {/* SHELF 8: DAILY INSIGHT (Collapsible) */}
            <section className="apple-glass rounded-3xl p-4 sm:p-5">
              <div
                onClick={(e) => { e.stopPropagation(); setIsInsightOpen(!isInsightOpen); }}
                className="flex items-center justify-between cursor-pointer hover:bg-sky-50/50 rounded-xl px-2 py-1 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-sky-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" /> DAILY INSIGHT
                  </h2>
                  <span className="text-[10px] font-semibold text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-full">Reflections & Actions</span>
                </div>
                <div className="text-sky-400 text-xs">
                  {isInsightOpen ? "▼" : "▶"}
                </div>
              </div>

              {isInsightOpen && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-200 space-y-3 mt-3">
                  <div className="flex flex-col gap-2 p-2.5 border border-sky-100 rounded-2xl bg-white/70">
                    <div className="flex gap-2">
                      <Input
                        value={insightInput}
                        onChange={(e) => setInsightInput(e.target.value)}
                        placeholder="💡 気づき・発見を入力... (必須)"
                        className="text-xs flex-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={insightActionInput}
                        onChange={(e) => setInsightActionInput(e.target.value)}
                        placeholder="▶ アクション・ルール化... (任意)"
                        className="text-xs flex-1"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveInsight(); } }}
                      />
                      <Button size="sm" onClick={handleSaveInsight} disabled={createInsight.isPending || !insightInput.trim()} className="bg-sky-500 hover:bg-sky-600 text-white text-xs px-4 rounded-xl">
                        Save
                      </Button>
                    </div>
                  </div>

                  {!generalInsights?.length ? <div className="text-xs text-muted-foreground px-1 italic">No insights yet.</div> : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {generalInsights.map((insight: any) => (
                        <div key={insight.id} className={`group flex items-start gap-2 p-3 rounded-2xl border ${insight.applied ? 'border-sky-100 bg-sky-50/40' : 'border-slate-200/60 bg-white/90'} text-xs relative shadow-sm`}>
                          <button
                            onClick={() => handleToggleInsight(insight.id, insight.applied)}
                            title={insight.applied ? "仕組み化済み" : "仕組み・ルールに反映する"}
                            className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${insight.applied ? 'bg-sky-500 border-sky-500 text-white' : 'border-slate-300 hover:border-sky-400'}`}
                          >
                            {insight.applied && <CheckCircle2 className="w-3 h-3" />}
                          </button>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className={`font-medium text-slate-700 whitespace-pre-wrap ${insight.applied ? 'opacity-70' : ''}`}>
                              {insight.insight}
                            </div>
                            {insight.action && (
                              <div className={`text-[11px] text-sky-600/90 flex items-start gap-1 mt-1 ${insight.applied ? 'opacity-70' : ''}`}>
                                <ArrowRight className="w-3 h-3 shrink-0" />
                                <span className="whitespace-pre-wrap">{insight.action}</span>
                              </div>
                            )}
                            <div className="text-[9px] text-slate-300 pt-1">{new Date(insight.createdAt).toLocaleDateString()}</div>
                            
                            {/* Feedback Comments */}
                            <FeedbackSection targetType="daily" targetId={insight.id} />

                            {/* Attached Photos */}
                            <div className="pt-1">
                              <ImageAttachmentArea
                                targetType="insight"
                                targetId={String(insight.id)}
                                compact
                                buttonLabel="写真"
                              />
                            </div>
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-destructive shrink-0"
                            onClick={() => handleDeleteInsight(insight.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* SHELF 9 & 10: READING & WATCHING (Collapsible) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="apple-glass rounded-3xl p-4 sm:p-5">
                <div
                  onClick={() => {
                    const next = !isReadingOpen;
                    setIsReadingOpen(next);
                    try { localStorage.setItem("is_reading_open", String(next)); } catch {}
                  }}
                  className="flex items-center justify-between cursor-pointer hover:bg-fuchsia-50/50 rounded-xl px-2 py-1 transition-colors select-none"
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold text-fuchsia-600 uppercase tracking-wider flex items-center gap-1.5">
                      📚 READING
                    </h2>
                    {books && books.length > 0 && (
                      <span className="text-[10px] font-semibold text-fuchsia-700 bg-fuchsia-100/80 px-2 py-0.5 rounded-full">
                        {books.length}冊
                      </span>
                    )}
                  </div>
                  <div className="text-fuchsia-400 text-xs">
                    {isReadingOpen ? "▼" : "▶"}
                  </div>
                </div>

                {isReadingOpen && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-200 mt-3">
                    {!books?.length ? <div className="text-xs text-muted-foreground px-1 italic">No reading records.</div> : (
                      <div className="space-y-2">
                        {books.map((book: any) => (
                          <MediaItem
                            key={book.id}
                            item={book}
                            type="book"
                            color="fuchsia"
                            onStatusToggle={async (item: any) => {
                              await updateBookStatus.mutateAsync({ id: item.id, status: item.status === 'completed' ? 'reading' : 'completed' });
                              refetchBooks();
                            }}
                            onDelete={async (item: any) => {
                              if (confirm("Delete this book record?")) {
                                await deleteBook.mutateAsync({ id: item.id });
                                refetchBooks();
                              }
                            }}
                            onLongPress={openReviewDialog}
                            renderStars={renderStars}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="apple-glass rounded-3xl p-4 sm:p-5">
                <div
                  onClick={() => {
                    const next = !isWatchingOpen;
                    setIsWatchingOpen(next);
                    try { localStorage.setItem("is_watching_open", String(next)); } catch {}
                  }}
                  className="flex items-center justify-between cursor-pointer hover:bg-rose-50/50 rounded-xl px-2 py-1 transition-colors select-none"
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                      🎬 WATCHING
                    </h2>
                    {movies && movies.length > 0 && (
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full">
                        {movies.length}本
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMovieStockOpen(true);
                      }}
                      className="h-7 rounded-full text-xs font-bold text-rose-600 border-rose-200/90 hover:bg-rose-50 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>映画をストック</span>
                      {stockMovieCount > 0 && (
                        <span className="ml-1 bg-rose-500 text-white rounded-full px-1.5 py-0 text-[10px] font-bold">
                          {stockMovieCount}
                        </span>
                      )}
                    </Button>
                    <div className="text-rose-400 text-xs pl-1">
                      {isWatchingOpen ? "▼" : "▶"}
                    </div>
                  </div>
                </div>

                {isWatchingOpen && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-200 mt-3">
                    {!movies?.length ? <div className="text-xs text-muted-foreground px-1 italic">No watching records.</div> : (
                      <div className="space-y-2">
                        {movies.map((movie: any) => (
                          <MediaItem
                            key={movie.id}
                            item={movie}
                            type="movie"
                            color="rose"
                            onStatusToggle={async (item: any) => {
                              await updateMovieStatus.mutateAsync({ id: item.id, status: item.status === 'completed' ? 'watching' : 'completed' });
                              refetchMovies();
                            }}
                            onDelete={async (item: any) => {
                              if (confirm("Delete this movie record?")) {
                                await deleteMovie.mutateAsync({ id: item.id });
                                refetchMovies();
                              }
                            }}
                            onLongPress={openReviewDialog}
                            renderStars={renderStars}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* SHELF 11: INVESTMENT (投資) */}
            <InvestmentBoard />

            <section className="apple-glass rounded-3xl p-4 sm:p-5 mt-4">
              <div
                onClick={(e) => { e.stopPropagation(); setIsInvInsightOpen(!isInvInsightOpen); }}
                className="flex items-center justify-between cursor-pointer hover:bg-emerald-50/50 rounded-xl px-2 py-1 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" /> INVESTMENT INSIGHT
                  </h2>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">投資の気づきとアクション</span>
                </div>
                <div className="text-emerald-500 text-xs">
                  {isInvInsightOpen ? "▼" : "▶"}
                </div>
              </div>

              {isInvInsightOpen && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-200 space-y-3 mt-3">
                  <div className="flex flex-col gap-2 p-2.5 border border-emerald-100 rounded-2xl bg-white/70">
                    <div className="flex gap-2">
                      <Input
                        value={invInsightInput}
                        onChange={(e) => setInvInsightInput(e.target.value)}
                        placeholder="💡 投資での気づきを入力... (必須)"
                        className="text-xs flex-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={invInsightActionInput}
                        onChange={(e) => setInvInsightActionInput(e.target.value)}
                        placeholder="▶ アクション・ルール化... (任意)"
                        className="text-xs flex-1"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveInvInsight(); } }}
                      />
                      <Button size="sm" onClick={handleSaveInvInsight} disabled={createInsight.isPending || !invInsightInput.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 rounded-xl">
                        Save
                      </Button>
                    </div>
                  </div>

                  {!invInsights?.length ? <div className="text-xs text-muted-foreground px-1 italic">No investment insights yet.</div> : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {invInsights.map((insight: any) => (
                        <div key={insight.id} className={`group flex items-start gap-2 p-3 rounded-2xl border ${insight.applied ? 'border-emerald-100 bg-emerald-50/40' : 'border-slate-200/60 bg-white/90'} text-xs relative shadow-sm`}>
                          <button
                            onClick={() => handleToggleInsight(insight.id, insight.applied)}
                            title={insight.applied ? "ルール化済み" : "ルールとして適用する"}
                            className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${insight.applied ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-400'}`}
                          >
                            {insight.applied && <CheckCircle2 className="w-3 h-3" />}
                          </button>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className={`font-medium text-slate-700 whitespace-pre-wrap ${insight.applied ? 'opacity-70' : ''}`}>
                              {insight.insight}
                            </div>
                            {insight.action && (
                              <div className={`text-[11px] text-emerald-700/80 flex items-start gap-1 mt-1 ${insight.applied ? 'opacity-70' : ''}`}>
                                <ArrowRight className="w-3 h-3 shrink-0" />
                                <span className="whitespace-pre-wrap">{insight.action}</span>
                              </div>
                            )}
                            <div className="text-[9px] text-slate-300 pt-1">{new Date(insight.createdAt).toLocaleDateString()}</div>

                            {/* Feedback Comments */}
                            <FeedbackSection targetType="daily" targetId={insight.id} />

                            {/* Attached Photos */}
                            <div className="pt-1">
                              <ImageAttachmentArea
                                targetType="insight"
                                targetId={String(insight.id)}
                                compact
                                buttonLabel="写真"
                              />
                            </div>
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-destructive shrink-0"
                            onClick={() => handleDeleteInsight(insight.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* SHELF 12: INVESTMENT FLOW TRACKER */}
            <InvestmentFlowTracker />

              </div>
            </div>
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

        {/* Movie Stock Management Dialog */}
        <MovieStockDialog
          isOpen={isMovieStockOpen}
          onOpenChange={setIsMovieStockOpen}
          onAddToTodayMission={handleAddMovieToTodayMission}
        />

        {/* Review Media Dialog */}
        <Dialog open={!!reviewMedia} onOpenChange={(open) => !open && setReviewMedia(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {reviewMedia?.type === 'book' ? '📚 読書の記録' : '🎬 映画の記録'} - {reviewMedia?.item?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2 text-center">
                <Label>満足度</Label>
                <div className="flex justify-center gap-2 cursor-pointer text-2xl filter drop-shadow">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={star <= reviewRating ? 'text-yellow-400' : 'text-slate-200'}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>感想・メモ</Label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="感想や学んだことを自由に書き留めましょう。"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleReviewSave}>保存する</Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

// Bulletin Board Component
function BulletinBoard() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [baseDate, setBaseDate] = useState(new Date());

  const selectedDateObj = new Date(selectedDate);
  const selectedMonthStr = format(selectedDateObj, "yyyy-MM");
  const selectedWeekStr = format(startOfWeek(selectedDateObj, { weekStartsOn: 1 }), "yyyy-MM-dd") + "_W";

  const { data: board, refetch } = trpc.bulletin.get.useQuery({ date: selectedDate });
  const { data: monthBoard, refetch: refetchMonth } = trpc.bulletin.get.useQuery({ date: selectedMonthStr });
  const { data: weekBoard, refetch: refetchWeek } = trpc.bulletin.get.useQuery({ date: selectedWeekStr });
  const saveBoard = trpc.bulletin.save.useMutation();

  const [content, setContent] = useState("");
  const [diary, setDiary] = useState("");
  const [monthContent, setMonthContent] = useState("");
  const [weekContent, setWeekContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  // Unsaved Draft Recovery Banner State (案A)
  const [pendingDraft, setPendingDraft] = useState<{
    content?: string;
    diary?: string;
    savedAt: string;
  } | null>(null);

  const isDirtyRef = useRef(false);
  const contentRefVal = useRef("");
  const diaryRefVal = useRef("");
  const monthRefVal = useRef("");
  const weekRefVal = useRef("");

  const draftKey = `bulletin_draft_v2_${selectedDate}`;

  // Helper to save draft to localStorage
  const saveLocalDraft = (c: string, d: string) => {
    try {
      const data = {
        content: c,
        diary: d,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(data));
    } catch {}
  };

  // Helper to clear draft from localStorage
  const clearLocalDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setPendingDraft(null);
  };

  // Sync board data on load or date switch and check for unsaved drafts (案A)
  useEffect(() => {
    if (board !== undefined && !isDirtyRef.current) {
      const serverContent = board?.content || "";
      const serverDiary = (board as any)?.diary || "";
      setContent(serverContent);
      setDiary(serverDiary);
      contentRefVal.current = serverContent;
      diaryRefVal.current = serverDiary;

      // Check if there is an unsaved draft in localStorage
      try {
        const rawDraft = localStorage.getItem(draftKey);
        if (rawDraft) {
          const parsed = JSON.parse(rawDraft);
          const draftContent = parsed.content ?? "";
          const draftDiary = parsed.diary ?? "";
          // Only prompt if the draft actually differs from the server
          if (
            (draftContent !== serverContent || draftDiary !== serverDiary) &&
            (draftContent.trim() !== "" || draftDiary.trim() !== "")
          ) {
            setPendingDraft({
              content: draftContent,
              diary: draftDiary,
              savedAt: parsed.savedAt
                ? new Date(parsed.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : "前回",
            });
          } else {
            // Draft is identical or empty, clean it up silently
            localStorage.removeItem(draftKey);
            setPendingDraft(null);
          }
        } else {
          setPendingDraft(null);
        }
      } catch {
        setPendingDraft(null);
      }
    }
  }, [board?.content, (board as any)?.diary, selectedDate]);

  // Restore Draft action (ユーザーが「下書きを復元」を押した時)
  const handleRestoreDraft = () => {
    if (!pendingDraft) return;
    const restoredContent = pendingDraft.content ?? contentRefVal.current;
    const restoredDiary = pendingDraft.diary ?? diaryRefVal.current;
    setContent(restoredContent);
    setDiary(restoredDiary);
    contentRefVal.current = restoredContent;
    diaryRefVal.current = restoredDiary;
    isDirtyRef.current = true;
    setPendingDraft(null);
    toast.success("下書きを復元しました。保存中...");
    triggerSave(restoredContent, restoredDiary);
  };

  // Discard Draft action (ユーザーが「破棄」を押した時)
  const handleDiscardDraft = () => {
    clearLocalDraft();
    toast.info("下書きを破棄し、保存済みの内容を表示しています");
  };

  useEffect(() => {
    const val = monthBoard?.content || "";
    setMonthContent(val);
    monthRefVal.current = val;
  }, [monthBoard?.content, selectedMonthStr]);

  useEffect(() => {
    const val = weekBoard?.content || "";
    setWeekContent(val);
    weekRefVal.current = val;
  }, [weekBoard?.content, selectedWeekStr]);

  const contentTimeout = useRef<NodeJS.Timeout | null>(null);
  const diaryTimeout = useRef<NodeJS.Timeout | null>(null);
  const monthTimeout = useRef<NodeJS.Timeout | null>(null);
  const weekTimeout = useRef<NodeJS.Timeout | null>(null);

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const diaryRef = useRef<HTMLTextAreaElement>(null);
  const monthRef = useRef<HTMLTextAreaElement>(null);
  const weekRef = useRef<HTMLTextAreaElement>(null);

  const monthAttachRef = useRef<ImageAttachmentAreaRef>(null);
  const weekAttachRef = useRef<ImageAttachmentAreaRef>(null);
  const dayAttachRef = useRef<ImageAttachmentAreaRef>(null);

  // Auto-flush or persist if user abruptly closes or reloads the tab
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirtyRef.current) {
        saveLocalDraft(contentRefVal.current, diaryRefVal.current);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [selectedDate]);

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  // Re-adjust height when content loaded from DB
  useEffect(() => { autoResize(contentRef.current); }, [content]);
  useEffect(() => { autoResize(diaryRef.current); }, [diary]);
  useEffect(() => { autoResize(monthRef.current); }, [monthContent]);
  useEffect(() => { autoResize(weekRef.current); }, [weekContent]);

  const triggerSave = (newContent: string, newDiary: string) => {
    setIsSaving(true);
    saveBoard.mutate(
      { content: newContent, diary: newDiary, date: selectedDate },
      {
        onSuccess: () => {
          setIsSaving(false);
          isDirtyRef.current = false;
          setLastSavedTime(new Date());
          clearLocalDraft();
        },
        onError: () => {
          setIsSaving(false);
          // If server save fails, preserve draft locally so user never loses work!
          saveLocalDraft(newContent, newDiary);
          toast.error("サーバーへの保存に失敗しました。ローカル下書きに保持しています。");
        },
      }
    );
  };

  const triggerSaveMonth = (newContent: string) => {
    setIsSaving(true);
    saveBoard.mutate({ content: newContent, diary: "", date: selectedMonthStr }, {
      onSettled: () => {
        setIsSaving(false);
        setLastSavedTime(new Date());
      }
    });
  };

  const triggerSaveWeek = (newContent: string) => {
    setIsSaving(true);
    saveBoard.mutate({ content: newContent, diary: "", date: selectedWeekStr }, {
      onSettled: () => {
        setIsSaving(false);
        setLastSavedTime(new Date());
      }
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    contentRefVal.current = val;
    isDirtyRef.current = true;
    saveLocalDraft(val, diaryRefVal.current);
    autoResize(e.target);
    if (contentTimeout.current) clearTimeout(contentTimeout.current);
    contentTimeout.current = setTimeout(() => triggerSave(contentRefVal.current, diaryRefVal.current), 400);
  };

  const handleDiaryChange = (val: string) => {
    setDiary(val);
    diaryRefVal.current = val;
    isDirtyRef.current = true;
    saveLocalDraft(contentRefVal.current, val);
    if (diaryTimeout.current) clearTimeout(diaryTimeout.current);
    diaryTimeout.current = setTimeout(() => triggerSave(contentRefVal.current, diaryRefVal.current), 400);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMonthContent(val);
    monthRefVal.current = val;
    autoResize(e.target);
    if (monthTimeout.current) clearTimeout(monthTimeout.current);
    monthTimeout.current = setTimeout(() => triggerSaveMonth(monthRefVal.current), 400);
  };

  const handleWeekChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setWeekContent(val);
    weekRefVal.current = val;
    autoResize(e.target);
    if (weekTimeout.current) clearTimeout(weekTimeout.current);
    weekTimeout.current = setTimeout(() => triggerSaveWeek(weekRefVal.current), 400);
  };

  const handleReset = async () => {
    if (confirm("現在表示している基準日に関する「月・週・日」の掲示板をすべて削除します。よろしいですか？")) {
      setContent("");
      setDiary("");
      setMonthContent("");
      setWeekContent("");
      setIsSaving(true);
      await Promise.all([
        saveBoard.mutateAsync({ content: "", diary: "", date: selectedDate }),
        saveBoard.mutateAsync({ content: "", diary: "", date: selectedMonthStr }),
        saveBoard.mutateAsync({ content: "", diary: "", date: selectedWeekStr }),
      ]);
      setIsSaving(false);
      refetch();
      refetchMonth();
      refetchWeek();
    }
  };

  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const days: Date[] = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const handlePrevDays = () => {
    const newBase = new Date(baseDate);
    newBase.setDate(newBase.getDate() - 1);
    setBaseDate(newBase);
  };

  const handleNextDays = () => {
    const newBase = new Date(baseDate);
    newBase.setDate(newBase.getDate() + 1);
    setBaseDate(newBase);
  };

  const displaySelectedDateStr = `${selectedDateObj.getMonth() + 1}/${selectedDateObj.getDate()}(${weekdays[selectedDateObj.getDay()]})`;
  const { colors: uiColors } = useCustomUiColors();

  return (
    <section
      className="apple-glass mb-6 p-0 rounded-3xl relative overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: uiColors.bulletinBg, color: uiColors.bulletinText }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-200/60 bg-white/40">
        <h2 className="text-sm font-black tracking-tight flex items-center gap-2" style={{ color: uiColors.bulletinText }}>
          <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-sm shadow-inner">📌</span>
          <span>掲示板</span>
          <span className="text-xs font-semibold opacity-50 hidden sm:inline">Notice Board</span>
          <span className="ml-1 px-2.5 py-0.5 rounded-full bg-black/5 text-xs font-bold">{displaySelectedDateStr}</span>
          {isSaving ? (
            <span className="text-[11px] text-amber-600 ml-2 font-mono flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
              <span className="animate-spin inline-block">⏳</span> 保存中...
            </span>
          ) : lastSavedTime ? (
            <span className="text-[10px] text-emerald-600 ml-2 font-semibold flex items-center gap-0.5 bg-emerald-50 px-2 py-0.5 rounded-full">
              <span>✓</span> 保存完了
            </span>
          ) : null}
        </h2>
        <div className="flex items-center gap-1.5">
          <ColorStudioButton compact />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 rounded-full px-3 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <Trash2 className="w-3 h-3 mr-1" /> リセット
          </Button>
        </div>
      </div>

      {/* Unsaved Draft Recovery Banner (案A) */}
      {pendingDraft && (
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-5 py-2.5 flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <span className="text-base">⚠️</span>
            <span>
              前回（{pendingDraft.savedAt}）の<strong>未保存の下書き（一時保存データ）</strong>が見つかりました。復元しますか？
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleRestoreDraft}
              className="h-7 px-3 rounded-full text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs cursor-pointer"
            >
              下書きを復元する
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscardDraft}
              className="h-7 px-3 rounded-full text-xs border-amber-300 text-amber-800 hover:bg-amber-100 hover:text-amber-900 cursor-pointer"
            >
              破棄
            </Button>
          </div>
        </div>
      )}

      {/* Text areas: Month & Week side-by-side on desktop, Day full width */}
      <div className="flex flex-col divide-y divide-slate-200/60" style={{ color: uiColors.bulletinText }}>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200/60">
          <div className="p-4 flex flex-col gap-1.5">
            <div className="text-[11px] font-bold opacity-75 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              月間掲示板 ({format(selectedDateObj, "yyyy年M月")})
            </div>
            <RichDocEditor
              value={monthContent}
              onChange={(val) => {
                setMonthContent(val);
                monthRefVal.current = val;
                if (monthTimeout.current) clearTimeout(monthTimeout.current);
                monthTimeout.current = setTimeout(() => triggerSaveMonth(monthRefVal.current), 400);
              }}
              placeholder="今月の目標、領収書のメモ、忘れたくないこと..."
              textAreaClassName="text-sm leading-6 placeholder:opacity-40"
              minHeight={50}
              theme="stone"
            />
          </div>
          <div className="p-4 flex flex-col gap-1.5">
            <div className="text-[11px] font-bold opacity-75 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              週間掲示板 ({format(startOfWeek(selectedDateObj, { weekStartsOn: 1 }), "M/d")}~ 週)
            </div>
            <RichDocEditor
              value={weekContent}
              onChange={(val) => {
                setWeekContent(val);
                weekRefVal.current = val;
                if (weekTimeout.current) clearTimeout(weekTimeout.current);
                weekTimeout.current = setTimeout(() => triggerSaveWeek(weekRefVal.current), 400);
              }}
              placeholder="今週の予定、メモ..."
              textAreaClassName="text-sm leading-6 placeholder:opacity-40"
              minHeight={50}
              theme="stone"
            />
          </div>
        </div>
        <div className="p-4 flex flex-col gap-1.5">
          <div className="text-[11px] font-bold opacity-75 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            日間掲示板 (自由欄)
          </div>
          <RichDocEditor
            value={content}
            onChange={(val) => {
              setContent(val);
              contentRefVal.current = val;
              isDirtyRef.current = true;
              saveLocalDraft(val, diaryRefVal.current);
              if (contentTimeout.current) clearTimeout(contentTimeout.current);
              contentTimeout.current = setTimeout(() => triggerSave(contentRefVal.current, diaryRefVal.current), 400);
            }}
            placeholder="今日の自由に書き込めるメモ..."
            textAreaClassName="text-sm leading-6 placeholder:opacity-40"
            minHeight={60}
            theme="stone"
          />
        </div>
        {/* 日間掲示板（焚き火の避難所・日記欄） */}
        <BonfireDiary
          value={diary}
          onChange={handleDiaryChange}
          date={selectedDate}
          selectedDateStr={displaySelectedDateStr}
          isSaving={isSaving}
        />
      </div>

      {/* iOS Calendar Week Pill Strip */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-t border-slate-200/60 bg-slate-100/60 backdrop-blur-md">
        <button
          onClick={handlePrevDays}
          className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-600 shadow-xs transition-all flex items-center justify-center shrink-0 active:scale-90"
        >
          <span className="text-xs">◀</span>
        </button>
        <div className="flex-1 grid grid-cols-7 gap-1 text-center">
          {days.map(d => {
            const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
            const isSelected = selectedDate === dateStr;
            const isSun = d.getDay() === 0;
            const isSat = d.getDay() === 6;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all duration-200 ${
                  isSelected
                    ? 'bg-slate-900 text-white font-bold shadow-md scale-[1.02]'
                    : 'text-slate-600 hover:bg-white/70'
                }`}
              >
                <div className={`text-[10px] leading-tight ${isSelected ? 'text-slate-300' : isSun ? 'text-rose-500' : isSat ? 'text-sky-500' : 'text-slate-400'}`}>
                  {weekdays[d.getDay()]}
                </div>
                <div className="text-xs font-bold leading-tight mt-0.5">{d.getMonth() + 1}/{d.getDate()}</div>
              </button>
            );
          })}
        </div>
        <button
          onClick={handleNextDays}
          className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-600 shadow-xs transition-all flex items-center justify-center shrink-0 active:scale-90"
        >
          <span className="text-xs">▶</span>
        </button>
      </div>
    </section>
  );
}

// Investment Board Component
function InvestmentBoard() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [baseDate, setBaseDate] = useState(new Date());

  const selectedDateObj = new Date(selectedDate);
  const selectedMonthStr = "inv-" + format(selectedDateObj, "yyyy-MM");
  const selectedWeekStr = "inv-" + format(startOfWeek(selectedDateObj, { weekStartsOn: 1 }), "yyyy-MM-dd") + "_W";
  const invSelectedDate = "inv-" + selectedDate;

  const { data: board, refetch } = trpc.bulletin.get.useQuery({ date: invSelectedDate });
  const { data: monthBoard, refetch: refetchMonth } = trpc.bulletin.get.useQuery({ date: selectedMonthStr });
  const { data: weekBoard, refetch: refetchWeek } = trpc.bulletin.get.useQuery({ date: selectedWeekStr });
  const saveBoard = trpc.bulletin.save.useMutation();

  const [content, setContent] = useState("");
  const [diary, setDiary] = useState("");
  const [monthContent, setMonthContent] = useState("");
  const [weekContent, setWeekContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setContent(board?.content || "");
    setDiary((board as any)?.diary || "");
  }, [board?.content, (board as any)?.diary, invSelectedDate]);

  useEffect(() => {
    setMonthContent(monthBoard?.content || "");
  }, [monthBoard?.content, selectedMonthStr]);

  useEffect(() => {
    setWeekContent(weekBoard?.content || "");
  }, [weekBoard?.content, selectedWeekStr]);

  const contentTimeout = useRef<NodeJS.Timeout | null>(null);
  const diaryTimeout = useRef<NodeJS.Timeout | null>(null);
  const monthTimeout = useRef<NodeJS.Timeout | null>(null);
  const weekTimeout = useRef<NodeJS.Timeout | null>(null);

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const diaryRef = useRef<HTMLTextAreaElement>(null);
  const monthRef = useRef<HTMLTextAreaElement>(null);
  const weekRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  useEffect(() => { autoResize(contentRef.current); }, [content]);
  useEffect(() => { autoResize(diaryRef.current); }, [diary]);
  useEffect(() => { autoResize(monthRef.current); }, [monthContent]);
  useEffect(() => { autoResize(weekRef.current); }, [weekContent]);

  const triggerSave = (newContent: string, newDiary: string) => {
    setIsSaving(true);
    saveBoard.mutate({ content: newContent, diary: newDiary, date: invSelectedDate }, {
      onSettled: () => setIsSaving(false)
    });
  };

  const triggerSaveMonth = (newContent: string) => {
    setIsSaving(true);
    saveBoard.mutate({ content: newContent, diary: "", date: selectedMonthStr }, {
      onSettled: () => setIsSaving(false)
    });
  };

  const triggerSaveWeek = (newContent: string) => {
    setIsSaving(true);
    saveBoard.mutate({ content: newContent, diary: "", date: selectedWeekStr }, {
      onSettled: () => setIsSaving(false)
    });
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    if (contentTimeout.current) clearTimeout(contentTimeout.current);
    contentTimeout.current = setTimeout(() => triggerSave(val, diary), 1000);
  };

  const handleDiaryChange = (val: string) => {
    setDiary(val);
    if (diaryTimeout.current) clearTimeout(diaryTimeout.current);
    diaryTimeout.current = setTimeout(() => triggerSave(content, val), 1000);
  };

  const handleMonthChange = (val: string) => {
    setMonthContent(val);
    if (monthTimeout.current) clearTimeout(monthTimeout.current);
    monthTimeout.current = setTimeout(() => triggerSaveMonth(val), 1000);
  };

  const handleWeekChange = (val: string) => {
    setWeekContent(val);
    if (weekTimeout.current) clearTimeout(weekTimeout.current);
    weekTimeout.current = setTimeout(() => triggerSaveWeek(val), 1000);
  };

  const handleReset = async () => {
    if (confirm("現在表示している基準日に関する投資用の「月・週・日」掲示板をすべて削除します。よろしいですか？")) {
      setContent("");
      setDiary("");
      setMonthContent("");
      setWeekContent("");
      setIsSaving(true);
      await Promise.all([
        saveBoard.mutateAsync({ content: "", diary: "", date: invSelectedDate }),
        saveBoard.mutateAsync({ content: "", diary: "", date: selectedMonthStr }),
        saveBoard.mutateAsync({ content: "", diary: "", date: selectedWeekStr }),
      ]);
      setIsSaving(false);
      refetch();
      refetchMonth();
      refetchWeek();
    }
  };

  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const days: Date[] = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const handlePrevDays = () => {
    const newBase = new Date(baseDate);
    newBase.setDate(newBase.getDate() - 1);
    setBaseDate(newBase);
  };

  const handleNextDays = () => {
    const newBase = new Date(baseDate);
    newBase.setDate(newBase.getDate() + 1);
    setBaseDate(newBase);
  };

  const displaySelectedDateStr = `${selectedDateObj.getMonth() + 1}/${selectedDateObj.getDate()}(${weekdays[selectedDateObj.getDay()]})`;

  return (
    <section className="apple-glass mb-6 p-0 rounded-3xl relative overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-200/60 bg-white/50">
        <h2 className="text-sm font-black tracking-tight flex items-center gap-2 text-slate-800">
          <span className="w-7 h-7 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center text-sm shadow-inner">📈</span>
          <span>投資掲示板</span>
          <span className="text-xs font-semibold text-slate-400 hidden sm:inline">Investment</span>
          <span className="ml-1 px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-800 text-xs font-bold">{displaySelectedDateStr}</span>
          {isSaving && <span className="text-[10px] text-teal-600/70 ml-2 italic">Saving...</span>}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-7 rounded-full px-3 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <Trash2 className="w-3 h-3 mr-1" /> リセット
        </Button>
      </div>

      {/* Text areas */}
      <div className="flex flex-col divide-y divide-slate-200/50">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200/50">
          <div className="p-4 flex flex-col gap-1.5 bg-white/30">
            <div className="text-[11px] font-bold text-teal-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              月間投資目標 / 総資産メモ ({format(selectedDateObj, "yyyy年M月")})
            </div>
            <RichDocEditor
              value={monthContent}
              onChange={handleMonthChange}
              placeholder="今月の投資方針、目標利益、資産の変動など..."
              textAreaClassName="text-teal-900 text-sm leading-6 placeholder:text-teal-300"
              minHeight={50}
              theme="teal"
            />
          </div>
          <div className="p-4 flex flex-col gap-1.5 bg-white/20">
            <div className="text-[11px] font-bold text-teal-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              週間相場観 / ウォッチリスト ({format(startOfWeek(selectedDateObj, { weekStartsOn: 1 }), "M/d")}~ 週)
            </div>
            <RichDocEditor
              value={weekContent}
              onChange={handleWeekChange}
              placeholder="今週注目している銘柄、予想されるイベントなど..."
              textAreaClassName="text-teal-900 text-sm leading-6 placeholder:text-teal-300"
              minHeight={50}
              theme="teal"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200/50">
          <div className="p-4 flex flex-col gap-1.5 bg-white/40">
            <div className="text-[11px] font-bold text-teal-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              今日のトレード記録 (自由欄)
            </div>
            <RichDocEditor
              value={content}
              onChange={handleContentChange}
              placeholder="今日のトレード内容、決済の理由など..."
              textAreaClassName="text-teal-900 text-sm leading-6 placeholder:text-teal-400"
              minHeight={60}
              theme="teal"
            />
          </div>
          <div className="p-4 flex flex-col gap-1.5 bg-white/40">
            <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-lime-400" />
              今日の所感 (日記欄)
            </div>
            <RichDocEditor
              value={diary}
              onChange={handleDiaryChange}
              placeholder="相場の熱量、メンタルの状況など..."
              textAreaClassName="text-emerald-900 text-sm leading-6 placeholder:text-emerald-400/70"
              minHeight={60}
              theme="emerald"
            />
          </div>
        </div>
      </div>

      {/* iOS Calendar Week Pill Strip */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-t border-slate-200/60 bg-slate-100/60 backdrop-blur-md">
        <button
          onClick={handlePrevDays}
          className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-600 shadow-xs transition-all flex items-center justify-center shrink-0 active:scale-90"
        >
          <span className="text-xs">◀</span>
        </button>
        <div className="flex-1 grid grid-cols-7 gap-1 text-center">
          {days.map(d => {
            const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
            const isSelected = selectedDate === dateStr;
            const isSun = d.getDay() === 0;
            const isSat = d.getDay() === 6;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all duration-200 ${
                  isSelected
                    ? 'bg-teal-600 text-white font-bold shadow-md scale-[1.02]'
                    : 'text-slate-600 hover:bg-white/70'
                }`}
              >
                <div className={`text-[10px] leading-tight ${isSelected ? 'text-teal-100' : isSun ? 'text-rose-500' : isSat ? 'text-sky-500' : 'text-slate-400'}`}>
                  {weekdays[d.getDay()]}
                </div>
                <div className="text-xs font-bold leading-tight mt-0.5">{d.getMonth() + 1}/{d.getDate()}</div>
              </button>
            );
          })}
        </div>
        <button
          onClick={handleNextDays}
          className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-600 shadow-xs transition-all flex items-center justify-center shrink-0 active:scale-90"
        >
          <span className="text-xs">▶</span>
        </button>
      </div>
    </section>
  );
}

// Monthly Goal Board Component
function MonthlyGoalBoard() {
  const [selectedMonthDate, setSelectedMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const selectedMonthStr = `${selectedMonthDate.getFullYear()}-${String(selectedMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const { data: goal } = trpc.monthlyGoal.get.useQuery({ month: selectedMonthStr });
  const saveGoal = trpc.monthlyGoal.save.useMutation();
  const [content, setContent] = useState("");
  const [awareness, setAwareness] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setContent(goal?.content || "");
    setAwareness((goal as any)?.awareness || "");
  }, [goal?.content, (goal as any)?.awareness, selectedMonthStr]);

  const contentTimeout = useRef<NodeJS.Timeout | null>(null);
  const awarenessTimeout = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const awarenessRef = useRef<HTMLTextAreaElement>(null);
  const goalAttachRef = useRef<ImageAttachmentAreaRef>(null);

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  useEffect(() => { autoResize(contentRef.current); }, [content]);
  useEffect(() => { autoResize(awarenessRef.current); }, [awareness]);

  const triggerSave = (newContent: string, newAwareness: string) => {
    setIsSaving(true);
    saveGoal.mutate({ content: newContent, awareness: newAwareness, month: selectedMonthStr }, {
      onSettled: () => setIsSaving(false)
    });
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    if (contentTimeout.current) clearTimeout(contentTimeout.current);
    contentTimeout.current = setTimeout(() => triggerSave(val, awareness), 1000);
  };

  const handleAwarenessChange = (val: string) => {
    setAwareness(val);
    if (awarenessTimeout.current) clearTimeout(awarenessTimeout.current);
    awarenessTimeout.current = setTimeout(() => triggerSave(content, val), 1000);
  };

  const handlePrevMonth = () => {
    const d = new Date(selectedMonthDate);
    d.setMonth(d.getMonth() - 1);
    setSelectedMonthDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(selectedMonthDate);
    d.setMonth(d.getMonth() + 1);
    setSelectedMonthDate(d);
  };

  const { colors: uiColors } = useCustomUiColors();

  return (
    <section
      className="apple-glass mb-5 rounded-3xl relative overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: uiColors.goalBg, color: uiColors.goalText }}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/60 bg-white/40">
        <button
          onClick={handlePrevMonth}
          className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 transition-all flex items-center justify-center text-xs shrink-0 active:scale-90"
          style={{ color: uiColors.goalText }}
        >
          ◀
        </button>
        <h2 className="text-sm font-black tracking-tight flex items-center justify-center gap-2" style={{ color: uiColors.goalText }}>
          <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm shadow-inner">🎯</span>
          <span>{selectedMonthDate.getFullYear()}年{selectedMonthDate.getMonth() + 1}月の目標</span>
          <span className="text-xs font-semibold opacity-50 hidden sm:inline">Monthly Focus</span>
          {isSaving && <span className="text-[10px] text-emerald-600/70 sm:ml-2 italic">Saving...</span>}
        </h2>
        <div className="flex items-center gap-1.5">
          <ColorStudioButton compact />
          <button
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 transition-all flex items-center justify-center text-xs shrink-0 active:scale-90"
            style={{ color: uiColors.goalText }}
          >
            ▶
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200/60" style={{ color: uiColors.goalText }}>
        <div className="p-4 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-80">
            <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-xs">🏃</span>
            行動 (Action)
          </div>
          <RichDocEditor
            value={content}
            onChange={handleContentChange}
            placeholder="今月やること、取り組む行動..."
            textAreaClassName="text-sm leading-6 placeholder:opacity-40"
            minHeight={56}
            theme="emerald"
          />
        </div>
        <div className="p-4 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-80">
            <span className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-xs">🧠</span>
            意識 (Mindset)
          </div>
          <RichDocEditor
            value={awareness}
            onChange={handleAwarenessChange}
            placeholder="意識したいこと、マインド..."
            textAreaClassName="text-sm leading-6 placeholder:opacity-40"
            minHeight={56}
            theme="emerald"
          />
        </div>
      </div>
    </section>
  );
}

// Moai Activity Board Component
function MoaiActivityBoard({ targetDateStr }: { targetDateStr: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [insightInput, setInsightInput] = useState("");
  const [actionInput, setActionInput] = useState("");
  const { data: list, refetch } = trpc.moaiActivity.list.useQuery();
  const create = trpc.moaiActivity.create.useMutation();
  const toggle = trpc.moaiActivity.toggleApplied.useMutation();
  const remove = trpc.moaiActivity.delete.useMutation();

  const handleSave = async () => {
    if (!insightInput.trim()) return;
    await create.mutateAsync({ insight: insightInput.trim(), action: actionInput.trim(), date: targetDateStr });
    setInsightInput("");
    setActionInput("");
    refetch();
    toast.success("Activity saved");
  };
  const handleDelete = async (id: number) => {
    await remove.mutateAsync({ id });
    refetch();
  };
  const handleToggle = async (id: number, currentApplied: boolean) => {
    await toggle.mutateAsync({ id, applied: !currentApplied });
    refetch();
  };

  return (
    <section className="mb-4">
      <div
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="flex items-center justify-between mb-3 px-1 cursor-pointer hover:bg-indigo-50/50 rounded-md py-1 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
            <span className="text-sm shrink-0">🗿</span> MOAI ACTIVITY
          </h2>
          <span className="text-[10px] text-muted-foreground bg-indigo-50 px-1.5 rounded-sm">Reflections & Actions</span>
        </div>
        <div className="text-indigo-400">
          {isOpen ? "▼" : "▶"}
        </div>
      </div>

      {isOpen && (
        <div className="animate-in slide-in-from-top-2 fade-in duration-200 space-y-3">
          <div className="flex flex-col gap-2 p-2 border border-indigo-100 rounded-lg bg-white/50">
            <div className="flex gap-2">
              <Input
                value={insightInput}
                onChange={(e) => setInsightInput(e.target.value)}
                placeholder="💡 気づき・発見を入力... (必須)"
                className="text-xs flex-1 border-indigo-100 focus-visible:ring-indigo-300"
              />
            </div>
            <div className="flex gap-2">
              <Input
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                placeholder="▶ アクション・ルール化... (任意)"
                className="text-xs flex-1 border-indigo-100 focus-visible:ring-indigo-300"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }}
              />
              <Button size="sm" onClick={handleSave} disabled={create.isPending || !insightInput.trim()} className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-3">
                Save
              </Button>
            </div>
          </div>

          {!list?.length ? <div className="text-xs text-muted-foreground px-1 italic">No activities yet.</div> : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {list.map((item: any) => (
                <div key={item.id} className={`group flex items-start gap-2 p-3 rounded-lg border ${item.applied ? 'border-indigo-100 bg-indigo-50/30' : 'border-slate-100 bg-white'} text-xs relative`}>
                  <button
                    onClick={() => handleToggle(item.id, item.applied)}
                    title={item.applied ? "アクション済み" : "アクションを実行する"}
                    className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${item.applied ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 hover:border-indigo-400'}`}
                  >
                    {item.applied && <CheckCircle2 className="w-3 h-3" />}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className={`font-medium text-slate-700 whitespace-pre-wrap ${item.applied ? 'opacity-70' : ''}`}>
                      {item.insight}
                    </div>
                    {item.action && (
                      <div className={`text-[11px] text-indigo-600/90 flex items-start gap-1 mt-1 ${item.applied ? 'opacity-70' : ''}`}>
                        <ArrowRight className="w-3 h-3 shrink-0" />
                        <span className="whitespace-pre-wrap">{item.action}</span>
                      </div>
                    )}
                    <div className="text-[9px] text-slate-300 pt-1">{new Date(item.createdAt).toLocaleDateString()}</div>

                    {/* Feedback Comments */}
                    <FeedbackSection targetType="moai" targetId={item.id} />

                    {/* Attached Photos */}
                    <div className="pt-1">
                      <ImageAttachmentArea
                        targetType="moai"
                        targetId={String(item.id)}
                        compact
                        buttonLabel="写真"
                      />
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-destructive shrink-0"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// Media Item Sub Component
function MediaItem({
  item,
  type,
  color,
  onStatusToggle,
  onDelete,
  onLongPress,
  renderStars
}: any) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startPress = () => {
    timerRef.current = setTimeout(() => {
      onLongPress(type, item);
    }, 500);
  };

  const cancelPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div
      className={`group flex items-center justify-between p-3 rounded-lg border ${item.status === 'completed' ? `border-${color}-100 bg-${color}-50/30` : 'border-slate-100 bg-white'} text-xs relative transition-all`}
      onMouseDown={startPress}
      onTouchStart={startPress}
      onMouseUp={cancelPress}
      onTouchEnd={cancelPress}
      onMouseLeave={cancelPress}
      onTouchMove={cancelPress}
    >
      <div className="flex items-center gap-3 w-full pointer-events-none">
        <button
          onClick={(e) => { e.stopPropagation(); onStatusToggle(item); }}
          className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors pointer-events-auto ${item.status === 'completed' ? `bg-${color}-500 border-${color}-500 text-white` : `border-slate-300 hover:border-${color}-400`}`}
        >
          {item.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
        </button>
        <div className={`font-medium flex-1 truncate ${item.status === 'completed' ? 'opacity-50 line-through text-slate-500' : 'text-slate-700'}`}>
          {item.title}
          {renderStars(item.rating)}
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="w-6 h-6 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 shrink-0 pointer-events-auto"
        onClick={(e) => { e.stopPropagation(); onDelete(item); }}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

// Investment Flow Tracker Component
function InvestmentFlowTracker() {
  const [tickerInput, setTickerInput] = useState("");
  const { data: tickers, refetch } = trpc.investmentTicker.list.useQuery();
  const createMutation = trpc.investmentTicker.create.useMutation();

  const handleAddTicker = async () => {
    if (!tickerInput.trim()) return;
    await createMutation.mutateAsync({ ticker: tickerInput.trim() });
    setTickerInput("");
    refetch();
    toast.success("Ticker added to watchlist");
  };

  const steps = [
    { key: "step1", label: "日足確認" },
    { key: "step2", label: "判定" },
    { key: "step3", label: "エントリールール" },
    { key: "step4", label: "損切り設定" },
    { key: "step5", label: "エントリー" },
    { key: "step6", label: "利確条件" },
    { key: "step7", label: "利確/損切り" },
  ] as const;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-4 px-1">
        <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1">
          <Activity className="w-3 h-3" /> INVESTMENT FLOW TRACKER
        </h2>
        <span className="text-[10px] text-teal-600/70 bg-teal-50 px-1.5 rounded-sm">短期銘柄・進捗管理</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 p-4 rounded-xl border border-teal-200 bg-teal-50/50 flex flex-col gap-3 h-fit">
          <div className="text-[11px] font-bold text-teal-800 flex items-center gap-1">
            <span>🔍</span> スクリーニング
          </div>
          <div className="text-[10px] text-teal-600/80 bg-white p-2 rounded border border-teal-100 italic">
            週足パーフェクトオーダ
          </div>
          <div className="flex flex-col gap-2">
            <Input
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              placeholder="銘柄コード/名称..."
              className="text-xs border-teal-200 focus-visible:ring-teal-400"
              onKeyDown={(e) => { if (e.key === "Enter") handleAddTicker(); }}
            />
            <Button
              onClick={handleAddTicker}
              disabled={createMutation.isPending || !tickerInput.trim()}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-8"
            >
              監視銘柄入力
            </Button>
          </div>
        </div>

        <div className="md:col-span-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto min-h-[150px]">
          {!tickers?.length ? (
            <div className="text-xs text-muted-foreground italic text-center py-8">
              監視中の銘柄はありません。
            </div>
          ) : (
            <div className="min-w-[650px] flex flex-col gap-6">
              {tickers.map((t: any) => (
                <TickerRow key={t.id} ticker={t} steps={steps} onUpdate={refetch} />
              ))}

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                  <div className="w-2.5 h-2.5 rounded-full border border-slate-300 bg-white" /> 未着手
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                  <div className="w-2.5 h-2.5 rounded-full border border-amber-500 bg-amber-400" /> 着手中
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                  <div className="w-2.5 h-2.5 rounded-full border border-emerald-600 bg-emerald-500" /> クリア
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                  <div className="w-2.5 h-2.5 rounded-full border border-red-600 bg-red-500" /> 断念/見送り
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TickerRow({ ticker, steps, onUpdate }: { ticker: any, steps: readonly any[], onUpdate: () => void }) {
  const [stopLoss, setStopLoss] = useState(ticker.stopLossText || "");
  const updateStepMutation = trpc.investmentTicker.updateStep.useMutation();
  const updateStopLossMutation = trpc.investmentTicker.updateStopLoss.useMutation();
  const deleteMutation = trpc.investmentTicker.delete.useMutation();

  const handleStopLossBlur = async () => {
    if (stopLoss !== ticker.stopLossText) {
      await updateStopLossMutation.mutateAsync({ id: ticker.id, stopLossText: stopLoss });
      onUpdate();
    }
  };

  const statusCycle = ["unstarted", "in_progress", "cleared", "failed"] as const;
  const statusColors: Record<string, string> = {
    unstarted: "bg-white border-slate-300",
    in_progress: "bg-amber-400 border-amber-500",
    cleared: "bg-emerald-500 border-emerald-600",
    failed: "bg-red-500 border-red-600",
  };

  const handleStepClick = async (stepKey: string, index: number) => {
    if (index > 0) {
      const prevStepKey = steps[index - 1].key;
      if (ticker[prevStepKey] !== "cleared") {
        toast.error("前のステップをクリアしてください");
        return;
      }
    }

    const currentStatus = ticker[stepKey];
    const idx = statusCycle.indexOf(currentStatus as any);
    const nextStatus = statusCycle[(idx + 1) % statusCycle.length];

    await updateStepMutation.mutateAsync({
      id: ticker.id,
      stepKey: stepKey as any,
      status: nextStatus,
    });
    onUpdate();
  };

  const handleDelete = async () => {
    if (confirm("監視リストから削除しますか？")) {
      await deleteMutation.mutateAsync({ id: ticker.id });
      onUpdate();
    }
  };

  return (
    <div className="relative group flex items-start gap-4 py-3">
      <div className="w-20 shrink-0 pt-1">
        <div className="text-sm font-bold text-slate-800 truncate">{ticker.ticker}</div>
        <button onClick={handleDelete} className="text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
          削除
        </button>
      </div>

      <div className="flex-1 flex items-start relative px-2">
        {/* Connection Lines */}
        <div className="absolute top-[35px] left-[calc(100%/14)] right-[calc(100%/14)] h-0.5 bg-slate-100 -z-10" />
        
        {steps.map((step, idx) => {
          const status = ticker[step.key];
          const isFinalStep = idx === steps.length - 1;
          
          // Show progress line to the right if current step is cleared
          const showConnector = !isFinalStep;
          const isConnectorActive = status === 'cleared';

          // Deadline alert (blinking) for Step 1
          const isStep1Blinking = step.key === 'step1' && 
                                  status !== 'cleared' && 
                                  status !== 'failed' && 
                                  ticker.step1StartedAt && 
                                  (new Date().getTime() - new Date(ticker.step1StartedAt).getTime()) / (1000 * 60 * 60 * 24) >= 9;

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center gap-2 group/step relative">
              <div className={`text-[9px] text-center leading-tight h-7 flex items-end justify-center px-0.5 transition-colors ${status === 'cleared' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                {step.label}
              </div>

              <div className="relative">
                <button
                  onClick={() => handleStepClick(step.key, idx)}
                  className={`w-4 h-4 rounded-full border-2 transition-all transform active:scale-90 z-10 ${statusColors[status]} ${isStep1Blinking ? 'animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]' : ''}`}
                />
                
                {/* Active connector segment */}
                {showConnector && (
                  <div className={`absolute top-1/2 left-full w-[calc(100%*6.5)] h-0.5 -translate-y-1/2 -z-20 transition-colors ${isConnectorActive ? 'bg-emerald-500' : 'bg-transparent'}`} 
                       style={{ width: `${(1 / (steps.length - 1)) * 500}%` }}
                  />
                )}
              </div>

              {step.key === "step4" && (
                <div className="absolute top-[52px] left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <input
                    type="text"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    onBlur={handleStopLossBlur}
                    placeholder="-%"
                    className="w-14 text-[10px] text-center border border-teal-200 rounded bg-teal-50/50 text-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-400 font-bold p-0.5"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
