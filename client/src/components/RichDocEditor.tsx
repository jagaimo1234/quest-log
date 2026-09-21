import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { compressImage } from "../lib/imageCompression";
import { Camera, Trash2, ZoomIn, Download, X, Loader2, Highlighter, Palette, RotateCcw, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { applyFormatToRange } from "../lib/richTextFormatting";

export type DocBlock =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; src: string; caption?: string };

export interface ColorRule {
  id: string;
  label: string;
  ruleTitle: string;
  ruleDesc: string;
  hex: string;
  border?: string;
}

export const MARKER_PALETTE: ColorRule[] = [
  { id: "yellow", label: "イエロー", ruleTitle: "重要・キーポイント", ruleDesc: "最優先の確認事項・要点・重要キーワード", hex: "#fde047", border: "#eab308" },
  { id: "orange", label: "オレンジ", ruleTitle: "アクション・TODO", ruleDesc: "次にやること・宿題・次回までの課題", hex: "#fb923c", border: "#f97316" },
  { id: "pink", label: "ピンク", ruleTitle: "注意・要警戒", ruleDesc: "ボトルネック・懸念点・失敗談・リスク", hex: "#f472b6", border: "#ec4899" },
  { id: "green", label: "グリーン", ruleTitle: "ポジティブ・収穫", ruleDesc: "達成したこと・好調・閃き・新しい学び", hex: "#86efac", border: "#22c55e" },
  { id: "blue", label: "ブルー", ruleTitle: "事実・データ・参照", ruleDesc: "日時・場所・数値実績・参考URL・引用", hex: "#7dd3fc", border: "#0ea5e9" },
];

export const TEXT_COLOR_PALETTE: ColorRule[] = [
  { id: "red", label: "赤", ruleTitle: "警告・最重要", ruleDesc: "締め切り厳守・緊急アラート・忘れてはならないこと", hex: "#ef4444" },
  { id: "orange", label: "橙", ruleTitle: "アクション・着目", ruleDesc: "これから着手すること・重要な補足事項", hex: "#f97316" },
  { id: "green", label: "緑", ruleTitle: "進捗・良好", ruleDesc: "クリアした課題・習慣の継続・コンディション良好", hex: "#10b981" },
  { id: "blue", label: "青", ruleTitle: "客観・連絡", ruleDesc: "冷静な記録・事務連絡・定型メモ", hex: "#3b82f6" },
  { id: "purple", label: "紫", ruleTitle: "大目標・指針", ruleDesc: "クエストの根本目的・長期ビジョン・ボス討伐目標", hex: "#a855f7" },
  { id: "gray", label: "灰", ruleTitle: "注釈・優先度低", ruleDesc: "補足コメント・頭の片隅に置くメモ・完了済", hex: "#9ca3af" },
];

export function findRuleForElement(el: HTMLElement | null): {
  markerRule?: ColorRule;
  colorRule?: ColorRule;
  element: HTMLElement;
} | null {
  let curr: HTMLElement | null = el;
  let markerRule: ColorRule | undefined;
  let colorRule: ColorRule | undefined;
  let primaryEl: HTMLElement | null = null;

  while (curr && curr.nodeType === Node.ELEMENT_NODE) {
    const tagName = curr.tagName.toUpperCase();
    const className = curr.className || "";

    if (!markerRule && (tagName === "MARK" || className.includes("marker-"))) {
      const match = className.match(/marker-([a-z0-9]+)/);
      const colorId = match ? match[1] : "yellow";
      markerRule = MARKER_PALETTE.find((m) => m.id === colorId) || MARKER_PALETTE[0];
      if (!primaryEl) primaryEl = curr;
    }

    if (!colorRule && className.includes("color-")) {
      const match = className.match(/color-([a-z0-9]+)/);
      const colorId = match ? match[1] : "red";
      colorRule = TEXT_COLOR_PALETTE.find((c) => c.id === colorId) || TEXT_COLOR_PALETTE[0];
      if (!primaryEl) primaryEl = curr;
    }

    if (curr.getAttribute("contenteditable") === "true") break;
    curr = curr.parentElement;
  }

  if (markerRule || colorRule) {
    return { markerRule, colorRule, element: primaryEl || el! };
  }
  return null;
}

export function parseDocBlocks(raw: string): DocBlock[] {
  if (!raw) return [{ id: "b-txt-0", type: "text", text: "" }];

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
    blocks.push({ id: "b-txt-0", type: "text", text: "" });
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

function normalizeHtml(str: string): string {
  return (str || "")
    .replace(/&nbsp;/g, " ")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface ContentEditableBlockProps {
  html: string;
  onChange: (html: string) => void;
  onFocus?: () => void;
  onPaste?: (e: React.ClipboardEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onKeystroke?: () => void;
  placeholder?: string;
  className?: string;
  innerRef?: (el: HTMLDivElement | null) => void;
}

/**
 * Bulletproof ContentEditable component that avoids React's DOM reconciliation
 * wipes and caret reset issues by skipping re-renders when DOM already matches.
 */
class ContentEditableBlock extends React.Component<ContentEditableBlockProps> {
  private el: HTMLDivElement | null = null;

  shouldComponentUpdate(nextProps: ContentEditableBlockProps): boolean {
    const el = this.el;
    if (el) {
      // 1. Exact match between next HTML and current DOM content
      if (nextProps.html === el.innerHTML) {
        return (
          nextProps.className !== this.props.className ||
          nextProps.placeholder !== this.props.placeholder
        );
      }
      // 2. Normalized match (whitespace / br differences during typing)
      if (normalizeHtml(nextProps.html) === normalizeHtml(el.innerHTML)) {
        return (
          nextProps.className !== this.props.className ||
          nextProps.placeholder !== this.props.placeholder
        );
      }
    }
    // Content differs externally (date switch, DB load, style reset) -> must re-render
    return true;
  }

  componentDidUpdate() {
    const el = this.el;
    if (!el) return;
    if (
      this.props.html !== el.innerHTML &&
      normalizeHtml(this.props.html) !== normalizeHtml(el.innerHTML)
    ) {
      el.innerHTML = this.props.html;
    }
  }

  render() {
    const {
      html,
      innerRef,
      onChange,
      onFocus,
      onPaste,
      onKeyDown,
      onKeystroke,
      placeholder,
      className,
    } = this.props;

    return (
      <div
        ref={(el) => {
          this.el = el;
          if (innerRef) innerRef(el);
        }}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: html }}
        data-placeholder={placeholder}
        onFocus={onFocus}
        onInput={(e) => {
          onChange(e.currentTarget.innerHTML);
          onKeystroke?.();
        }}
        onPaste={onPaste}
        onKeyDown={onKeyDown}
        className={className}
      />
    );
  }
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

  // Hover & Tap Rule Overlay Bubble ("ぼやっと表示される注釈バブル")
  const [hoverHint, setHoverHint] = useState<{
    visible: boolean;
    markerRule?: ColorRule;
    colorRule?: ColorRule;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });
  const mobileTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Active palette preview for floating & bottom toolbar
  const [activePalettePreview, setActivePalettePreview] = useState<{
    id?: string;
    label: string;
    ruleTitle: string;
    ruleDesc: string;
    hex: string;
    border?: string;
  } | null>(null);

  // Legend popover state
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeBlockIndexRef = useRef<number>(0);
  const editableRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInternalUpdate = useRef(false);
  const isInteractingWithToolbarRef = useRef(false);
  const savedSelectionRangeRef = useRef<Range | null>(null);

  // Target inspector for hover/tap rule bubble
  const updateHoverHintFromTarget = useCallback((target: EventTarget | null, isTap = false) => {
    if (!containerRef.current || !(target instanceof HTMLElement)) {
      if (!isTap) setHoverHint((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const match = findRuleForElement(target);
    if (!match) {
      if (!isTap) setHoverHint((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const editorRect = containerRef.current.getBoundingClientRect();
    const elemRect = match.element.getBoundingClientRect();

    const centerX = elemRect.left + elemRect.width / 2 - editorRect.left;
    const clampedX = Math.max(90, Math.min(centerX, editorRect.width - 90));
    const targetY = elemRect.top - editorRect.top - 6;

    setHoverHint({
      visible: true,
      markerRule: match.markerRule,
      colorRule: match.colorRule,
      x: clampedX,
      y: Math.max(10, targetY),
    });

    if (isTap) {
      if (mobileTapTimeoutRef.current) clearTimeout(mobileTapTimeoutRef.current);
      mobileTapTimeoutRef.current = setTimeout(() => {
        setHoverHint((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }, 2500);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (mobileTapTimeoutRef.current) clearTimeout(mobileTapTimeoutRef.current);
    };
  }, []);

  // Sync external value changes (e.g. date change or DB load)
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const parsed = parseDocBlocks(value);
    setBlocks(parsed);
  }, [value]);

  // Lightbox keyboard (Esc) & body scroll lock
  useEffect(() => {
    if (!lightboxUrl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxUrl(null);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [lightboxUrl]);

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

    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    } else if (savedSelectionRangeRef.current) {
      range = savedSelectionRangeRef.current;
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    const container = containerRef.current;
    if (!range || !container || !container.contains(range.commonAncestorContainer)) {
      toast.info(formatType === "clear" ? "解除したいテキストを選択するかカーソルを合わせてください" : "色を適用したいテキストを選択してください");
      return;
    }

    // Find active block
    let activeIdx = activeBlockIndexRef.current;
    editableRefs.current.forEach((el, idx) => {
      if (el && el.contains(range!.commonAncestorContainer)) {
        activeIdx = idx;
      }
    });

    const activeEl = editableRefs.current[activeIdx];
    if (!activeEl) {
      toast.info("エディタ内のテキストを選択してください");
      return;
    }

    const newRange = applyFormatToRange(range, activeEl, formatType, colorId);

    if (!newRange) {
      if (formatType === "clear") {
        toast.info("解除対象の装飾が見つかりませんでした");
      } else {
        toast.info("色を適用したいテキストを選択してください");
      }
      return;
    }

    // Restore selection
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(newRange);
      savedSelectionRangeRef.current = newRange;
    }

    if (formatType === "clear") {
      toast.success("装飾（マーカー・文字色）を完全に解除しました");
    } else if (formatType === "marker") {
      toast.success("マーカーを適用しました");
    } else if (formatType === "color") {
      toast.success("文字色を適用しました");
    }

    // Commit change to active block
    const newHtml = activeEl.innerHTML;
    const newBlocks = blocks.map((b, i) => (i === activeIdx ? { ...b, text: newHtml } : b));
    commitBlocks(newBlocks);

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
  const handleInput = (index: number, html: string) => {
    const newBlocks = blocks.map((b, i) => (i === index ? { ...b, text: html } : b));
    commitBlocks(newBlocks);
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
    <div
      ref={containerRef}
      className={`relative flex flex-col ${className}`}
      onPointerMove={(e) => {
        if (e.pointerType === "mouse") {
          updateHoverHintFromTarget(e.target, false);
        }
      }}
      onPointerLeave={() => {
        if (mobileTapTimeoutRef.current) clearTimeout(mobileTapTimeoutRef.current);
        setHoverHint((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") {
          updateHoverHintFromTarget(e.target, true);
        }
      }}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleToolbarFileSelect}
      />

      {/* "ぼやっと浮かぶ注釈バブル" (Soft Floating Annotation Bubble on Hover/Tap) */}
      {hoverHint.visible && !floatingToolbar.show && (
        <div
          style={{
            top: `${hoverHint.y}px`,
            left: `${hoverHint.x}px`,
            transform: "translate(-50%, -100%)",
          }}
          className="pointer-events-none absolute z-40 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-stone-950/85 text-stone-100 backdrop-blur-md border border-amber-500/40 shadow-xl transition-all duration-150 animate-in fade-in zoom-in-95 text-xs select-none max-w-xs"
        >
          {hoverHint.markerRule && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs"
                style={{
                  backgroundColor: hoverHint.markerRule.hex,
                  border: hoverHint.markerRule.border ? `1px solid ${hoverHint.markerRule.border}` : undefined,
                }}
              />
              <div className="flex flex-col leading-tight">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-amber-300 text-[11px]">{hoverHint.markerRule.ruleTitle}</span>
                  <span className="text-[9.5px] text-stone-400">({hoverHint.markerRule.label})</span>
                </div>
                <span className="text-[9px] text-stone-300/90 whitespace-nowrap">{hoverHint.markerRule.ruleDesc}</span>
              </div>
            </div>
          )}

          {hoverHint.markerRule && hoverHint.colorRule && (
            <div className="w-px h-5 bg-stone-700/80 mx-0.5" />
          )}

          {hoverHint.colorRule && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs border border-white/30"
                style={{ backgroundColor: hoverHint.colorRule.hex }}
              />
              <div className="flex flex-col leading-tight">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-amber-300 text-[11px]">{hoverHint.colorRule.ruleTitle}</span>
                  <span className="text-[9.5px] text-stone-400">({hoverHint.colorRule.label})</span>
                </div>
                <span className="text-[9px] text-stone-300/90 whitespace-nowrap">{hoverHint.colorRule.ruleDesc}</span>
              </div>
            </div>
          )}
        </div>
      )}

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
            setActivePalettePreview(null);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            isInteractingWithToolbarRef.current = true;
          }}
          className="absolute z-50 flex flex-col gap-1 px-2 py-1.5 bg-stone-900/95 dark:bg-stone-950/95 text-white backdrop-blur-md rounded-xl shadow-2xl border border-stone-700/80 animate-in fade-in zoom-in-95 duration-150 select-none pointer-events-auto text-xs"
        >
          <div className="flex items-center gap-1.5">
            {/* Marker Colors */}
            <div className="flex items-center gap-1 pr-1.5 border-r border-stone-700/80">
              <span className="text-[10px] text-stone-400 font-bold mr-0.5">🖍️</span>
              {MARKER_PALETTE.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onMouseEnter={() => setActivePalettePreview(m)}
                  onMouseLeave={() => setActivePalettePreview(null)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormatting("marker", m.id)}
                  title={`マーカー: ${m.label}【${m.ruleTitle}】${m.ruleDesc}`}
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
                  onMouseEnter={() => setActivePalettePreview(c)}
                  onMouseLeave={() => setActivePalettePreview(null)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormatting("color", c.id)}
                  title={`文字色: ${c.label}【${c.ruleTitle}】${c.ruleDesc}`}
                  className="w-4 h-4 rounded-full hover:scale-130 transition-transform cursor-pointer shadow-xs border border-white/30"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>

            {/* Clear Style */}
            <button
              type="button"
              onMouseEnter={() =>
                setActivePalettePreview({
                  id: "clear",
                  label: "解除",
                  ruleTitle: "装飾解除",
                  ruleDesc: "選択箇所のマーカー・文字色をクリア",
                  hex: "#ffffff",
                })
              }
              onMouseLeave={() => setActivePalettePreview(null)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormatting("clear")}
              title="装飾を解除"
              className="p-1 text-stone-300 hover:text-white hover:bg-white/15 rounded-md transition cursor-pointer text-[10px] font-bold flex items-center gap-0.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>解除</span>
            </button>
          </div>

          {/* Live rule preview bar in floating palette */}
          {activePalettePreview && (
            <div className="pt-1 border-t border-stone-800 flex items-center gap-1.5 text-[10px] text-stone-300 animate-in fade-in duration-100 max-w-[280px]">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: activePalettePreview.hex,
                  border: activePalettePreview.border ? `1px solid ${activePalettePreview.border}` : undefined,
                }}
              />
              <span className="font-bold text-amber-300 shrink-0">{activePalettePreview.ruleTitle}</span>
              <span className="text-[9px] text-stone-400 truncate">{activePalettePreview.ruleDesc}</span>
            </div>
          )}
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
            <ContentEditableBlock
              key={block.id}
              innerRef={(el) => {
                editableRefs.current[index] = el;
              }}
              html={block.text}
              placeholder={index === 0 ? placeholder : ""}
              onFocus={() => {
                activeBlockIndexRef.current = index;
              }}
              onChange={(html) => handleInput(index, html)}
              onKeystroke={onKeystroke}
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
                  className="absolute bottom-full mb-1.5 left-0 z-40 flex flex-col p-2 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 animate-in fade-in zoom-in-95 duration-150 min-w-[190px]"
                >
                  <div className="flex items-center gap-1.5">
                    {MARKER_PALETTE.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onMouseEnter={() => setActivePalettePreview(m)}
                        onMouseLeave={() => setActivePalettePreview(null)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyFormatting("marker", m.id)}
                        title={`マーカー: ${m.label}【${m.ruleTitle}】${m.ruleDesc}`}
                        className="w-5 h-5 rounded-full hover:scale-120 transition-transform cursor-pointer shadow-xs"
                        style={{ backgroundColor: m.hex, border: `1.5px solid ${m.border}` }}
                      />
                    ))}
                    <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-0.5" />
                    <button
                      type="button"
                      onMouseEnter={() =>
                        setActivePalettePreview({
                          id: "clear",
                          label: "解除",
                          ruleTitle: "装飾解除",
                          ruleDesc: "マーカーを解除",
                          hex: "#ffffff",
                        })
                      }
                      onMouseLeave={() => setActivePalettePreview(null)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormatting("clear")}
                      title="マーカーを解除"
                      className="px-1.5 py-0.5 text-[10px] text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded font-bold cursor-pointer"
                    >
                      解除
                    </button>
                  </div>

                  {activePalettePreview && (
                    <div className="mt-1.5 pt-1 border-t border-stone-100 dark:border-stone-800 flex items-center gap-1.5 text-[10px] text-stone-700 dark:text-stone-300 animate-in fade-in duration-100">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: activePalettePreview.hex,
                          border: activePalettePreview.border ? `1px solid ${activePalettePreview.border}` : undefined,
                        }}
                      />
                      <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0">{activePalettePreview.ruleTitle}</span>
                      <span className="text-[9px] text-stone-500 dark:text-stone-400 truncate">{activePalettePreview.ruleDesc}</span>
                    </div>
                  )}
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
                  className="absolute bottom-full mb-1.5 left-0 z-40 flex flex-col p-2 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 animate-in fade-in zoom-in-95 duration-150 min-w-[210px]"
                >
                  <div className="flex items-center gap-1.5">
                    {TEXT_COLOR_PALETTE.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseEnter={() => setActivePalettePreview(c)}
                        onMouseLeave={() => setActivePalettePreview(null)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyFormatting("color", c.id)}
                        title={`文字色: ${c.label}【${c.ruleTitle}】${c.ruleDesc}`}
                        className="w-5 h-5 rounded-full hover:scale-120 transition-transform cursor-pointer shadow-xs border border-white/40"
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                    <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-0.5" />
                    <button
                      type="button"
                      onMouseEnter={() =>
                        setActivePalettePreview({
                          id: "clear",
                          label: "解除",
                          ruleTitle: "装飾解除",
                          ruleDesc: "文字色を解除",
                          hex: "#ffffff",
                        })
                      }
                      onMouseLeave={() => setActivePalettePreview(null)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormatting("clear")}
                      title="文字色を解除"
                      className="px-1.5 py-0.5 text-[10px] text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded font-bold cursor-pointer"
                    >
                      解除
                    </button>
                  </div>

                  {activePalettePreview && (
                    <div className="mt-1.5 pt-1 border-t border-stone-100 dark:border-stone-800 flex items-center gap-1.5 text-[10px] text-stone-700 dark:text-stone-300 animate-in fade-in duration-100">
                      <span
                        className="w-2 h-2 rounded-full shrink-0 border border-white/30"
                        style={{ backgroundColor: activePalettePreview.hex }}
                      />
                      <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0">{activePalettePreview.ruleTitle}</span>
                      <span className="text-[9px] text-stone-500 dark:text-stone-400 truncate">{activePalettePreview.ruleDesc}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Color Rules Legend Popover Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLegendOpen(!isLegendOpen)}
                className={`flex items-center gap-1 px-2 py-1 ${isLegendOpen ? "bg-amber-200/90 text-amber-950 font-bold" : themeStyles.btn} text-[11px] font-semibold rounded-md transition-all cursor-pointer shadow-2xs`}
                title="色分けルール一覧を確認"
              >
                <HelpCircle className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                <span>色の心得</span>
              </button>

              {isLegendOpen && (
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute bottom-full mb-1.5 right-0 sm:right-0 z-40 w-72 p-3 bg-stone-900/95 text-stone-100 backdrop-blur-md rounded-xl shadow-2xl border border-amber-500/40 animate-in fade-in zoom-in-95 duration-150 text-xs select-none"
                >
                  <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-stone-800">
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <span>📜</span> 冒険の手帳：色分けの心得
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLegendOpen(false)}
                      className="text-stone-400 hover:text-white p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    <div>
                      <div className="text-[10px] font-bold text-amber-400/90 mb-1">🖍️ マーカー（強調）</div>
                      <div className="space-y-1">
                        {MARKER_PALETTE.map((m) => (
                          <div key={m.id} className="flex items-center gap-1.5 text-[11px]">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: m.hex, border: `1px solid ${m.border}` }}
                            />
                            <span className="font-bold text-stone-200 w-28 shrink-0 truncate">{m.ruleTitle}</span>
                            <span className="text-[10px] text-stone-400 truncate">{m.ruleDesc}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-stone-800">
                      <div className="text-[10px] font-bold text-amber-400/90 mb-1">🎨 文字色</div>
                      <div className="space-y-1">
                        {TEXT_COLOR_PALETTE.map((c) => (
                          <div key={c.id} className="flex items-center gap-1.5 text-[11px]">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/30"
                              style={{ backgroundColor: c.hex }}
                            />
                            <span className="font-bold text-stone-200 w-28 shrink-0 truncate">{c.ruleTitle}</span>
                            <span className="text-[10px] text-stone-400 truncate">{c.ruleDesc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <span className={`text-[10px] ${themeStyles.hint} font-mono hidden sm:inline select-none`}>
              💡 文字を選択するとNotion風パレットが出現
            </span>
          </div>
        </div>
      )}

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
                alt="拡大写真"
                className="max-w-[94vw] max-h-[78vh] object-contain rounded-xl shadow-2xl border border-stone-800 bg-stone-950/80"
              />
              <div className="mt-3 flex items-center gap-3 shrink-0">
                <a
                  href={lightboxUrl}
                  download={`photo-${Date.now()}.webp`}
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
}
