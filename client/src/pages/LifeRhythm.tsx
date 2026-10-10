import React, { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import {
  Loader2,
  ArrowLeft,
  Flame,
  Clock,
  Calendar,
  CheckCircle2,
  Award,
  Sparkles,
  BarChart3,
  Filter,
  Eye,
  Info,
  BookOpen,
  Layers,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// 曜日定義（月曜始まり: 1, 2, 3, 4, 5, 6, 0）
const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS: Record<number, { name: string; short: string; isWeekend: boolean }> = {
  1: { name: "月曜日", short: "月", isWeekend: false },
  2: { name: "火曜日", short: "火", isWeekend: false },
  3: { name: "水曜日", short: "水", isWeekend: false },
  4: { name: "木曜日", short: "木", isWeekend: false },
  5: { name: "金曜日", short: "金", isWeekend: false },
  6: { name: "土曜日", short: "土", isWeekend: true },
  0: { name: "日曜日", short: "日", isWeekend: true },
};

type RangeOption = "all" | "30" | "90" | "180";
type QuestTypeOption = "ALL" | "Daily" | "Weekly" | "Monthly" | "Free" | "Relax";

export default function LifeRhythm() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [daysRange, setDaysRange] = useState<RangeOption>("all");
  const [questType, setQuestType] = useState<QuestTypeOption>("ALL");
  const [showFull24Hours, setShowFull24Hours] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<{ dayOfWeek: number; hour: number } | null>(null);

  const { data, isLoading } = trpc.rhythm.getHeatmap.useQuery(
    {
      daysRange,
      questType: questType === "ALL" ? undefined : questType,
    },
    { enabled: isAuthenticated }
  );

  // 表示する時間帯（通常は 06:00〜24:00、全表示なら 00:00〜24:00）
  const displayHours = useMemo(() => {
    if (showFull24Hours) {
      return Array.from({ length: 24 }, (_, i) => i);
    }
    // 06:00 から 23:00 (24時枠)
    return Array.from({ length: 18 }, (_, i) => i + 6);
  }, [showFull24Hours]);

  // マトリクスデータを辞書化して高速参照
  const cellMap = useMemo(() => {
    if (!data?.weekdayHourGrid) return new Map();
    const map = new Map();
    for (const item of data.weekdayHourGrid) {
      map.set(`${item.dayOfWeek}-${item.hour}`, item);
    }
    return map;
  }, [data]);

  // ヒートマップの最大値を計算（色の正規化用）
  const maxCellCount = useMemo(() => {
    if (!data?.weekdayHourGrid) return 1;
    let max = 1;
    for (const item of data.weekdayHourGrid) {
      if (item.count > max) max = item.count;
    }
    return max;
  }, [data]);

  // 選択されたセルの詳細情報
  const activeCellDetail = useMemo(() => {
    if (!selectedCell || !cellMap) return null;
    return cellMap.get(`${selectedCell.dayOfWeek}-${selectedCell.hour}`) || null;
  }, [selectedCell, cellMap]);

  // セルの色分け関数
  const getCellColorClass = (count: number) => {
    if (count === 0) {
      return "bg-stone-900/30 hover:bg-stone-800/40 border-stone-800/40 text-stone-600";
    }
    if (count >= 20) {
      return "bg-amber-500 text-stone-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.6)] border-amber-300 ring-1 ring-amber-300/60";
    }
    if (count >= 10) {
      return "bg-emerald-500 text-stone-950 font-bold border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.4)]";
    }
    if (count >= 5) {
      return "bg-emerald-600/80 text-emerald-100 font-semibold border-emerald-500/70";
    }
    if (count >= 2) {
      return "bg-emerald-800/60 text-emerald-200 border-emerald-700/60";
    }
    return "bg-emerald-950/70 text-emerald-300 border-emerald-800/40";
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 border-stone-800 bg-stone-900/90">
          <CardHeader>
            <CardTitle className="text-xl text-amber-500">生活リズム分析</CardTitle>
            <CardDescription>データを見るにはログインが必要です</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = getLoginUrl()} className="w-full">
              ログイン
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* トップヘッダー */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => window.location.href = "/"}
              variant="ghost"
              size="icon"
              className="hover:bg-accent/10"
              title="ホームへ戻る"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-amber-500" />
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  生活リズム分析 <span className="text-xs text-amber-500/90 font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">Activity Heatmap</span>
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                ミッション実行の実態から、あなたの生活リズムと行動パターンを可視化
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = "/history"}
              className="text-xs gap-1.5 border-stone-700 hover:bg-stone-800"
            >
              <BookOpen className="w-3.5 h-3.5" />
              履歴一覧
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* フィルターバー */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-stone-900/60 rounded-xl border border-stone-800/80 shadow-xs">
          {/* 期間選択 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> 期間:
            </span>
            {(
              [
                { label: "全期間", value: "all" },
                { label: "直近30日", value: "30" },
                { label: "直近90日", value: "90" },
                { label: "直近180日", value: "180" },
              ] as const
            ).map((opt) => (
              <Button
                key={opt.value}
                variant={daysRange === opt.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setDaysRange(opt.value)}
                className={`h-7 px-2.5 text-xs rounded-lg transition-all ${
                  daysRange === opt.value
                    ? "bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold"
                    : "text-stone-400 hover:text-stone-200 hover:bg-stone-800"
                }`}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {/* 種別選択 & 時間帯トグル */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-stone-950/70 p-1 rounded-lg border border-stone-800 text-xs">
              <Filter className="w-3 h-3 text-stone-400 ml-1.5" />
              {(
                [
                  { label: "すべて", value: "ALL" },
                  { label: "Daily", value: "Daily" },
                  { label: "Weekly", value: "Weekly" },
                  { label: "Relax", value: "Relax" },
                ] as const
              ).map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setQuestType(type.value)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    questType === type.value
                      ? "bg-stone-800 text-amber-400 font-semibold"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFull24Hours(!showFull24Hours)}
              className="h-7 text-xs border-stone-700/80 text-stone-300 hover:bg-stone-800 gap-1"
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              {showFull24Hours ? "06:00〜24:00に絞る" : "24時間全表示"}
            </Button>
          </div>
        </div>

        {/* ローディング表示 */}
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-sm text-muted-foreground">生活リズムデータを集計中...</p>
          </div>
        ) : !data || data.summary.totalLogged === 0 ? (
          <Card className="border-stone-800 bg-stone-900/40 text-center p-8">
            <Info className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <h3 className="text-base font-semibold text-stone-300">対象データがありません</h3>
            <p className="text-xs text-muted-foreground mt-1">
              選択した期間または種別のミッション履歴が存在しません。
            </p>
          </Card>
        ) : (
          <>
            {/* スタッツカード 4枚 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* ピーク時間帯 */}
              <Card className="border-stone-800/80 bg-stone-900/60 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full pointer-events-none" />
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between text-xs text-amber-500 font-semibold">
                    <span>最多活動ゾーン</span>
                    <Clock className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-black text-amber-400">
                    {data.summary.peakHour.label} - {String(data.summary.peakHour.hour + 1).padStart(2, "0")}:00
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    計 <span className="font-bold text-stone-200">{data.summary.peakHour.count}回</span> 実行（最も定着）
                  </p>
                </CardContent>
              </Card>

              {/* ピーク曜日 */}
              <Card className="border-stone-800/80 bg-stone-900/60 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                    <span>最も活発な曜日</span>
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-black text-emerald-400">
                    {data.summary.peakDay.name}曜日
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    計 <span className="font-bold text-stone-200">{data.summary.peakDay.count}回</span> の行動ログ
                  </p>
                </CardContent>
              </Card>

              {/* クリア率 */}
              <Card className="border-stone-800/80 bg-stone-900/60 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full pointer-events-none" />
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between text-xs text-blue-400 font-semibold">
                    <span>達成・クリア率</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-black text-blue-400">
                    {data.summary.completionRate}%
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    クリア <span className="font-bold text-stone-200">{data.summary.clearedCount}</span> / 失敗 {data.summary.failedCount}
                  </p>
                </CardContent>
              </Card>

              {/* ログ総数 */}
              <Card className="border-stone-800/80 bg-stone-900/60 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-bl-full pointer-events-none" />
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between text-xs text-purple-400 font-semibold">
                    <span>時間枠ログ総数</span>
                    <Layers className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-black text-purple-400">
                    {data.summary.totalWithSlots} <span className="text-sm font-normal text-stone-400">枠</span>
                  </div>
                  <p className="text-xs text-stone-400 mt-1 truncate">
                    {data.summary.minDate} 〜 {data.summary.maxDate}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ヒートマップ本体 & 詳細パネル */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ヒートマップマトリクス (8カラム) */}
              <Card className="lg:col-span-8 border-stone-800/80 bg-stone-900/50 shadow-md">
                <CardHeader className="p-4 sm:p-5 pb-3 border-b border-stone-800/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                        <Flame className="w-5 h-5 text-amber-500" />
                        24時間 × 曜日 アクティビティヒートマップ
                      </CardTitle>
                      <CardDescription className="text-xs text-stone-400 mt-0.5">
                        マス目をクリックすると、その時間帯に実行したミッションの内訳を確認できます
                      </CardDescription>
                    </div>

                    {/* レジェンド */}
                    <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-400">
                      <span>少</span>
                      <div className="w-3 h-3 rounded bg-stone-900/40 border border-stone-800/40" />
                      <div className="w-3 h-3 rounded bg-emerald-950/70 border border-emerald-800/40" />
                      <div className="w-3 h-3 rounded bg-emerald-800/60 border border-emerald-700/60" />
                      <div className="w-3 h-3 rounded bg-emerald-600/80 border border-emerald-500/70" />
                      <div className="w-3 h-3 rounded bg-emerald-500 border border-emerald-300" />
                      <div className="w-3 h-3 rounded bg-amber-500 border border-amber-300 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
                      <span>多</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-3 sm:p-5 overflow-x-auto">
                  <div className="min-w-[500px]">
                    {/* 曜日ヘッダー行 */}
                    <div className="grid grid-cols-8 gap-1.5 mb-2 text-center text-xs font-bold">
                      <div className="text-stone-500 text-[11px] flex items-center justify-center">
                        時刻
                      </div>
                      {DAYS_ORDER.map((d) => {
                        const dayInfo = DAY_LABELS[d];
                        return (
                          <div
                            key={d}
                            className={`py-1 rounded-md ${
                              dayInfo.isWeekend
                                ? "text-amber-400/90 bg-amber-500/10 border border-amber-500/20"
                                : "text-stone-300 bg-stone-800/40 border border-stone-700/30"
                            }`}
                          >
                            <span>{dayInfo.short}</span>
                            <span className="hidden sm:inline">曜</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* 時間行ループ */}
                    <div className="space-y-1.5">
                      {displayHours.map((hour) => {
                        const hourLabel = `${String(hour).padStart(2, "0")}:00`;
                        return (
                          <div key={hour} className="grid grid-cols-8 gap-1.5 items-center">
                            {/* 時刻ラベル */}
                            <div className="text-[11px] font-mono text-stone-400 text-right pr-2">
                              {hourLabel}
                            </div>

                            {/* 各曜日のセル */}
                            {DAYS_ORDER.map((dayOfWeek) => {
                              const key = `${dayOfWeek}-${hour}`;
                              const cell = cellMap.get(key) || { count: 0, clearedCount: 0, topQuests: [] };
                              const isSelected =
                                selectedCell?.dayOfWeek === dayOfWeek && selectedCell?.hour === hour;

                              return (
                                <TooltipProvider key={key} delayDuration={150}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedCell({ dayOfWeek, hour })}
                                        className={`h-7 sm:h-8 rounded-md border text-[11px] font-mono flex items-center justify-center transition-all cursor-pointer relative ${getCellColorClass(
                                          cell.count
                                        )} ${
                                          isSelected
                                            ? "ring-2 ring-white ring-offset-2 ring-offset-stone-950 scale-105 z-10 font-black shadow-lg"
                                            : ""
                                        }`}
                                      >
                                        {cell.count > 0 ? cell.count : ""}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="bg-stone-900 border-stone-700 text-stone-100 p-2 text-xs shadow-xl max-w-xs"
                                    >
                                      <div className="font-bold text-amber-400">
                                        {DAY_LABELS[dayOfWeek].name} {hourLabel} - {String(hour + 1).padStart(2, "0")}:00
                                      </div>
                                      <div className="text-stone-300 mt-1">
                                        実行回数: <span className="font-bold">{cell.count}回</span>（クリア: {cell.clearedCount}）
                                      </div>
                                      {cell.topQuests && cell.topQuests.length > 0 && (
                                        <div className="mt-1.5 pt-1.5 border-t border-stone-800 text-[11px] text-stone-400">
                                          主な内容: {cell.topQuests.map((q: any) => `${q.name}(${q.count})`).join(", ")}
                                        </div>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 右側：スロット詳細 & 気づきパネル (4カラム) */}
              <div className="lg:col-span-4 space-y-4">
                {/* 選択中のセルの詳細 */}
                <Card className="border-stone-800/80 bg-stone-900/60 shadow-md">
                  <CardHeader className="p-4 pb-2 border-b border-stone-800/60">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-stone-200">
                        <Eye className="w-4 h-4 text-amber-500" />
                        時間枠の内訳・実態
                      </span>
                      {selectedCell && (
                        <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400">
                          {DAY_LABELS[selectedCell.dayOfWeek].name} {String(selectedCell.hour).padStart(2, "0")}:00
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 text-xs">
                    {!selectedCell ? (
                      <div className="text-center py-8 text-stone-400">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
                        <p>左側のマス目をクリックすると</p>
                        <p className="mt-1 text-[11px] text-stone-500">
                          その時間枠で何をどれくらいやってきたかがここに表示されます
                        </p>
                      </div>
                    ) : !activeCellDetail || activeCellDetail.count === 0 ? (
                      <div className="text-center py-6 text-stone-400">
                        <p className="font-semibold text-stone-300">
                          {DAY_LABELS[selectedCell.dayOfWeek].name} {String(selectedCell.hour).padStart(2, "0")}:00〜
                        </p>
                        <p className="mt-2 text-stone-500">
                          この時間枠の記録はまだありません（未着手・余白の時間帯）
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 p-2.5 bg-stone-950/60 rounded-lg border border-stone-800">
                          <div>
                            <span className="text-[11px] text-stone-400">総実行回数</span>
                            <div className="text-lg font-black text-amber-400">
                              {activeCellDetail.count} <span className="text-xs font-normal text-stone-400">回</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[11px] text-stone-400">クリア成功</span>
                            <div className="text-lg font-black text-emerald-400">
                              {activeCellDetail.clearedCount} <span className="text-xs font-normal text-stone-400">回</span>
                              {activeCellDetail.failedCount > 0 && (
                                <span className="text-xs text-rose-400 ml-1">
                                  (失敗{activeCellDetail.failedCount})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="font-semibold text-stone-300 mb-2 flex items-center justify-between">
                            <span>実行したミッション内訳:</span>
                            <span className="text-[11px] text-stone-500">回数</span>
                          </div>
                          <div className="space-y-1.5">
                            {activeCellDetail.topQuests && activeCellDetail.topQuests.length > 0 ? (
                              activeCellDetail.topQuests.map((q: any) => (
                                <div
                                  key={q.name}
                                  className="flex items-center justify-between p-2 rounded-md bg-stone-800/40 border border-stone-800"
                                >
                                  <span className="font-medium text-stone-200 truncate pr-2">
                                    {q.name}
                                  </span>
                                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[11px] px-2">
                                    {q.count}回
                                  </Badge>
                                </div>
                              ))
                            ) : (
                              <p className="text-stone-500">詳細データなし</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 行動の気づき・インサイト */}
                <Card className="border-amber-500/30 bg-amber-500/[0.04] shadow-xs">
                  <CardHeader className="p-4 pb-2 border-b border-amber-500/20">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-amber-400">
                      <Sparkles className="w-4 h-4" />
                      データが語るあなたの生活実態
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 text-xs space-y-2.5 text-stone-300 leading-relaxed">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>
                        <strong className="text-amber-300">{data.summary.peakHour.label}台</strong>があなたの最強のゴールデンタイムです（全体の突出したピーク）。ナイトルーティンが非常に強固に定着しています。
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>
                        朝は<strong className="text-emerald-300">08:00〜09:00</strong>付近に生活リズムの立ち上がりが見られ、散歩などの身体を動かす習慣が定期的に実行されています。
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>
                        全体クリア率は<strong className="text-blue-300">{data.summary.completionRate}%</strong>と極めて高く、時間枠を決めたミッションはほぼ確実にやりきる高い実行力を持っています。
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 下部：時間帯別ボリューム棒グラフ & 定着習慣ランキング */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* 24時間ボリュームグラフ (7カラム) */}
              <Card className="lg:col-span-7 border-stone-800/80 bg-stone-900/50 shadow-md">
                <CardHeader className="p-4 sm:p-5 pb-2 border-b border-stone-800/60">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    時間帯別のアクティビティ量（24時間のリズム波形）
                  </CardTitle>
                  <CardDescription className="text-xs text-stone-400">
                    1日の中でどの時間帯に活動が集中しているか（緑: クリア / 赤: 失敗）
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <div className="space-y-2">
                    {data.hourlyDistribution
                      .filter((h) => showFull24Hours || (h.hour >= 6 && h.hour <= 23))
                      .map((h) => {
                        const maxH = Math.max(
                          ...data.hourlyDistribution.map((d) => d.total),
                          1
                        );
                        const pct = Math.round((h.total / maxH) * 100);

                        return (
                          <div key={h.hour} className="flex items-center gap-2 text-xs">
                            <span className="w-12 font-mono text-stone-400 text-right shrink-0">
                              {h.label}
                            </span>
                            <div className="flex-1 bg-stone-950/70 h-5 rounded-md overflow-hidden flex border border-stone-800/60 relative">
                              {h.cleared > 0 && (
                                <div
                                  style={{ width: `${(h.cleared / maxH) * 100}%` }}
                                  className="bg-emerald-600 hover:bg-emerald-500 transition-all h-full"
                                  title={`クリア: ${h.cleared}件`}
                                />
                              )}
                              {h.failed > 0 && (
                                <div
                                  style={{ width: `${(h.failed / maxH) * 100}%` }}
                                  className="bg-rose-600 hover:bg-rose-500 transition-all h-full"
                                  title={`失敗: ${h.failed}件`}
                                />
                              )}
                            </div>
                            <span className="w-12 text-right font-mono font-semibold text-stone-300 shrink-0">
                              {h.total > 0 ? `${h.total}回` : "-"}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              {/* 定着している習慣TOPランキング (5カラム) */}
              <Card className="lg:col-span-5 border-stone-800/80 bg-stone-900/50 shadow-md">
                <CardHeader className="p-4 sm:p-5 pb-2 border-b border-stone-800/60">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    時間枠に定着している主な習慣
                  </CardTitle>
                  <CardDescription className="text-xs text-stone-400">
                    頻出ミッションと最も多く実行されている時間帯
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <div className="space-y-2.5">
                    {data.topQuestsSummary.length === 0 ? (
                      <p className="text-xs text-stone-500">データがありません</p>
                    ) : (
                      data.topQuestsSummary.map((quest, idx) => (
                        <div
                          key={quest.name}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950/60 border border-stone-800/80 hover:border-stone-700/80 transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-stone-200 truncate">
                                {quest.name}
                              </p>
                              <p className="text-[11px] text-amber-400/90 font-mono flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {quest.peakTime}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge className="bg-stone-800 text-stone-200 border-stone-700 text-xs">
                              {quest.totalCount}回
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
