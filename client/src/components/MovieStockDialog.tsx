import React, { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Film, CheckCircle2, Trash2, Calendar, Star, Play, Sparkles, LayoutGrid, Image as ImageIcon, Search, Ticket, Tv, Armchair, DoorOpen, Clock } from "lucide-react";
import { format } from "date-fns";

/** 0.5刻み対応の星表示（読み取り専用） */
function StarsView({ rating, size = "text-sm" }: { rating: number; size?: string }) {
  const pct = Math.max(0, Math.min(5, rating)) * 20;
  return (
    <span
      className={`relative inline-block leading-none tracking-tight ${size}`}
      title={`${rating} / 5`}
      aria-label={`評価 ${rating} / 5`}
    >
      <span className="text-stone-300 dark:text-stone-700">★★★★★</span>
      <span className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-amber-500" style={{ width: `${pct}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

/** 0.5刻みで選べる星入力（各星の左半分=x.5 / 右半分=x.0） */
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, value - (star - 1)));
        return (
          <span key={star} className="relative inline-block w-9 h-9 text-3xl leading-9 text-center select-none">
            <span className="text-stone-300 dark:text-stone-700">★</span>
            <span
              className="absolute left-0 top-0 overflow-hidden text-amber-500 whitespace-nowrap"
              style={{ width: `${fill * 100}%` }}
            >
              <span className="inline-block w-9 text-center">★</span>
            </span>
            <button
              type="button"
              aria-label={`${star - 0.5}点`}
              onClick={() => onChange(star - 0.5)}
              className="absolute left-0 top-0 h-full w-1/2 cursor-pointer"
            />
            <button
              type="button"
              aria-label={`${star}点`}
              onClick={() => onChange(star)}
              className="absolute right-0 top-0 h-full w-1/2 cursor-pointer"
            />
          </span>
        );
      })}
    </div>
  );
}

interface MovieStockDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // 今日のミッションに直接追加するコールバック（オプショナル）
  onAddToTodayMission?: (movieTitle: string, slotInfo?: { timeSlot?: string; seatName?: string }) => Promise<void> | void;
  // 既存の映画ミッションにこのタイトルをセットするコールバック（オプショナル）
  onSelectForActiveMission?: (movieTitle: string) => Promise<void> | void;
}

export function MovieStockDialog({
  isOpen,
  onOpenChange,
  onAddToTodayMission,
  onSelectForActiveMission,
}: MovieStockDialogProps) {
  const [newTitle, setNewTitle] = useState("");
  const [activeTab, setActiveTab] = useState<"cinema" | "stock" | "completed" | "gallery">("cinema");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data: movies, refetch: refetchMovies } = trpc.movie.list.useQuery(undefined, {
    enabled: isOpen,
  });

  const createMovie = trpc.movie.create.useMutation();
  const updateStatus = trpc.movie.updateStatus.useMutation();
  const deleteMovie = trpc.movie.delete.useMutation();
  const updateReview = trpc.movie.updateReview.useMutation();
  const setPoster = trpc.movie.setPoster.useMutation();
  const backfill = trpc.movie.backfillPosters.useMutation();
  const utils = trpc.useUtils();

  // 図鑑の詳細 / ポスター選択ダイアログ用
  const [detailTarget, setDetailTarget] = useState<any | null>(null);
  const [pickerTarget, setPickerTarget] = useState<any | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerCandidates, setPickerCandidates] = useState<any[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerConfigured, setPickerConfigured] = useState<boolean | null>(null);

  // シネマ座席予約ダイアログ用
  const [bookingTarget, setBookingTarget] = useState<{
    movie: any;
    slot: { time: string; screen: string; formatType: string };
  } | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string>("sofa-1");

  // レビューダイアログ用
  const [reviewTarget, setReviewTarget] = useState<any | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>("");

  const stockMovies = movies?.filter((m: any) => m.status !== "completed") || [];
  const completedMovies = movies?.filter((m: any) => m.status === "completed") || [];
  const [galleryFilter, setGalleryFilter] = useState<"all" | "completed" | "watching">("all");
  const galleryMovies =
    galleryFilter === "completed" ? completedMovies : galleryFilter === "watching" ? stockMovies : movies || [];

  // スマホでも確実に送信できる追加処理
  const handleAddMovie = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    try {
      const created: any = await createMovie.mutateAsync({ title: trimmed });
      setNewTitle("");
      refetchMovies();
      // フォーカスを再取得
      setTimeout(() => inputRef.current?.focus(), 50);
      if (created?.posterUrl) {
        toast.success(`🎬『${created.officialTitle || trimmed}』を映画ストックに追加しました！`);
      } else {
        toast.success(`🎬『${trimmed}』を映画ストックに追加しました！`);
        // 自動で確定できなかった → 候補から選んでもらう
        openPosterPicker(created, true);
      }
    } catch (err) {
      toast.error("映画の追加に失敗しました");
    }
  };

  // ---- ポスター候補選択 ----
  const openPosterPicker = (movie: any, auto = false) => {
    setDetailTarget(null);
    setPickerTarget(movie);
    setPickerQuery(movie.title);
    setPickerCandidates([]);
    setPickerConfigured(null);
    runPosterSearch(movie.title, auto);
  };

  const runPosterSearch = async (query: string, silentIfEmpty = false) => {
    if (!query.trim()) return;
    setPickerLoading(true);
    try {
      const res = await utils.movie.searchPoster.fetch({ query: query.trim() });
      setPickerConfigured(res.configured);
      setPickerCandidates(res.candidates);
      // 自動オープン時に候補ゼロなら邪魔しない（プレースホルダーのまま）
      if (silentIfEmpty && (!res.configured || res.candidates.length === 0)) {
        setPickerTarget(null);
      }
    } catch {
      toast.error("画像の検索に失敗しました");
      if (silentIfEmpty) setPickerTarget(null);
    } finally {
      setPickerLoading(false);
    }
  };

  const handlePickPoster = async (c: any) => {
    if (!pickerTarget) return;
    try {
      await setPoster.mutateAsync({
        id: pickerTarget.id,
        tmdbId: c.tmdbId,
        posterUrl: c.posterUrl,
        officialTitle: c.officialTitle,
        releaseYear: c.releaseYear,
      });
      toast.success(`『${c.officialTitle}』の画像を設定しました`);
      setPickerTarget(null);
      refetchMovies();
    } catch {
      toast.error("画像の設定に失敗しました");
    }
  };

  const handleBackfill = async () => {
    try {
      const r = await backfill.mutateAsync();
      if (!r.configured) {
        toast.error("TMDB APIキーが未設定です");
      } else if (r.updated > 0) {
        toast.success(`${r.updated}本のポスターを設定しました${r.skipped ? `（${r.skipped}本は詳細から手動で選べます）` : ""}`);
      } else {
        toast.info("自動で確定できませんでした。各映画の詳細から「画像を探し直す」で選べます");
      }
      refetchMovies();
    } catch {
      toast.error("ポスターの取得に失敗しました");
    }
  };

  const handleToggleStatus = async (item: any) => {
    try {
      const nextStatus = item.status === "completed" ? "watching" : "completed";
      await updateStatus.mutateAsync({ id: item.id, status: nextStatus });
      toast.success(nextStatus === "completed" ? `✨『${item.title}』を視聴完了にしました！` : `『${item.title}』をストックに戻しました`);
      refetchMovies();
    } catch {
      toast.error("ステータスの更新に失敗しました");
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`『${item.title}』をストックから削除しますか？`)) return;
    try {
      await deleteMovie.mutateAsync({ id: item.id });
      toast.info("映画を削除しました");
      refetchMovies();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const handleSaveReview = async () => {
    if (!reviewTarget) return;
    try {
      await updateReview.mutateAsync({
        id: reviewTarget.id,
        rating,
        review: reviewText,
      });
      toast.success("レビューを保存しました！");
      setReviewTarget(null);
      refetchMovies();
    } catch {
      toast.error("保存に失敗しました");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className={`${activeTab === "gallery" ? "sm:max-w-3xl" : "sm:max-w-lg"} transition-[max-width] duration-300 max-h-[90vh] flex flex-col p-4 sm:p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 shadow-xl`}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <DialogHeader className="shrink-0 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎬</span>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>映画ストック・プール</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold border border-rose-200/60">
                    {stockMovies.length}本ストック中
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  気になった映画を事前ストック。観たい日にワンタップで予定に引き込めます。
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Quick Add Form (図鑑タブのときはスッキリ折りたたみ可能またはコンパクトに) */}
          <div className="shrink-0 mb-2">
            <form
              onSubmit={handleAddMovie}
              className="p-2.5 sm:p-3 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 space-y-1.5"
              onTouchStart={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <Label className="text-[11px] sm:text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>気になった映画をすぐ溜める</span>
                </Label>
              </div>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  type="text"
                  autoComplete="off"
                  enterKeyHint="done"
                  placeholder="映画のタイトルを入力..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onTouchStart={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => (e.target as HTMLInputElement).focus()}
                  style={{ touchAction: "manipulation" }}
                  className="h-9 sm:h-10 text-xs sm:text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 border-stone-300 dark:border-stone-700 flex-1"
                />
                <Button
                  type="submit"
                  disabled={createMovie.isPending || !newTitle.trim()}
                  className="h-9 sm:h-10 px-3.5 sm:px-4 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shrink-0 rounded-lg gap-1 shadow-xs active:scale-95 transition-all"
                >
                  {createMovie.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>溜める</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Tabs: Cinema vs Gallery vs Stock vs Completed */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl text-xs font-bold mb-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("cinema")}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "cinema"
                  ? "bg-amber-500 text-stone-950 shadow-sm font-black"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>上映中 ({stockMovies.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("gallery")}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "gallery"
                  ? "bg-stone-950 text-white shadow-sm font-black dark:bg-stone-100 dark:text-stone-950"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-rose-500" />
              <span>図鑑 ({movies?.length ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("stock")}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "stock"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm font-black"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              <Film className="w-3.5 h-3.5 text-rose-500" />
              <span>リスト</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "completed"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm font-black"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>履歴 ({completedMovies.length})</span>
            </button>
          </div>

          {/* Movie List Container (スマホでのタッチスクロール確実化) */}
          <div
            className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0 overscroll-contain"
            style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {activeTab === "cinema" ? (
              stockMovies.length === 0 ? (
                <div className="text-center py-12 px-4 text-xs text-stone-400 dark:text-stone-500 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
                  <Ticket className="w-10 h-10 text-amber-500/60 mx-auto mb-2" />
                  <div className="font-bold text-sm text-stone-800 dark:text-stone-200">現在上映中の作品（ストック）はありません</div>
                  <div className="text-[11px] text-stone-400 mt-1">
                    上の入力欄から気になる映画を追加すると、シネコン上映スケジュールに配給されます。
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* ユナイテッド・シネマ風シアターヘッダー */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500 text-stone-950 font-black">
                        MY HOME CINEMA
                      </span>
                      <span className="text-xs font-bold text-stone-300">
                        旭川プライベートシアター 1K
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold">
                      <span className="px-2 py-0.5 rounded bg-stone-800 text-amber-400">今日</span>
                      <span className="px-2 py-0.5 rounded text-stone-500">明日</span>
                    </div>
                  </div>

                  {/* 映画ごとの上映回カード（ユナイテッド・シネマ再現） */}
                  {stockMovies.map((movie: any, idx: number) => {
                    // 映画ごとにリアルな上映回スロットを生成（自宅スクリーン1 / 2）
                    const slots = [
                      {
                        time: idx % 2 === 0 ? "13:30 〜 15:45" : "10:30 〜 12:45",
                        screen: "スクリーン1 (リビング)",
                        formatType: idx % 3 === 0 ? "4DX [臨場感]" : "3D [迫力]",
                      },
                      {
                        time: idx % 2 === 0 ? "18:40 〜 20:55" : "15:20 〜 17:35",
                        screen: "スクリーン1 (リビング)",
                        formatType: "2D [通常]",
                      },
                      {
                        time: "21:30 〜 23:45",
                        screen: "スクリーン2 (ベッド)",
                        formatType: "レイトショー [寝落可]",
                      },
                    ];

                    return (
                      <div
                        key={movie.id}
                        className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 shadow-xl space-y-3"
                      >
                        {/* 映画タイトルバー */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {movie.posterUrl ? (
                              <img
                                src={movie.posterUrl}
                                alt={movie.title}
                                className="w-10 h-14 object-cover rounded-md shrink-0 shadow-md ring-1 ring-white/10"
                              />
                            ) : (
                              <div className="w-10 h-14 rounded-md bg-stone-800 flex items-center justify-center shrink-0">
                                <Film className="w-5 h-5 text-stone-500" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-black text-white leading-tight break-words">
                                {movie.officialTitle || movie.title}
                              </div>
                              <div className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-2">
                                <span>{movie.releaseYear || "上映作品"}</span>
                                <span className="text-stone-600">•</span>
                                <span className="text-stone-400">日本語字幕 / 吹替</span>
                              </div>
                            </div>
                          </div>

                          {/* 予約購入ボタン */}
                          <Button
                            size="sm"
                            onClick={() => {
                              setBookingTarget({
                                movie,
                                slot: slots[0],
                              });
                            }}
                            className="h-8 px-3 text-xs bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-lg gap-1 shrink-0 shadow-md active:scale-95 transition-all cursor-pointer"
                          >
                            <Ticket className="w-3.5 h-3.5" />
                            <span>予約購入</span>
                          </Button>
                        </div>

                        {/* 上映スロット一覧（ユナイテッド・シネマ完全再現） */}
                        <div className="space-y-1.5 pt-1 border-t border-stone-900">
                          {slots.map((slot, sIdx) => (
                            <div
                              key={sIdx}
                              className="flex items-center justify-between p-2 rounded-xl bg-stone-900/90 border border-stone-800/80 hover:border-amber-500/50 transition-colors"
                            >
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono font-bold text-stone-100 text-xs sm:text-sm">
                                  {slot.time}
                                </span>
                                <span className="text-stone-400 text-[11px] underline underline-offset-2">
                                  {slot.screen}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  {slot.formatType}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setBookingTarget({
                                    movie,
                                    slot,
                                  });
                                }}
                                className="px-2.5 py-1 rounded-md bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-400 hover:text-emerald-300 font-black text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm"
                              >
                                <span className="text-[10px]">◎</span>
                                <span>空席あり</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : activeTab === "gallery" ? (
              !movies || movies.length === 0 ? (
                <div className="text-center py-12 px-4 text-xs text-stone-400 dark:text-stone-500 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
                  <LayoutGrid className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                  <div className="font-bold">まだ映画が登録されていません</div>
                </div>
              ) : (
                <>
                  {movies.some((m: any) => !m.posterUrl) && (
                    <button
                      type="button"
                      onClick={handleBackfill}
                      disabled={backfill.isPending}
                      className="w-full mb-3 py-2 text-xs font-bold rounded-xl border border-dashed border-rose-400/80 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      {backfill.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                      画像が無い映画のポスターを一括自動取得
                    </button>
                  )}

                  {/* Netflix風 フィルターピル */}
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none" style={{ touchAction: "pan-x" }}>
                    {([
                      ["all", "すべて", movies.length],
                      ["completed", "観た作品", completedMovies.length],
                      ["watching", "観たい候補", stockMovies.length],
                    ] as const).map(([key, label, count]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setGalleryFilter(key)}
                        className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                          galleryFilter === key
                            ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 font-black scale-102"
                            : "bg-stone-100 dark:bg-stone-800/90 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200/60 dark:border-stone-700/60"
                        }`}
                      >
                        <span>{label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          galleryFilter === key ? "bg-white/20 text-white" : "bg-stone-200/80 dark:bg-stone-700/80 text-stone-500 dark:text-stone-400"
                        }`}>
                          {count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {galleryMovies.length === 0 && (
                    <div className="text-center py-12 text-xs text-stone-400 dark:text-stone-500 font-medium">
                      該当する映画がありません
                    </div>
                  )}

                  {/* Netflix風 ポスターグリッド（スマホ演出強化） */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 sm:gap-3 p-0.5">
                    {galleryMovies.map((movie: any) => {
                      const done = movie.status === "completed";
                      return (
                        <div
                          key={movie.id}
                          onClick={() => setDetailTarget(movie)}
                          role="button"
                          tabIndex={0}
                          className="group relative block text-left rounded-xl overflow-hidden bg-stone-900 shadow-md ring-1 ring-black/10 dark:ring-white/10 aspect-[2/3] transition-all duration-300 ease-out active:scale-93 hover:scale-105 hover:z-20 hover:shadow-2xl hover:shadow-black/70 cursor-pointer select-none"
                        >
                          {movie.posterUrl ? (
                            <img
                              src={movie.posterUrl}
                              alt={movie.title}
                              loading="lazy"
                              className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-108 ${
                                done ? "brightness-100" : "brightness-85 saturate-75 group-hover:brightness-100 group-hover:saturate-100"
                              }`}
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2 bg-gradient-to-br from-stone-800 via-stone-900 to-black text-center">
                              <Film className="w-6 h-6 text-stone-500" />
                              <span className="text-[10px] font-bold text-stone-300 leading-tight line-clamp-3">
                                {movie.officialTitle || movie.title}
                              </span>
                            </div>
                          )}

                          {/* シネマティックオーバーレイ：上部と下部フェード */}
                          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

                          {/* 左上: 観た/観たいバッジ（Netflix風リボンピル） */}
                          <div className="absolute top-1.5 left-1.5 pointer-events-none">
                            <span
                              className={`inline-flex items-center text-[9px] font-black tracking-tight px-1.5 py-0.5 rounded-md shadow-sm backdrop-blur-md ${
                                done
                                  ? "bg-emerald-500/90 text-white"
                                  : "bg-rose-600/90 text-white ring-1 ring-white/20"
                              }`}
                            >
                              {done ? "観た" : "観たい"}
                            </span>
                          </div>

                          {/* 右下: 星評価バッジ（ゴールドネオン演出） */}
                          {movie.rating ? (
                            <div className="absolute bottom-1.5 right-1.5 pointer-events-none">
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-stone-950/85 backdrop-blur-md border border-amber-500/30 text-[10px] font-black text-amber-400 shadow-md">
                                <span className="text-[9px] text-amber-400">★</span>
                                <span>{movie.rating}</span>
                              </span>
                            </div>
                          ) : null}

                          {/* タイトル表示：スマホでも見やすいよう下部に上品に表示 */}
                          <div className="absolute inset-x-0 bottom-0 p-1.5 pb-2 text-white pointer-events-none">
                            <div className="text-[10px] sm:text-[11px] font-bold leading-tight line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] pr-11">
                              {movie.officialTitle || movie.title}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>

              )
            ) : activeTab === "stock" ? (
              stockMovies.length === 0 ? (
                <div className="text-center py-10 px-4 text-xs text-stone-400 dark:text-stone-500 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
                  <Film className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                  <div>ストック中の映画はありません</div>
                  <div className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
                    上の入力欄から気になった映画を登録しておくと、後から見返せます。
                  </div>
                </div>
              ) : (
                stockMovies.map((movie: any) => (
                  <div
                    key={movie.id}
                    className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/90 hover:border-rose-300 dark:hover:border-rose-800 transition-all flex items-center justify-between gap-3 group shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 break-words leading-snug">
                        {movie.title}
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3 h-3 opacity-60 text-stone-400" />
                        <span>追加: {format(new Date(movie.createdAt), "yyyy/MM/dd")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Active mission selector mode (if opened from an existing mission) */}
                      {onSelectForActiveMission && (
                        <Button
                          size="sm"
                          onClick={() => {
                            onSelectForActiveMission(movie.title);
                            onOpenChange(false);
                          }}
                          className="h-8 px-2.5 text-xs bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg shadow-2xs gap-1"
                          title="この映画を現在のミッションにセット"
                        >
                          <span>選択</span>
                        </Button>
                      )}

                      {/* Direct Add to Today Planning mode */}
                      {onAddToTodayMission && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            await onAddToTodayMission(movie.title);
                            onOpenChange(false);
                          }}
                          className="h-8 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg shadow-2xs gap-1 cursor-pointer"
                          title="今日の予定に『映画』リラックスミッションとして追加"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>今日観る</span>
                        </Button>
                      )}

                      {/* Mark Completed button */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(movie)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        title="視聴完了にする"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleDelete(movie)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="ストックから削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : completedMovies.length === 0 ? (
              <div className="text-center py-10 px-4 text-xs text-stone-400 dark:text-stone-500 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                <div>まだ視聴完了した映画はありません</div>
              </div>
            ) : (
              completedMovies.map((movie: any) => (
                <div
                  key={movie.id}
                  className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70 flex items-center justify-between gap-3 group shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-stone-800 dark:text-stone-200 line-through opacity-70 break-words">
                        {movie.title}
                      </span>
                      {movie.rating ? <StarsView rating={movie.rating} size="text-xs" /> : null}
                    </div>
                    {movie.review && (
                      <div className="text-[11px] text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800/60 p-2 rounded-lg mt-1.5 whitespace-pre-wrap border border-stone-200/50 dark:border-stone-700/50">
                        {movie.review}
                      </div>
                    )}
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 font-mono">
                      {movie.completedAt
                        ? `鑑賞日: ${format(new Date(movie.completedAt), "yyyy/MM/dd")}`
                        : `登録日: ${format(new Date(movie.createdAt), "yyyy/MM/dd")}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReviewTarget(movie);
                        setRating(movie.rating || 0);
                        setReviewText(movie.review || "");
                      }}
                      className="h-7 px-2 text-[10px] font-bold border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <Star className="w-3 h-3 text-amber-500 mr-1" />
                      レビュー
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(movie)}
                      className="text-[10px] text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 p-1 underline"
                      title="ストック（未視聴）に戻す"
                    >
                      未視聴に戻す
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(movie)}
                      className="p-1 text-stone-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      {reviewTarget && (
        <Dialog open={!!reviewTarget} onOpenChange={(open) => !open && setReviewTarget(null)}>
          <DialogContent className="sm:max-w-md p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-black truncate text-stone-900 dark:text-stone-100">
                🎬『{reviewTarget.title}』の評価と感想
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs font-bold text-stone-700 dark:text-stone-200 block mb-1">
                  星評価 (0.5刻み){rating > 0 ? `：${rating}` : ""}
                </Label>
                <div className="flex items-center gap-1">
                  <StarPicker value={rating} onChange={setRating} />
                  {rating > 0 && (
                    <button
                      type="button"
                      onClick={() => setRating(0)}
                      className="text-xs text-muted-foreground ml-2 hover:underline"
                    >
                      クリア
                    </button>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold block mb-1">感想 / 一言メモ</Label>
                <textarea
                  className="w-full min-h-[90px] rounded-lg border border-stone-300 dark:border-stone-700 p-2.5 text-xs sm:text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-rose-400/60"
                  placeholder="面白かったシーンやおすすめポイントなど..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setReviewTarget(null)}>
                  キャンセル
                </Button>
                <Button size="sm" onClick={handleSaveReview} className="bg-rose-500 hover:bg-rose-600 text-white font-bold">
                  保存する
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 図鑑 詳細ダイアログ */}
      {detailTarget && (() => {
        const d = movies?.find((m: any) => m.id === detailTarget.id) ?? detailTarget;
        return (
          <Dialog open onOpenChange={(open) => !open && setDetailTarget(null)}>
            <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden bg-stone-950 border border-stone-800 text-stone-100 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="relative">
                {d.posterUrl && (
                  <img
                    src={d.posterUrl}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-40"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-stone-950/60 to-stone-950" />
                <div className="relative flex gap-4 p-5 pt-9">
                  <div className="w-32 shrink-0 aspect-[2/3] rounded-md overflow-hidden bg-stone-800 flex items-center justify-center shadow-2xl ring-1 ring-white/10">
                    {d.posterUrl ? (
                      <img src={d.posterUrl} alt={d.title} className="w-full h-full object-cover" />
                    ) : (
                      <Film className="w-8 h-8 text-stone-600" />
                    )}
                  </div>
                  <DialogHeader className="min-w-0 flex-1 space-y-2 text-left justify-end">
                    <span
                      className={`self-start text-[10px] font-black px-2 py-0.5 rounded-sm ${
                        d.status === "completed" ? "bg-emerald-500/90 text-white" : "bg-rose-500/90 text-white"
                      }`}
                    >
                      {d.status === "completed" ? "観た" : "観たい"}
                    </span>
                    <DialogTitle className="text-lg font-black leading-tight break-words text-white">
                      {d.officialTitle || d.title}
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-stone-400 leading-snug">
                      {d.releaseYear ? `${d.releaseYear}` : ""}
                      {d.officialTitle && d.officialTitle !== d.title
                        ? `${d.releaseYear ? " ・ " : ""}登録名: ${d.title}`
                        : ""}
                    </DialogDescription>
                    {d.rating ? (
                      <div className="flex items-center gap-2">
                        <StarsView rating={d.rating} size="text-base" />
                        <span className="text-sm font-black text-amber-400">{d.rating}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-stone-500">未評価</div>
                    )}
                    <div className="text-[10px] text-stone-500 font-mono">
                      {d.completedAt
                        ? `鑑賞日 ${format(new Date(d.completedAt), "yyyy/MM/dd")}`
                        : `追加 ${format(new Date(d.createdAt), "yyyy/MM/dd")}`}
                    </div>
                  </DialogHeader>
                </div>
              </div>
              <div className="px-5 pb-5 space-y-3">
                {d.review && (
                  <div className="text-xs leading-relaxed text-stone-200 bg-white/5 p-3 rounded-md whitespace-pre-wrap border border-white/5">
                    {d.review}
                  </div>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs bg-transparent border-stone-700 text-stone-200 hover:bg-white/10 hover:text-white"
                    onClick={() => openPosterPicker(d)}
                  >
                    <ImageIcon className="w-3 h-3 mr-1" />
                    画像を探し直す
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs bg-white text-stone-900 hover:bg-stone-200 font-bold"
                    onClick={() => {
                      setReviewTarget(d);
                      setRating(d.rating || 0);
                      setReviewText(d.review || "");
                      setDetailTarget(null);
                    }}
                  >
                    <Star className="w-3 h-3 text-amber-500 mr-1 fill-current" />
                    評価・感想
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ポスター候補選択ダイアログ */}
      {pickerTarget && (
        <Dialog open onOpenChange={(open) => !open && setPickerTarget(null)}>
          <DialogContent className="sm:max-w-md p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 shadow-xl max-h-[90vh] flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-base font-black">🖼️ 画像を選ぶ</DialogTitle>
              <DialogDescription className="text-xs">
                略称や別名でも検索できます。合うものをタップしてください。
              </DialogDescription>
            </DialogHeader>
            <form
              className="flex gap-2 shrink-0"
              onSubmit={(e) => {
                e.preventDefault();
                runPosterSearch(pickerQuery);
              }}
            >
              <Input
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="映画のタイトルで検索..."
                className="h-9 text-xs flex-1"
              />
              <Button type="submit" size="sm" disabled={pickerLoading || !pickerQuery.trim()} className="h-9 text-xs">
                {pickerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </form>
            <div className="flex-1 overflow-y-auto min-h-[160px]">
              {pickerConfigured === false ? (
                <div className="text-xs text-stone-500 text-center py-8">TMDB APIキーが未設定です。</div>
              ) : pickerCandidates.length === 0 && !pickerLoading ? (
                <div className="text-xs text-stone-500 text-center py-8">候補が見つかりませんでした。別のキーワードを試してください。</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {pickerCandidates.map((c) => (
                    <button
                      key={c.tmdbId}
                      type="button"
                      onClick={() => handlePickPoster(c)}
                      className="text-left rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 hover:border-rose-400 active:scale-95 transition-all"
                    >
                      <div className="aspect-[2/3] bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                        {c.posterUrl ? (
                          <img src={c.posterUrl} alt={c.officialTitle} loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <Film className="w-6 h-6 text-stone-300" />
                        )}
                      </div>
                      <div className="p-1 text-[10px] leading-tight font-bold line-clamp-2">
                        {c.officialTitle}
                        {c.releaseYear ? <span className="font-normal text-stone-500"> ({c.releaseYear})</span> : null}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 🎟️ 1Kおうちシアター 座席指定予約モーダル（手描き間取り完全再現） */}
      {bookingTarget && (
        <Dialog open onOpenChange={(open) => !open && setBookingTarget(null)}>
          <DialogContent className="sm:max-w-md p-4 sm:p-5 bg-stone-950 border border-stone-800 text-stone-100 shadow-2xl max-h-[92vh] flex flex-col">
            <DialogHeader className="shrink-0 text-left pb-2 border-b border-stone-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black px-2 py-0.5 rounded bg-amber-500 text-stone-950">
                  座席指定
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  {bookingTarget.slot.time}
                </span>
              </div>
              <DialogTitle className="text-base font-black text-white mt-1 break-words">
                🎬 {bookingTarget.movie.officialTitle || bookingTarget.movie.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-400">
                お好みのシート（ソファ / ベッド）をタップして発券してください。
              </DialogDescription>
            </DialogHeader>

            {/* シアター間取りマップ（手描きの1K部屋を完全再現） */}
            <div className="flex-1 py-3 overflow-y-auto">
              <div className="relative mx-auto w-full max-w-[340px] aspect-[1/1] p-3 rounded-2xl bg-stone-900/90 border-2 border-stone-800 shadow-inner flex flex-col justify-between select-none">
                
                {/* 部屋の上部：左上にスクリーン（テレビ） */}
                <div className="flex justify-between items-start">
                  {/* テレビ・スクリーン */}
                  <div className="p-2.5 rounded-xl bg-stone-800 border-2 border-amber-500/80 shadow-lg shadow-amber-500/10 text-center w-[130px]">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-black text-amber-400">
                      <Tv className="w-3.5 h-3.5" />
                      <span>SCREEN</span>
                    </div>
                    <div className="text-[9px] font-bold text-stone-300 mt-0.5">
                      テレビ (大画面)
                    </div>
                    {/* スクリーンの白い発光バー */}
                    <div className="w-full h-1 bg-white rounded-full mt-1.5 shadow-[0_0_8px_white]" />
                  </div>

                  {/* 部屋の天井・壁の雰囲気 */}
                  <div className="text-right text-[10px] font-mono text-stone-600 pr-1">
                    MY ROOM 1K
                  </div>
                </div>

                {/* 部屋の中央左：ソファ席（2席並び） */}
                <div className="my-auto pl-1">
                  <div className="text-[10px] font-bold text-stone-400 mb-1 flex items-center gap-1">
                    <Armchair className="w-3 h-3 text-rose-400" />
                    <span>ソファ席 (特等席 / 正面)</span>
                  </div>
                  <div className="flex gap-2">
                    {/* ソファ A-1 */}
                    <button
                      type="button"
                      onClick={() => setSelectedSeat("sofa-1")}
                      className={`w-[68px] py-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                        selectedSeat === "sofa-1"
                          ? "bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-600/40 scale-105 font-black ring-2 ring-white/30"
                          : "bg-stone-800/90 border-stone-700 text-stone-200 hover:border-stone-500"
                      }`}
                    >
                      <span className="text-[10px] font-mono font-bold">A-1</span>
                      <span className="text-[9px] mt-0.5">ソファ左</span>
                      <span className="text-[8px] opacity-70">◎空席</span>
                    </button>

                    {/* ソファ A-2 */}
                    <button
                      type="button"
                      onClick={() => setSelectedSeat("sofa-2")}
                      className={`w-[68px] py-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                        selectedSeat === "sofa-2"
                          ? "bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-600/40 scale-105 font-black ring-2 ring-white/30"
                          : "bg-stone-800/90 border-stone-700 text-stone-200 hover:border-stone-500"
                      }`}
                    >
                      <span className="text-[10px] font-mono font-bold">A-2</span>
                      <span className="text-[9px] mt-0.5">ソファ右</span>
                      <span className="text-[8px] opacity-70">◎空席</span>
                    </button>
                  </div>
                </div>

                {/* 部屋の下部：ベッド席（横長） ＆ 右下にEXIT廊下 */}
                <div className="flex items-end justify-between pt-1">
                  {/* ベッド席 */}
                  <div className="w-[180px]">
                    <div className="text-[10px] font-bold text-stone-400 mb-1 flex items-center gap-1">
                      <span>🛏️</span>
                      <span>ベッド席 (ごろ寝シアター)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSeat("bed-1")}
                      className={`w-full py-2.5 rounded-xl border-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        selectedSeat === "bed-1"
                          ? "bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-600/40 scale-102 font-black ring-2 ring-white/30"
                          : "bg-stone-800/90 border-stone-700 text-stone-200 hover:border-stone-500"
                      }`}
                    >
                      <span className="text-[10px] font-mono font-bold">B-1</span>
                      <span className="text-[10px]">エグゼクティブ・ベッド</span>
                      <span className="text-[8px] opacity-70">◎空席</span>
                    </button>
                  </div>

                  {/* 映画館おなじみのEXIT（廊下） */}
                  <div className="flex flex-col items-center text-center pl-2">
                    <div className="px-2 py-1 rounded bg-emerald-600 text-white text-[9px] font-black flex items-center gap-0.5 shadow-sm">
                      <DoorOpen className="w-3 h-3" />
                      <span>非常口</span>
                    </div>
                    <span className="text-[9px] font-bold text-stone-500 mt-1 font-mono">
                      EXIT (廊下)
                    </span>
                  </div>
                </div>

              </div>

              {/* 席選択ステータス表示 */}
              <div className="mt-3 p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">選択中の座席:</span>
                  <span className="font-black text-amber-400 text-sm">
                    {selectedSeat === "sofa-1" && "🛋️ A-1 ソファ左席"}
                    {selectedSeat === "sofa-2" && "🛋️ A-2 ソファ右席"}
                    {selectedSeat === "bed-1" && "🛏️ B-1 ベッド特別席"}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-bold">
                  鑑賞料金: ¥0 (自宅)
                </span>
              </div>
            </div>

            {/* 発券ボタン */}
            <div className="pt-2 border-t border-stone-800/80 flex justify-end gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBookingTarget(null)}
                className="text-xs bg-transparent border-stone-700 text-stone-300 hover:bg-stone-800"
              >
                戻る
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  const seatLabel =
                    selectedSeat === "sofa-1"
                      ? "A-1 ソファ左"
                      : selectedSeat === "sofa-2"
                      ? "A-2 ソファ右"
                      : "B-1 ベッド席";

                  if (onAddToTodayMission) {
                    await onAddToTodayMission(bookingTarget.movie.title, {
                      timeSlot: bookingTarget.slot.time,
                      seatName: seatLabel,
                    });
                  } else {
                    toast.success(
                      `🎟️ 発券完了！『${bookingTarget.movie.title}』(${bookingTarget.slot.time} 【${seatLabel}】)`
                    );
                  }
                  setBookingTarget(null);
                  onOpenChange(false);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs px-4 rounded-lg shadow-lg shadow-amber-500/20 gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Ticket className="w-4 h-4 fill-current" />
                <span>チケットを発券して今日の予定に追加</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
