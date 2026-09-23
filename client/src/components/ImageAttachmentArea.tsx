import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { trpc } from "../lib/trpc";
import { compressImage } from "../lib/imageCompression";
import { Camera, Image as ImageIcon, Trash2, X, ZoomIn, Loader2, Download, Plus, Lightbulb } from "lucide-react";
import { toast } from "sonner";

export interface ImageAttachmentAreaRef {
  handlePasteEvent: (e: React.ClipboardEvent) => boolean;
  uploadBlob: (blob: Blob, name?: string) => Promise<void>;
}

interface ImageAttachmentAreaProps {
  targetType: string;
  targetId: string;
  compact?: boolean;
  buttonLabel?: string;
  showPasteHint?: boolean;
  className?: string;
}

export const ImageAttachmentArea = forwardRef<ImageAttachmentAreaRef, ImageAttachmentAreaProps>(
  function ImageAttachmentArea(
    {
      targetType,
      targetId,
      compact = false,
      buttonLabel = "写真を追加",
      showPasteHint = true,
      className = "",
    },
    ref
  ) {
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  // Queries & Mutations
  const { data: attachments, refetch } = trpc.attachment.list.useQuery(
    { targetType, targetId },
    { enabled: Boolean(targetType && targetId) }
  );
  const uploadMutation = trpc.attachment.upload.useMutation();
  const deleteMutation = trpc.attachment.delete.useMutation();

  const getHumanReadableSourceTitle = (type: string, id: string) => {
    if (type === "bulletin" || type === "notice_board") {
      if (id.startsWith("month-") || id.includes("-m-")) return `月間掲示板 (${id})`;
      if (id.startsWith("week-") || id.includes("-w-")) return `週間掲示板 (${id})`;
      return `日間掲示板 (${id})`;
    }
    if (type === "diary" || type === "bonfire") return `焚き火日記 (${id})`;
    if (type === "goal") return `目標 (${id})`;
    if (type === "investment") return `投資掲示板 (${id})`;
    return `${type} (${id})`;
  };

  const saveVisualMutation = trpc.awareness.saveVisual.useMutation({
    onSuccess: () => {
      utils.awareness.listVisuals.invalidate();
      toast.success("💡 意識のインフォビジュアルライブラリに残しました！", {
        action: {
          label: "意識画面へ",
          onClick: () => {
            window.location.href = "/awareness?tab=visuals";
          },
        },
      });
    },
    onError: () => {
      toast.error("意識ライブラリへの保存に失敗しました");
    },
  });

  // Process and upload a file or blob
  const processAndUpload = async (fileOrBlob: File | Blob, name?: string) => {
    setIsUploading(true);
    try {
      const dataUrl = await compressImage(fileOrBlob, { maxWidth: 1200, maxHeight: 1200, quality: 0.75 });
      await uploadMutation.mutateAsync({
        targetType,
        targetId,
        dataUrl,
        fileName: name || `photo-${Date.now()}.webp`,
      });
      refetch();
      toast.success("写真を添付しました（自動軽量化済み）");
    } catch (err: any) {
      console.error("Failed to upload image:", err);
      toast.error("写真の添付に失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle files selected via file input
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        await processAndUpload(file, file.name);
      }
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/")) {
          await processAndUpload(file, file.name);
        }
      }
    }
  };

  // Expose methods via ref for parent components (e.g. textareas)
  useImperativeHandle(ref, () => ({
    handlePasteEvent: (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return false;

      let foundImage = false;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          foundImage = true;
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            e.stopPropagation();
            processAndUpload(blob, `screenshot-${Date.now()}.webp`);
          }
        }
      }
      return foundImage;
    },
    uploadBlob: async (blob: Blob, name?: string) => {
      await processAndUpload(blob, name);
    },
  }));

  // Handle Paste event (Ctrl+V / Cmd+V)
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
          await processAndUpload(blob, `screenshot-${Date.now()}.webp`);
        }
      }
    }
  };

  // Delete attachment
  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("この写真を削除しますか？")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      refetch();
      toast.success("写真を削除しました");
    } catch (err) {
      toast.error("削除に失敗しました");
    }
  };

  // Close lightbox on Escape and lock body scroll
  useEffect(() => {
    if (!lightboxUrl) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxUrl(null);
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [lightboxUrl]);

  const hasAttachments = attachments && attachments.length > 0;

  return (
    <div
      ref={containerRef}
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      tabIndex={0}
      className={`relative outline-none transition-all ${
        isDragging ? "ring-2 ring-amber-500 bg-amber-50/20" : ""
      } ${className}`}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main Content Area */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Thumbnails of existing attachments */}
        {hasAttachments &&
          attachments.map((att: any) => (
            <div
              key={att.id}
              onClick={() => setLightboxUrl(att.dataUrl)}
              className="group relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border border-stone-300 dark:border-stone-700 bg-stone-100 shadow-xs cursor-pointer hover:shadow-md hover:scale-105 transition-all shrink-0"
              title="クリックで拡大表示"
            >
              <img
                src={att.dataUrl}
                alt={att.fileName || "attachment"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <ZoomIn className="w-3.5 h-3.5 text-white" />
              </div>
              {/* 💡 意識に残す (Quick Action) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  saveVisualMutation.mutate({
                    dataUrl: att.dataUrl,
                    sourceType: targetType,
                    sourceId: targetId,
                    sourceTitle: getHumanReadableSourceTitle(targetType, targetId),
                  });
                }}
                disabled={saveVisualMutation.isPending}
                className="absolute top-0.5 left-0.5 p-1 bg-amber-500/90 hover:bg-amber-400 text-stone-950 rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-xs"
                title="💡 意識に残す (インフォビジュアルライブラリへ)"
              >
                <Lightbulb className="w-2.5 h-2.5 fill-stone-950" />
              </button>
              <button
                type="button"
                onClick={(e) => handleDelete(att.id, e)}
                className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                title="削除"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

        {/* Upload Button & Action */}
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded-md border border-stone-300/80 hover:border-amber-500 bg-stone-50/80 hover:bg-amber-50/60 text-stone-600 hover:text-amber-800 transition-all cursor-pointer shadow-2xs ${
            compact ? "h-7 text-[10px]" : "h-8"
          }`}
          title="クリックでファイル選択、または Ctrl+V でクリップボードの画像を貼り付け"
        >
          {isUploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
          ) : (
            <Camera className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span>{isUploading ? "圧縮・保存中..." : buttonLabel}</span>
        </button>

        {/* Ctrl+V Hint */}
        {showPasteHint && (
          <span className="text-[10px] text-stone-400 font-mono hidden sm:inline select-none">
            (Ctrl+Vで貼り付け可)
          </span>
        )}
      </div>

      {/* Lightbox Modal via Portal directly to body */}
      {lightboxUrl &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onClick={() => setLightboxUrl(null)}
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150 cursor-zoom-out select-none"
          >
            {/* Top Close Button for convenient one-tap dismissal */}
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
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
                src={lightboxUrl}
                alt="拡大プレビュー"
                className="max-w-[94vw] max-h-[78vh] object-contain rounded-xl shadow-2xl border border-stone-800 bg-stone-950/80"
              />
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    saveVisualMutation.mutate({
                      dataUrl: lightboxUrl,
                      sourceType: targetType,
                      sourceId: targetId,
                      sourceTitle: getHumanReadableSourceTitle(targetType, targetId),
                    });
                  }}
                  disabled={saveVisualMutation.isPending}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-lg border border-amber-300 flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Lightbulb className="w-3.5 h-3.5 fill-stone-950" />
                  <span>💡 意識に残す</span>
                </button>
                <a
                  href={lightboxUrl}
                  download={`attachment-${Date.now()}.webp`}
                  className="px-3.5 py-1.5 bg-stone-800/90 hover:bg-stone-700 text-stone-100 text-xs font-medium rounded-lg border border-stone-600/80 flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> 保存 / ダウンロード
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxUrl(null)}
                  className="px-3.5 py-1.5 bg-stone-800/90 hover:bg-red-700/90 text-stone-100 text-xs font-medium rounded-lg border border-stone-600/80 flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> 閉じる (Esc)
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
});

