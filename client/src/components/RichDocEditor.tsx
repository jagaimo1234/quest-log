import React, { useState, useRef, useEffect, useCallback } from "react";
import { compressImage } from "../lib/imageCompression";
import { Camera, Trash2, ZoomIn, Download, X, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export type DocBlock =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; src: string; caption?: string };

export function parseDocBlocks(raw: string): DocBlock[] {
  if (!raw) return [{ id: "b-0", type: "text", text: "" }];

  const regex = /!\[(.*?)\]\((data:image\/[^)]+|https?:\/\/[^)]+)\)/g;
  const blocks: DocBlock[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let counter = 0;

  while ((match = regex.exec(raw)) !== null) {
    const textBefore = raw.substring(lastIndex, match.index);
    if (textBefore.trim() !== "" || blocks.length === 0) {
      blocks.push({
        id: `b-txt-${counter++}`,
        type: "text",
        text: textBefore.replace(/^\n+/, "").replace(/\n+$/, ""),
      });
    }

    blocks.push({
      id: `b-img-${counter++}`,
      type: "image",
      caption: match[1] || "",
      src: match[2],
    });

    lastIndex = regex.lastIndex;
  }

  const remaining = raw.substring(lastIndex);
  if (remaining.trim() !== "" || blocks.length === 0) {
    blocks.push({
      id: `b-txt-${counter++}`,
      type: "text",
      text: remaining.replace(/^\n+/, "").replace(/\n+$/, ""),
    });
  }

  if (blocks.length === 0) {
    blocks.push({ id: "b-0", type: "text", text: "" });
  }

  return blocks;
}

export function serializeDocBlocks(blocks: DocBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === "image") {
        return `\n\n![${b.caption || "image"}](${b.src})\n\n`;
      }
      return b.text;
    })
    .join("\n")
    .trim();
}

export function extractPlainText(raw: string): string {
  if (!raw) return "";
  return raw.replace(/!\[.*?\]\((.*?)\)/g, "").trim();
}

interface RichDocEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  textAreaClassName?: string;
  minHeight?: number;
  onTextChange?: (pureText: string) => void;
  showToolbar?: boolean;
  theme?: "amber" | "emerald" | "teal" | "stone" | "default";
}

export function RichDocEditor({
  value,
  onChange,
  placeholder = "ここに文章を入力...",
  className = "",
  textAreaClassName = "text-sm leading-6",
  minHeight = 120,
  onTextChange,
  showToolbar = true,
  theme = "default",
}: RichDocEditorProps) {
  const [blocks, setBlocks] = useState<DocBlock[]>(() => parseDocBlocks(value));
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const activeTextareaIndexRef = useRef<number>(0);
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInternalUpdate = useRef(false);

  // Sync external value changes (e.g. date change or DB load)
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const parsed = parseDocBlocks(value);
    setBlocks(parsed);
  }, [value]);

  // Trigger change to parent
  const commitBlocks = useCallback(
    (newBlocks: DocBlock[]) => {
      isInternalUpdate.current = true;
      setBlocks(newBlocks);
      const serialized = serializeDocBlocks(newBlocks);
      onChange(serialized);
      if (onTextChange) {
        onTextChange(extractPlainText(serialized));
      }
    },
    [onChange, onTextChange]
  );

  // Auto-resize all textareas
  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    textareaRefs.current.forEach((el) => autoResize(el));
  }, [blocks]);

  // Insert image at specific text block cursor position
  const insertImageAtCursor = async (
    targetBlockIndex: number,
    fileOrBlob: File | Blob
  ) => {
    setIsUploading(true);
    try {
      const dataUrl = await compressImage(fileOrBlob, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.75,
      });

      const currentEl = textareaRefs.current[targetBlockIndex];
      const targetBlock = blocks[targetBlockIndex];

      let textBefore = "";
      let textAfter = "";

      if (targetBlock && targetBlock.type === "text" && currentEl) {
        const cursorStart = currentEl.selectionStart || 0;
        const cursorEnd = currentEl.selectionEnd || 0;
        textBefore = targetBlock.text.slice(0, cursorStart);
        textAfter = targetBlock.text.slice(cursorEnd);
      } else if (targetBlock && targetBlock.type === "text") {
        textBefore = targetBlock.text;
        textAfter = "";
      }

      const newImageBlock: DocBlock = {
        id: `img-${Date.now()}`,
        type: "image",
        src: dataUrl,
      };

      const newNextTextBlock: DocBlock = {
        id: `txt-${Date.now()}`,
        type: "text",
        text: textAfter,
      };

      const updatedBlocks: DocBlock[] = [];
      for (let i = 0; i < blocks.length; i++) {
        if (i === targetBlockIndex) {
          if (textBefore.trim() !== "" || i === 0) {
            updatedBlocks.push({ ...blocks[i], text: textBefore } as DocBlock);
          }
          updatedBlocks.push(newImageBlock);
          updatedBlocks.push(newNextTextBlock);
        } else {
          updatedBlocks.push(blocks[i]);
        }
      }

      commitBlocks(updatedBlocks);
      toast.success("文章中に写真を差し込みました（軽量化済み）");

      // Focus the new text block after image
      setTimeout(() => {
        const nextIndex = updatedBlocks.indexOf(newNextTextBlock);
        if (nextIndex !== -1 && textareaRefs.current[nextIndex]) {
          textareaRefs.current[nextIndex]?.focus();
        }
      }, 50);
    } catch (err) {
      console.error("Failed to insert image:", err);
      toast.error("写真の差し込みに失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle paste in any text block
  const handlePasteInBlock = (
    index: number,
    e: React.ClipboardEvent<HTMLTextAreaElement>
  ) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          e.stopPropagation();
          insertImageAtCursor(index, blob);
          return;
        }
      }
    }
  };

  // Handle text change
  const handleTextChange = (index: number, newText: string) => {
    const newBlocks = blocks.map((b, i) =>
      i === index && b.type === "text" ? { ...b, text: newText } : b
    );
    commitBlocks(newBlocks);
  };

  // Handle file select from toolbar
  const handleToolbarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Insert at last active textarea index, or at the end
    const targetIndex =
      activeTextareaIndexRef.current >= 0 &&
      activeTextareaIndexRef.current < blocks.length
        ? activeTextareaIndexRef.current
        : blocks.length - 1;

    insertImageAtCursor(targetIndex, file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Delete an image block
  const handleDeleteImage = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    if (newBlocks.length === 0) {
      newBlocks.push({ id: `txt-${Date.now()}`, type: "text", text: "" });
    }
    commitBlocks(newBlocks);
    toast.success("写真を削除しました");
  };

  // Handle Backspace at start of block
  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    const el = textareaRefs.current[index];
    if (e.key === "Backspace" && el && el.selectionStart === 0 && el.selectionEnd === 0) {
      if (index > 0) {
        const prevBlock = blocks[index - 1];
        const currentBlock = blocks[index];

        if (prevBlock.type === "image") {
          e.preventDefault();
          handleDeleteImage(index - 1);
        } else if (prevBlock.type === "text" && currentBlock.type === "text") {
          if (currentBlock.text === "") {
            e.preventDefault();
            const newBlocks = blocks.filter((_, i) => i !== index);
            commitBlocks(newBlocks);
            setTimeout(() => {
              textareaRefs.current[index - 1]?.focus();
            }, 50);
          }
        }
      }
    }
  };

  const themeStyles = {
    amber: {
      cardBorder: "border-amber-900/30",
      border: "border-amber-900/15",
      btn: "bg-amber-100/70 hover:bg-amber-200/80 border-amber-800/30 text-amber-900",
      icon: "text-amber-700",
      hint: "text-amber-900/60",
    },
    emerald: {
      cardBorder: "border-emerald-600/30",
      border: "border-emerald-200",
      btn: "bg-emerald-100/70 hover:bg-emerald-200/80 border-emerald-300 text-emerald-900",
      icon: "text-emerald-700",
      hint: "text-emerald-800/60",
    },
    teal: {
      cardBorder: "border-teal-600/30",
      border: "border-teal-200",
      btn: "bg-teal-100/70 hover:bg-teal-200/80 border-teal-300 text-teal-900",
      icon: "text-teal-700",
      hint: "text-teal-800/60",
    },
    stone: {
      cardBorder: "border-stone-400/30",
      border: "border-stone-200",
      btn: "bg-stone-100 hover:bg-stone-200/80 border-stone-300 text-stone-700",
      icon: "text-stone-600",
      hint: "text-stone-500/70",
    },
    default: {
      cardBorder: "border-stone-400/30",
      border: "border-stone-200",
      btn: "bg-stone-100 hover:bg-stone-200/80 border-stone-300 text-stone-700",
      icon: "text-stone-600",
      hint: "text-stone-500/70",
    },
  }[theme];

  return (
    <div className={`relative flex flex-col ${className}`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleToolbarFileSelect}
      />

      {/* Editor Body */}
      <div className="flex-1 space-y-1.5" style={{ minHeight: `${minHeight}px` }}>
        {blocks.map((block, index) => {
          if (block.type === "image") {
            return (
              <div
                key={block.id}
                className={`group relative my-2.5 max-w-lg rounded-xl overflow-hidden border ${themeStyles.cardBorder} shadow-md bg-stone-900/10 transition-all hover:shadow-lg`}
              >
                <img
                  src={block.src}
                  alt={block.caption || "添付写真"}
                  className="w-full max-h-[360px] object-contain bg-black/5 cursor-pointer"
                  onClick={() => setLightboxUrl(block.src)}
                  loading="lazy"
                />

                {/* Floating controls on hover */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-xs p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(block.src)}
                    className="p-1 text-stone-200 hover:text-white rounded hover:bg-white/20 transition cursor-pointer"
                    title="拡大表示"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(index)}
                    className="p-1 text-stone-200 hover:text-red-400 rounded hover:bg-white/20 transition cursor-pointer"
                    title="写真を削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          }

          // Text block
          return (
            <textarea
              key={block.id}
              ref={(el) => {
                textareaRefs.current[index] = el;
              }}
              value={block.text}
              placeholder={index === 0 ? placeholder : ""}
              onFocus={() => {
                activeTextareaIndexRef.current = index;
              }}
              onChange={(e) => {
                handleTextChange(index, e.target.value);
                autoResize(e.target);
              }}
              onPaste={(e) => handlePasteInBlock(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              rows={index === 0 && blocks.length === 1 ? 4 : 1}
              className={`w-full bg-transparent outline-none resize-none placeholder:text-stone-400/70 ${textAreaClassName}`}
            />
          );
        })}
      </div>

      {/* Toolbar / Inline photo button */}
      {showToolbar && (
        <div className={`pt-2 mt-1 border-t ${themeStyles.border} flex items-center justify-between text-xs`}>
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-2 py-1 ${themeStyles.btn} text-[11px] font-semibold rounded-md transition-all cursor-pointer shadow-2xs`}
            title="カーソル位置に写真を差し込みます"
          >
            {isUploading ? (
              <Loader2 className={`w-3.5 h-3.5 animate-spin ${themeStyles.icon}`} />
            ) : (
              <Camera className={`w-3.5 h-3.5 ${themeStyles.icon}`} />
            )}
            <span>{isUploading ? "圧縮中..." : "📷 文章中に写真を差し込む"}</span>
          </button>

          <span className={`text-[10px] ${themeStyles.hint} font-mono hidden sm:inline select-none`}>
            💡 Ctrl+V でカーソル位置に直接貼り付け可能
          </span>
        </div>
      )}

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
              alt="拡大写真"
              className="max-w-full max-h-[82vh] object-contain rounded-lg shadow-2xl border border-stone-700 bg-stone-950"
            />
            <div className="mt-2.5 flex items-center gap-3">
              <a
                href={lightboxUrl}
                download={`photo-${Date.now()}.webp`}
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
}
