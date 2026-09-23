import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { compressImage } from "@/lib/imageCompression";
import {
  Sparkles,
  Pin,
  Trash2,
  Edit2,
  ZoomIn,
  Plus,
  Loader2,
  X,
  Download,
  Calendar,
  Layers,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

export function AwarenessVisualGallery() {
  const utils = trpc.useUtils();
  const { data: visuals = [], isLoading } = trpc.awareness.listVisuals.useQuery();

  const [lightboxVisual, setLightboxVisual] = useState<any | null>(null);
  const [editingVisual, setEditingVisual] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMemo, setEditMemo] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveVisualMutation = trpc.awareness.saveVisual.useMutation({
    onSuccess: () => {
      utils.awareness.listVisuals.invalidate();
      toast.success("インフォビジュアルを追加しました！");
    },
    onError: () => toast.error("追加に失敗しました"),
    onSettled: () => setIsUploading(false),
  });

  const updateVisualMutation = trpc.awareness.updateVisual.useMutation({
    onSuccess: () => {
      utils.awareness.listVisuals.invalidate();
      toast.success("ビジュアル情報を更新しました");
      setEditingVisual(null);
    },
    onError: () => toast.error("更新に失敗しました"),
  });

  const deleteVisualMutation = trpc.awareness.deleteVisual.useMutation({
    onSuccess: () => {
      utils.awareness.listVisuals.invalidate();
      toast.success("インフォビジュアルを削除しました");
      if (lightboxVisual) setLightboxVisual(null);
    },
    onError: () => toast.error("削除に失敗しました"),
  });

  const handleTogglePin = (visual: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateVisualMutation.mutate({
      id: visual.id,
      isPinned: !visual.isPinned,
    });
  };

  const handleOpenEdit = (visual: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingVisual(visual);
    setEditTitle(visual.title || "");
    setEditMemo(visual.memo || "");
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVisual) return;
    updateVisualMutation.mutate({
      id: editingVisual.id,
      title: editTitle,
      memo: editMemo,
    });
  };

  const handleDelete = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("このインフォビジュアルを意識ライブラリから削除しますか？")) return;
    deleteVisualMutation.mutate({ id });
  };

  // Direct upload logic
  const processAndUpload = async (fileOrBlob: File | Blob, title?: string) => {
    setIsUploading(true);
    try {
      const dataUrl = await compressImage(fileOrBlob, { maxWidth: 1400, maxHeight: 1400, quality: 0.8 });
      await saveVisualMutation.mutateAsync({
        dataUrl,
        title: title || "",
        sourceType: "direct",
        sourceTitle: "直接登録",
      });
    } catch (err) {
      console.error(err);
      toast.error("画像の読み込み・保存に失敗しました");
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        await processAndUpload(file, file.name.replace(/\.[^/.]+$/, ""));
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Paste anywhere inside this component
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          e.stopPropagation();
          await processAndUpload(blob, `図解-${format(new Date(), "yyyyMMdd-HHmm")}`);
        }
      }
    }
  };

  const pinnedVisuals = visuals.filter((v: any) => v.isPinned);
  const otherVisuals = visuals.filter((v: any) => !v.isPinned);

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightboxVisual) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxVisual(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxVisual]);

  return (
    <div
      onPaste={handlePaste}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith("image/")) {
              await processAndUpload(file, file.name.replace(/\.[^/.]+$/, ""));
            }
          }
        }
      }}
      tabIndex={0}
      className={`space-y-6 outline-none transition-all ${
        isDragging ? "ring-2 ring-amber-500 rounded-2xl bg-amber-500/5 p-4" : ""
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border/60 shadow-xs">
        <div>
          <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
            <span>🖼️ インフォビジュアル・ライブラリ</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium border border-amber-500/20">
              {visuals.length} 件の図解
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ChatGPTやGemini等で作った習慣・気づきのインフォビジュアルを形骸化させずにストック
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold gap-1.5 shadow-xs cursor-pointer text-xs"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>図解画像を追加</span>
          </Button>
          <span className="text-[11px] text-muted-foreground hidden md:inline font-mono">
            (Ctrl+Vで貼り付け可)
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <p className="text-xs">インフォビジュアルを読み込み中...</p>
        </div>
      ) : visuals.length === 0 ? (
        <div className="py-16 px-4 text-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-sm font-bold">まだインフォビジュアルが登録されていません</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              掲示板や焚き火日記に貼った画像の上にある「💡 意識に残す」ボタンを押すか、右上の「図解画像を追加」（または画面上で Ctrl+V）から登録してみましょう！
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 text-xs font-semibold gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>画像をアップロード</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pinned section */}
          {pinnedVisuals.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Pin className="w-3.5 h-3.5 fill-amber-500" />
                <span>📌 フォーカス中のインフォビジュアル ({pinnedVisuals.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedVisuals.map((visual: any) => (
                  <VisualCard
                    key={visual.id}
                    visual={visual}
                    onOpenLightbox={() => setLightboxVisual(visual)}
                    onTogglePin={(e) => handleTogglePin(visual, e)}
                    onOpenEdit={(e) => handleOpenEdit(visual, e)}
                    onDelete={(e) => handleDelete(visual.id, e)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All / Other section */}
          <div className="space-y-3">
            {pinnedVisuals.length > 0 && (
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Layers className="w-3.5 h-3.5" />
                <span>すべてのインフォビジュアル ({otherVisuals.length})</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(pinnedVisuals.length > 0 ? otherVisuals : visuals).map((visual: any) => (
                <VisualCard
                  key={visual.id}
                  visual={visual}
                  onOpenLightbox={() => setLightboxVisual(visual)}
                  onTogglePin={(e) => handleTogglePin(visual, e)}
                  onOpenEdit={(e) => handleOpenEdit(visual, e)}
                  onDelete={(e) => handleDelete(visual.id, e)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Dialog / Modal */}
      {lightboxVisual && (
        <div
          onClick={() => setLightboxVisual(null)}
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150 cursor-zoom-out select-none"
        >
          <button
            type="button"
            onClick={() => setLightboxVisual(null)}
            className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full border border-white/20 transition-all cursor-pointer shadow-lg"
            title="閉じる (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl max-h-[92vh] flex flex-col items-center justify-center cursor-default"
          >
            <img
              src={lightboxVisual.dataUrl}
              alt={lightboxVisual.title || "インフォビジュアル"}
              className="max-w-[94vw] max-h-[75vh] object-contain rounded-xl shadow-2xl border border-stone-800 bg-stone-950/80"
            />

            {/* Lightbox footer caption & actions */}
            <div className="mt-3 w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-white px-2">
              <div className="text-left max-w-md">
                <div className="font-bold text-sm text-stone-100 flex items-center gap-2">
                  {lightboxVisual.title || "（タイトル未設定）"}
                  {lightboxVisual.isPinned && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ピン留め中
                    </span>
                  )}
                </div>
                {lightboxVisual.memo && (
                  <p className="text-xs text-stone-300 mt-0.5 whitespace-pre-wrap line-clamp-2">
                    {lightboxVisual.memo}
                  </p>
                )}
                <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-1">
                  <span>出典: {lightboxVisual.sourceTitle || "直接登録"}</span>
                  <span>•</span>
                  <span>{format(new Date(lightboxVisual.createdAt), "yyyy/MM/dd")}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTogglePin(lightboxVisual)}
                  className={`text-xs gap-1 border-white/20 text-white ${
                    lightboxVisual.isPinned
                      ? "bg-amber-500/30 text-amber-200 border-amber-400/50"
                      : "bg-stone-800/80 hover:bg-stone-700"
                  }`}
                >
                  <Pin className={`w-3.5 h-3.5 ${lightboxVisual.isPinned ? "fill-amber-400" : ""}`} />
                  <span>{lightboxVisual.isPinned ? "ピン解除" : "ピン留め"}</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEdit(lightboxVisual)}
                  className="text-xs gap-1 bg-stone-800/80 hover:bg-stone-700 text-white border-white/20"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>編集</span>
                </Button>
                <a
                  href={lightboxVisual.dataUrl}
                  download={`visual-${lightboxVisual.id}-${Date.now()}.webp`}
                  className="px-3 py-1.5 bg-stone-800/80 hover:bg-stone-700 text-white text-xs font-medium rounded-md border border-white/20 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>保存</span>
                </a>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(lightboxVisual.id)}
                  className="text-xs gap-1 bg-red-900/80 hover:bg-red-800 text-white border-red-700/50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={Boolean(editingVisual)} onOpenChange={(open) => !open && setEditingVisual(null)}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-500" />
                インフォビジュアルの編集
              </DialogTitle>
              <DialogDescription className="text-xs">
                図解のタイトルや、常に意識しておきたい気づき・行動指針メモを編集できます。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">タイトル・合言葉</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="例: タスク着手前の3秒深呼吸、朝イチの優先順位づけ"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">気づき・行動メモ</label>
                <Textarea
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  rows={4}
                  placeholder="このインフォビジュアルを見たときに意識したいこと、行動トリガー、教訓など..."
                  className="text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingVisual(null)}
                className="text-xs"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateVisualMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                保存する
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VisualCard({
  visual,
  onOpenLightbox,
  onTogglePin,
  onOpenEdit,
  onDelete,
}: {
  visual: any;
  onOpenLightbox: () => void;
  onTogglePin: (e: React.MouseEvent) => void;
  onOpenEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onOpenLightbox}
      className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden bg-card hover:shadow-lg cursor-pointer flex flex-col ${
        visual.isPinned
          ? "border-amber-500/50 shadow-amber-500/5 ring-1 ring-amber-500/30"
          : "border-border/70 hover:border-amber-500/40"
      }`}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-video w-full bg-stone-950/80 overflow-hidden border-b border-border/40">
        <img
          src={visual.dataUrl}
          alt={visual.title || "インフォビジュアル"}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Hover zoom overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
          <div className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-xs text-white text-[11px] font-medium flex items-center gap-1">
            <ZoomIn className="w-3.5 h-3.5" />
            <span>拡大表示</span>
          </div>
        </div>

        {/* Top-right quick actions */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onTogglePin}
            className={`p-1.5 rounded-lg backdrop-blur-sm transition-all cursor-pointer shadow-xs ${
              visual.isPinned
                ? "bg-amber-500 text-stone-950 hover:bg-amber-400"
                : "bg-black/60 hover:bg-black/80 text-white"
            }`}
            title={visual.isPinned ? "ピン留め解除" : "先頭にピン留め"}
          >
            <Pin className={`w-3.5 h-3.5 ${visual.isPinned ? "fill-stone-950" : ""}`} />
          </button>
        </div>

        {/* Source badge on top-left */}
        <div className="absolute top-2 left-2">
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-stone-200 border border-white/10 font-medium">
            {visual.sourceTitle || "直接登録"}
          </span>
        </div>
      </div>

      {/* Content area */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {visual.title || "（タイトル未設定）"}
          </h3>

          {visual.memo ? (
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed whitespace-pre-wrap">
              {visual.memo}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground/60 italic mt-1">
              クリックしてメモや気づきを追加できます
            </p>
          )}
        </div>

        {/* Card footer */}
        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-stone-400" />
            <span>{format(new Date(visual.createdAt), "yyyy/MM/dd")}</span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={onOpenEdit}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="編集"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="p-1 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
              title="削除"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
