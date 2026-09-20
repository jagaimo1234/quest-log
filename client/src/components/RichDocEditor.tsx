import React, { useState, useRef, useEffect, useCallback } from "react";
import { compressImage } from "../lib/imageCompression";
import { Camera, Trash2, ZoomIn, Download, X, Loader2, Highlighter, Palette, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export type DocBlock =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; src: string; caption?: string };

export const MARKER_PALETTE = [
  { id: "yellow", label: "イエロー", hex: "#fde047", border: "#eab308" },
  { id: "green", label: "グリーン", hex: "#86efac", border: "#22c55e" },
  { id: "pink", label: "ピンク", hex: "#f472b6", border: "#ec4899" },
  { id: "blue", label: "ブルー", hex: "#7dd3fc", border: "#0ea5e9" },
  { id: "orange", label: "オレンジ", hex: "#fb923c", border: "#f97316" },
];

export const TEXT_COLOR_PALETTE = [
  { id: "red", label: "赤", hex: "#ef4444" },
  { id: "blue", label: "青", hex: "#3b82f6" },
  { id: "green", label: "緑", hex: "#10b981" },
  { id: "purple", label: "紫", hex: "#a855f7" },
  { id: "orange", label: "橙", hex: "#f97316" },
  { id: "gray", label: "灰", hex: "#9ca3af" },
];

export function parseDocBlocks(raw: string): DocBlock[] {
  if (!raw) return [{ id: "b-0", type: "text", text: "" }];

  const regex = /!\[(.*?)\]\((data:image\/[^)]+|https?:\/\/[^)]+)\)/g;
  const blocks: DocBlock[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let counter = 0;

  while ((match = regex.exec(raw)) !== null) {
    const textBefore = raw.substring(lastIndex, match.index);
    const cleanedBefore = textBefore.replace(/\n+$/, "");
    if (cleanedBefore.trim() !== "" || blocks.length === 0) {
      blocks.push({
        id: `b-txt-${counter++}`,
        type: "text",
        text: cleanedBefore,
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

  const remaining = raw.substring(lastIndex).replace(/^\n+/, "");
  if (remaining.trim() !== "" || blocks.length === 0) {
    blocks.push({
      id: `b-txt-${counter++}`,
      type: "text",
      text: remaining,
    });
  }

  if (blocks.length === 0) {
    blocks.push({ id: "b-0", type: "text", text: "" });
  }

  // Coalesce any consecutive text blocks
  const coalesced: DocBlock[] = [];
  for (const b of blocks) {
    const prev = coalesced[coalesced.length - 1];
    if (prev && prev.type === "text" && b.type === "text") {
      const cleanPrev = prev.text.replace(/\n+$/, "");
      const cleanCurr = b.text.replace(/^\n+/, "");
      if (!cleanPrev) {
        prev.text = cleanCurr;
      } else if (!cleanCurr) {
        prev.text = cleanPrev;
      } else {
        prev.text = cleanPrev + "\n" + cleanCurr;
      }
    } else {
      coalesced.push({ ...b });
    }
  }

  return coalesced;
}

export function serializeDocBlocks(blocks: DocBlock[]): string {
  const coalesced: DocBlock[] = [];
  for (const b of blocks) {
    const prev = coalesced[coalesced.length - 1];
    if (prev && prev.type === "text" && b.type === "text") {
      const cleanPrev = prev.text.replace(/\n+$/, "");
      const cleanCurr = b.text.replace(/^\n+/, "");
      if (!cleanPrev) {
        prev.text = cleanCurr;
      } else if (!cleanCurr) {
        prev.text = cleanPrev;
      } else {
        prev.text = cleanPrev + "\n" + cleanCurr;
      }
    } else {
      coalesced.push({ ...b });
    }
  }

  return coalesced
    .map((b) => {
      if (b.type === "image") {
        return `![${b.caption || "image"}](${b.src})`;
      }
      return b.text;
    })
    .filter((content, idx, arr) => {
      if (content === "" && arr.length > 1) return false;
      return true;
    })
    .join("\n")
    .trim();
}

export function extractPlainText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/!\[.*?\]\((data:image\/[^)]+|https?:\/\/[^)]+)\)/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

interface RichDocEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  textAreaClassName?: string;
  minHeight?: number;
  onTextChange?: (pureText: string) => void;
  onKeystroke?: () => void;
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
  onKeystroke,
  showToolbar = true,
  theme = "default",
}: RichDocEditorProps) {
  const [blocks, setBlocks] = useState<DocBlock[]>(() => parseDocBlocks(value));
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isMarkerMenuOpen, setIsMarkerMenuOpen] = useState(false);
  const [isTextColorMenuOpen, setIsTextColorMenuOpen] = useState(false);

  // Notion-style floating toolbar
  const [floatingToolbar, setFloatingToolbar] = useState<{
    show: boolean;
    x: number;
    y: number;
  }>({ show: false, x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const activeBlockIndexRef = useRef<number>(0);
  const editableRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInternalUpdate = useRef(false);
  const isInteractingWithToolbarRef = useRef(false);
  const savedSelectionRangeRef = useRef<Range | null>(null);

  // Sync external value changes (e.g. date change or DB load)
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const parsed = parseDocBlocks(value);
    setBlocks(parsed);

    // Update innerHTML on mounted elements
    parsed.forEach((b, i) => {
      if (b.type === "text" && editableRefs.current[i]) {
        if (editableRefs.current[i]!.innerHTML !== b.text) {
          editableRefs.current[i]!.innerHTML = b.text;
        }
      }
    });
  }, [value]);

  // Initial sync on mount
  useEffect(() => {
    blocks.forEach((b, i) => {
      if (b.type === "text" && editableRefs.current[i]) {
        if (editableRefs.current[i]!.innerHTML !== b.text) {
          editableRefs.current[i]!.innerHTML = b.text;
        }
      }
    });
  }, []);

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

  // Selection detection for Notion-style floating toolbar
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        if (!isInteractingWithToolbarRef.current) {
          setFloatingToolbar((prev) => (prev.show ? { ...prev, show: false } : prev));
        }
        return;
      }

      const range = sel.getRangeAt(0);
      const container = containerRef.current;
      if (!container || !container.contains(range.commonAncestorContainer)) {
        if (!isInteractingWithToolbarRef.current) {
          setFloatingToolbar((prev) => (prev.show ? { ...prev, show: false } : prev));
        }
        return;
      }

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      // Save valid range for toolbar clicks
      savedSelectionRangeRef.current = range.cloneRange();

      // Find which block index contains the selection
      editableRefs.current.forEach((el, idx) => {
        if (el && el.contains(range.commonAncestorContainer)) {
          activeBlockIndexRef.current = idx;
        }
      });

      const editorRect = container.getBoundingClientRect();
      const x = rect.left + rect.width / 2 - editorRect.left;
      const y = rect.top - editorRect.top - 8;

      setFloatingToolbar({
        show: true,
        x: Math.max(140, Math.min(x, editorRect.width - 140)),
        y: Math.max(-10, y),
      });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  // Format application function (marker, text color, clear)
  const applyFormatting = (formatType: "marker" | "color" | "clear", colorId?: string) => {
    const selection = window.getSelection();
    let range: Range | null = null;

    if (selection && selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed) {
      range = selection.getRangeAt(0);
    } else if (savedSelectionRangeRef.current && !savedSelectionRangeRef.current.collapsed) {
      range = savedSelectionRangeRef.current;
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    if (!range || range.collapsed) {
      toast.info("色を適用したいテキストを選択してください");
      return;
    }

    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) {
      toast.info("エディタ内のテキストを選択してください");
      return;
    }

    if (formatType === "clear") {
      const fragment = range.extractContents();
      const unwrap = (node: Node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (
            el.tagName === "MARK" ||
            (el.tagName === "SPAN" && (el.className.includes("color-") || el.className.includes("marker-")))
          ) {
            const parent = el.parentNode;
            while (el.firstChild) {
              parent?.insertBefore(el.firstChild, el);
            }
            parent?.removeChild(el);
            return;
          }
        }
        const children = Array.from(node.childNodes);
        children.forEach(unwrap);
      };
      unwrap(fragment);
      range.insertNode(fragment);
      toast.success("装飾を解除しました");
    } else if (formatType === "marker") {
      const mark = document.createElement("mark");
      mark.className = `marker-${colorId}`;
      mark.appendChild(range.extractContents());
      range.insertNode(mark);
      // Keep selection on styled node
      selection?.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(mark);
      selection?.addRange(newRange);
      savedSelectionRangeRef.current = newRange;
    } else if (formatType === "color") {
      const span = document.createElement("span");
      span.className = `color-${colorId}`;
      span.appendChild(range.extractContents());
      range.insertNode(span);
      // Keep selection on styled node
      selection?.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection?.addRange(newRange);
      savedSelectionRangeRef.current = newRange;
    }

    // Commit change to active block
    const activeIdx = activeBlockIndexRef.current;
    const activeEl = editableRefs.current[activeIdx];
    if (activeEl) {
      const newHtml = activeEl.innerHTML;
      const newBlocks = blocks.map((b, i) => (i === activeIdx ? { ...b, text: newHtml } : b));
      commitBlocks(newBlocks);
    }

    setIsMarkerMenuOpen(false);
    setIsTextColorMenuOpen(false);
  };

  // Insert image at cursor
  const insertImageAtCursor = async (targetBlockIndex: number, fileOrBlob: File | Blob) => {
    setIsUploading(true);
    try {
      const dataUrl = await compressImage(fileOrBlob, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.75,
      });

      const currentEl = editableRefs.current[targetBlockIndex];
      const targetBlock = blocks[targetBlockIndex];

      let textBefore = "";
      let textAfter = "";

      const sel = window.getSelection();
      if (currentEl && sel && sel.rangeCount > 0 && currentEl.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);

        const preRange = range.cloneRange();
        preRange.selectNodeContents(currentEl);
        preRange.setEnd(range.startContainer, range.startOffset);
        const beforeDiv = document.createElement("div");
        beforeDiv.appendChild(preRange.cloneContents());
        textBefore = beforeDiv.innerHTML.replace(/\n+$/, "");

        const postRange = range.cloneRange();
        postRange.selectNodeContents(currentEl);
        postRange.setStart(range.endContainer, range.endOffset);
        const afterDiv = document.createElement("div");
        afterDiv.appendChild(postRange.cloneContents());
        textAfter = afterDiv.innerHTML.replace(/^\n+/, "");
      } else if (targetBlock && targetBlock.type === "text") {
        textBefore = currentEl?.innerHTML || targetBlock.text;
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

      setTimeout(() => {
        const nextIndex = updatedBlocks.indexOf(newNextTextBlock);
        if (nextIndex !== -1 && editableRefs.current[nextIndex]) {
          editableRefs.current[nextIndex]?.focus();
        }
      }, 50);
    } catch (err) {
      console.error("Failed to insert image:", err);
      toast.error("写真の差し込みに失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle image deletion
  const handleDeleteImage = (index: number) => {
    const updated = blocks.filter((_, i) => i !== index);
    if (updated.length === 0) {
      updated.push({ id: `txt-${Date.now()}`, type: "text", text: "" });
    }
    commitBlocks(updated);
    toast.success("写真を削除しました");
  };

  // Handle paste
  const handlePasteInBlock = (index: number, e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            insertImageAtCursor(index, file);
            return;
          }
        }
      }
    }

    // Plain text paste to prevent unwanted external layout
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    onKeystroke?.();
  };

  // Handle toolbar camera file select
  const handleToolbarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let targetIdx = activeBlockIndexRef.current;
    if (!blocks[targetIdx] || blocks[targetIdx].type !== "text") {
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].type === "text") {
          targetIdx = i;
          break;
        }
      }
    }

    insertImageAtCursor(targetIdx, file);
    e.target.value = "";
  };

  // Text input change
  const handleInput = (index: number, e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    const newBlocks = blocks.map((b, i) => (i === index ? { ...b, text: html } : b));
    commitBlocks(newBlocks);
    onKeystroke?.();
  };

  // Keyboard navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeystroke?.();

    if (e.key === "Backspace") {
      const el = editableRefs.current[index];
      const sel = window.getSelection();
      if (el && sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (range.collapsed && range.startOffset === 0 && range.startContainer === el) {
          if (index > 0) {
            e.preventDefault();
            const prevBlock = blocks[index - 1];
            const currentBlock = blocks[index];
            if (prevBlock.type === "image") {
              const newBlocks = blocks.filter((_, i) => i !== index - 1);
              commitBlocks(newBlocks);
              return;
            }
            if (prevBlock.type === "text" && currentBlock.type === "text") {
              const prevEl = editableRefs.current[index - 1];
              prevBlock.text = prevBlock.text + currentBlock.text;
              const newBlocks = blocks.filter((_, i) => i !== index);
              commitBlocks(newBlocks);
              setTimeout(() => {
                if (prevEl) {
                  prevEl.focus();
                }
              }, 50);
            }
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
    <div ref={containerRef} className={`relative flex flex-col ${className}`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleToolbarFileSelect}
      />

      {/* Notion-style Floating Palette on Selection */}
      {floatingToolbar.show && (
        <div
          style={{
            top: `${floatingToolbar.y}px`,
            left: `${floatingToolbar.x}px`,
            transform: "translate(-50%, -100%)",
          }}
          onMouseEnter={() => {
            isInteractingWithToolbarRef.current = true;
          }}
          onMouseLeave={() => {
            isInteractingWithToolbarRef.current = false;
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            isInteractingWithToolbarRef.current = true;
          }}
          className="absolute z-50 flex items-center gap-1.5 px-2 py-1 bg-stone-900/95 dark:bg-stone-950/95 text-white backdrop-blur-md rounded-xl shadow-2xl border border-stone-700/80 animate-in fade-in zoom-in-95 duration-150 select-none pointer-events-auto text-xs"
        >
          {/* Marker Colors */}
          <div className="flex items-center gap-1 pr-1.5 border-r border-stone-700/80">
            <span className="text-[10px] text-stone-400 font-bold mr-0.5">🖍️</span>
            {MARKER_PALETTE.map((m) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormatting("marker", m.id)}
                title={`マーカー: ${m.label}`}
                className="w-4 h-4 rounded-full hover:scale-130 transition-transform cursor-pointer shadow-xs"
                style={{ backgroundColor: m.hex, border: `1.5px solid ${m.border}` }}
              />
            ))}
          </div>

          {/* Text Colors */}
          <div className="flex items-center gap-1 pr-1.5 border-r border-stone-700/80">
            <span className="text-[10px] text-stone-400 font-bold mr-0.5">A</span>
            {TEXT_COLOR_PALETTE.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormatting("color", c.id)}
                title={`文字色: ${c.label}`}
                className="w-4 h-4 rounded-full hover:scale-130 transition-transform cursor-pointer shadow-xs border border-white/30"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>

          {/* Clear Style */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormatting("clear")}
            title="装飾を解除"
            className="p-1 text-stone-300 hover:text-white hover:bg-white/15 rounded-md transition cursor-pointer text-[10px] font-bold flex items-center gap-0.5"
          >
            <RotateCcw className="w-3 h-3" />
            <span>解除</span>
          </button>
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 space-y-1" style={{ minHeight: `${minHeight}px` }}>
        {blocks.map((block, index) => {
          if (block.type === "image") {
            return (
              <div
                key={block.id}
                className={`group relative my-1.5 max-w-lg rounded-xl overflow-hidden border ${themeStyles.cardBorder} shadow-md bg-stone-900/10 transition-all hover:shadow-lg`}
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

          // Rich ContentEditable Text Block
          return (
            <div
              key={block.id}
              ref={(el) => {
                editableRefs.current[index] = el;
              }}
              contentEditable
              suppressContentEditableWarning
              data-placeholder={index === 0 ? placeholder : ""}
              onFocus={() => {
                activeBlockIndexRef.current = index;
              }}
              onInput={(e) => handleInput(index, e)}
              onPaste={(e) => handlePasteInBlock(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-full bg-transparent outline-none p-0 m-0 block whitespace-pre-wrap break-words min-h-[1.5em] ${textAreaClassName}`}
            />
          );
        })}
      </div>

      {/* Permanent Bottom Toolbar (案B) */}
      {showToolbar && (
        <div className={`pt-2 mt-1 border-t ${themeStyles.border} flex flex-wrap items-center justify-between gap-2 text-xs`}>
          <div className="flex items-center gap-1.5">
            {/* Camera Photo Insert Button */}
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
              <span>{isUploading ? "圧縮中..." : "📷 写真"}</span>
            </button>

            {/* Marker Palette Toggle Button */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setIsMarkerMenuOpen(!isMarkerMenuOpen);
                  setIsTextColorMenuOpen(false);
                }}
                className={`flex items-center gap-1 px-2 py-1 ${isMarkerMenuOpen ? "bg-amber-200/90 text-amber-950 font-bold" : themeStyles.btn} text-[11px] font-semibold rounded-md transition-all cursor-pointer shadow-2xs`}
                title="マーカー（蛍光ペン）パレットを開く"
              >
                <Highlighter className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>🖍️ マーカー</span>
              </button>

              {/* Marker Popover */}
              {isMarkerMenuOpen && (
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute bottom-full mb-1.5 left-0 z-40 flex items-center gap-1.5 p-1.5 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 animate-in fade-in zoom-in-95 duration-150"
                >
                  {MARKER_PALETTE.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormatting("marker", m.id)}
                      title={`マーカー: ${m.label}`}
                      className="w-5 h-5 rounded-full hover:scale-120 transition-transform cursor-pointer shadow-xs"
                      style={{ backgroundColor: m.hex, border: `1.5px solid ${m.border}` }}
                    />
                  ))}
                  <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-0.5" />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyFormatting("clear")}
                    title="マーカーを解除"
                    className="px-1.5 py-0.5 text-[10px] text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded font-bold cursor-pointer"
                  >
                    解除
                  </button>
                </div>
              )}
            </div>

            {/* Text Color Palette Toggle Button */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setIsTextColorMenuOpen(!isTextColorMenuOpen);
                  setIsMarkerMenuOpen(false);
                }}
                className={`flex items-center gap-1 px-2 py-1 ${isTextColorMenuOpen ? "bg-rose-200/90 text-rose-950 font-bold" : themeStyles.btn} text-[11px] font-semibold rounded-md transition-all cursor-pointer shadow-2xs`}
                title="文字色パレットを開く"
              >
                <Palette className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>🎨 文字色</span>
              </button>

              {/* Text Color Popover */}
              {isTextColorMenuOpen && (
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute bottom-full mb-1.5 left-0 z-40 flex items-center gap-1.5 p-1.5 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 animate-in fade-in zoom-in-95 duration-150"
                >
                  {TEXT_COLOR_PALETTE.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormatting("color", c.id)}
                      title={`文字色: ${c.label}`}
                      className="w-5 h-5 rounded-full hover:scale-120 transition-transform cursor-pointer shadow-xs border border-white/40"
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                  <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-0.5" />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyFormatting("clear")}
                    title="文字色を解除"
                    className="px-1.5 py-0.5 text-[10px] text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded font-bold cursor-pointer"
                  >
                    解除
                  </button>
                </div>
              )}
            </div>
          </div>

          <span className={`text-[10px] ${themeStyles.hint} font-mono hidden sm:inline select-none`}>
            💡 文字を選択するとNotion風パレットが出現
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
