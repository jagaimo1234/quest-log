import React, { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Film, CheckCircle2, Trash2, Calendar, Star, Play, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface MovieStockDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // 今日のミッションに直接追加するコールバック（オプショナル）
  onAddToTodayMission?: (movieTitle: string) => Promise<void> | void;
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
  const [activeTab, setActiveTab] = useState<"stock" | "completed">("stock");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data: movies, refetch: refetchMovies } = trpc.movie.list.useQuery(undefined, {
    enabled: isOpen,
  });

  const createMovie = trpc.movie.create.useMutation();
  const updateStatus = trpc.movie.updateStatus.useMutation();
  const deleteMovie = trpc.movie.delete.useMutation();
  const updateReview = trpc.movie.updateReview.useMutation();

  // レビューダイアログ用
  const [reviewTarget, setReviewTarget] = useState<any | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>("");

  const stockMovies = movies?.filter((m: any) => m.status !== "completed") || [];
  const completedMovies = movies?.filter((m: any) => m.status === "completed") || [];

  // スマホでも確実に送信できる追加処理
  const handleAddMovie = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    try {
      await createMovie.mutateAsync({ title: trimmed });
      toast.success(`🎬『${trimmed}』を映画ストックに追加しました！`);
      setNewTitle("");
      refetchMovies();
      // フォーカスを再取得
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      toast.error("映画の追加に失敗しました");
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
          className="sm:max-w-lg max-h-[90vh] flex flex-col p-4 sm:p-6 bg-background border-stone-200 dark:border-stone-800"
          onTouchStart={(e) => e.stopPropagation()}
        >
          <DialogHeader className="shrink-0 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎬</span>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>映画ストック・プール</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold">
                    {stockMovies.length}本ストック中
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  気になった映画を事前ストック。観たい日にワンタップで予定に引き込めます。
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Quick Add Form (Mobile Optimized) */}
          <form
            onSubmit={handleAddMovie}
            className="shrink-0 p-3 rounded-xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2 mb-3"
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Label className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>気になった映画をすぐ溜める</span>
            </Label>
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
                className="h-10 text-xs sm:text-sm bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 flex-1"
              />
              <Button
                type="submit"
                disabled={createMovie.isPending || !newTitle.trim()}
                className="h-10 px-4 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shrink-0 rounded-lg gap-1 shadow-xs"
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

          {/* Tabs: Stock vs Completed */}
          <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg text-xs font-bold mb-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("stock")}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "stock"
                  ? "bg-background text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Film className="w-3.5 h-3.5 text-rose-500" />
              <span>観たい映画 ({stockMovies.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "completed"
                  ? "bg-background text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>観た履歴 ({completedMovies.length})</span>
            </button>
          </div>

          {/* Movie List Container */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[200px]">
            {activeTab === "stock" ? (
              stockMovies.length === 0 ? (
                <div className="text-center py-10 px-4 text-xs text-muted-foreground border border-dashed rounded-xl">
                  <Film className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <div>ストック中の映画はありません</div>
                  <div className="text-[11px] text-muted-foreground/70 mt-1">
                    上の入力欄から気になった映画を登録しておくと、後から見返せます。
                  </div>
                </div>
              ) : (
                stockMovies.map((movie: any) => (
                  <div
                    key={movie.id}
                    className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-card hover:border-rose-300 dark:hover:border-rose-900 transition-all flex items-center justify-between gap-3 group shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 break-words leading-snug">
                        {movie.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3 h-3 opacity-60" />
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
              <div className="text-center py-10 px-4 text-xs text-muted-foreground border border-dashed rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <div>まだ視聴完了した映画はありません</div>
              </div>
            ) : (
              completedMovies.map((movie: any) => (
                <div
                  key={movie.id}
                  className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-card/60 flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 line-through opacity-75 break-words">
                        {movie.title}
                      </span>
                      {movie.rating ? (
                        <span className="text-amber-500 text-xs font-mono font-bold">
                          {"★".repeat(movie.rating)}
                        </span>
                      ) : null}
                    </div>
                    {movie.review && (
                      <div className="text-[11px] text-stone-600 dark:text-stone-300 bg-muted/40 p-1.5 rounded mt-1 whitespace-pre-wrap">
                        {movie.review}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
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
                      className="h-7 px-2 text-[10px] font-bold"
                    >
                      <Star className="w-3 h-3 text-amber-500 mr-1" />
                      レビュー
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(movie)}
                      className="text-[10px] text-muted-foreground hover:text-stone-900 p-1 underline"
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
          <DialogContent className="sm:max-w-md p-6 bg-background">
            <DialogHeader>
              <DialogTitle className="text-base font-black truncate">
                🎬『{reviewTarget.title}』の評価と感想
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs font-bold block mb-1">星評価 (1〜5)</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-2xl transition-transform hover:scale-125 cursor-pointer ${
                        star <= rating ? "text-amber-500" : "text-stone-300 dark:text-stone-700"
                      }`}
                    >
                      ★
                    </button>
                  ))}
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
                  className="w-full min-h-[90px] rounded-lg border border-input p-2.5 text-xs sm:text-sm bg-background"
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
    </>
  );
}
