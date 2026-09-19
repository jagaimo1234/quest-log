import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { trpc } from "../lib/trpc";
import { compressImage } from "../lib/imageCompression";
import { Camera, Image as ImageIcon, Trash2, X, ZoomIn, Loader2, Download, Plus } from "lucide-react";
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

  // Queries & Mutations
  const { data: attachments, refetch } = trpc.attachment.list.useQuery(
    { targetType, targetId },
    { enabled: Boolean(targetType && targetId) }
  );
  const uploadMutation = trpc.attachment.upload.useMutation();
  const deleteMutation = trpc.attachment.delete.useMutation();

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

  // Close lightbox on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxUrl(null);
    };
    if (lightboxUrl) {
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
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

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
          >
            <img
              src={lightboxUrl}
              alt="拡大プレビュー"
              className="max-w-full max-h-[82vh] object-contain rounded-lg shadow-2xl border border-stone-700 bg-stone-950"
            />
            <div className="mt-2.5 flex items-center gap-3">
              <a
                href={lightboxUrl}
                download={`attachment-${Date.now()}.webp`}
                className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-md border border-stone-600 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> 保存 / ダウンロード
              </a>
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                className="px-3 py-1 bg-stone-800 hover:bg-red-800 text-stone-200 text-xs rounded-md border border-stone-600 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> 閉じる (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

