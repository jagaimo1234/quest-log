import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import { Lightbulb } from "lucide-react";
import { toast } from "sonner";

export function GlobalAwarenessCapture() {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [selectedData, setSelectedData] = useState<{
    text: string;
    contextBefore?: string;
    contextAfter?: string;
    sourceTitle?: string;
    sourceUrl?: string;
  } | null>(null);

  const isInteractingRef = useRef(false);
  const utils = trpc.useUtils();

  const createMutation = trpc.awareness.create.useMutation({
    onSuccess: (data) => {
      utils.awareness.list.invalidate();
      toast.success(`「${data.title.slice(0, 20)}${data.title.length > 20 ? '...' : ''}」を意識リストに追加しました！`, {
        action: {
          label: "意識画面へ",
          onClick: () => {
            window.location.href = "/awareness";
          },
        },
      });
      setCoords(null);
      setSelectedData(null);
    },
    onError: () => {
      toast.error("意識への登録に失敗しました");
    },
  });

  useEffect(() => {
    const handleSelectionChange = () => {
      if (isInteractingRef.current) return;

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setCoords(null);
        setSelectedData(null);
        return;
      }

      const rawText = sel.toString().trim();
      if (rawText.length < 2 || rawText.length > 300) {
        setCoords(null);
        setSelectedData(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setCoords(null);
        return;
      }

      // If selection is inside an active input or textarea, we can still capture, but if it's in RichDocEditor,
      // RichDocEditor has its own floating toolbar, so skip to avoid overlap!
      const startEl = range.startContainer.parentElement;
      if (startEl && startEl.closest('[data-rich-doc-editor="true"]')) {
        setCoords(null);
        return;
      }

      // Extract context around selection
      let contextBefore = "";
      let contextAfter = "";
      const containerText = range.commonAncestorContainer.textContent || "";
      const idx = containerText.indexOf(rawText);
      if (idx !== -1) {
        contextBefore = containerText.substring(Math.max(0, idx - 60), idx).trim();
        contextAfter = containerText.substring(idx + rawText.length, Math.min(containerText.length, idx + rawText.length + 60)).trim();
      }

      // Extract page / context info
      let sourceTitle = document.title || "Quest Log";
      const heading = startEl?.closest('section, article, [data-source-title]')?.querySelector('h1, h2, h3, [data-source-title]');
      if (heading?.textContent) {
        sourceTitle = heading.textContent.trim().slice(0, 40);
      }

      setSelectedData({
        text: rawText,
        contextBefore,
        contextAfter,
        sourceTitle,
        sourceUrl: window.location.pathname + window.location.search + window.location.hash,
      });

      // Position popup right above the selection
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setCoords({
        x: rect.left + rect.width / 2 + scrollX,
        y: Math.max(10, rect.top + scrollY - 8),
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCoords(null);
        setSelectedData(null);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-awareness-capture-chip="true"]')) {
        // Will clear on next selectionchange or touch
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  if (!coords || !selectedData) return null;

  const handleCapture = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    createMutation.mutate({
      title: selectedData.text,
      contextBefore: selectedData.contextBefore,
      contextAfter: selectedData.contextAfter,
      sourceTitle: selectedData.sourceTitle,
      sourceUrl: selectedData.sourceUrl,
      sourceType: "selection",
    });
  };

  return createPortal(
    <div
      data-awareness-capture-chip="true"
      style={{
        position: "absolute",
        left: `${coords.x}px`,
        top: `${coords.y}px`,
        transform: "translate(-50%, -100%)",
        zIndex: 9999,
      }}
      onMouseEnter={() => {
        isInteractingRef.current = true;
      }}
      onMouseLeave={() => {
        isInteractingRef.current = false;
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        isInteractingRef.current = true;
      }}
      className="animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      <button
        type="button"
        onClick={handleCapture}
        disabled={createMutation.isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-xl border border-amber-300 cursor-pointer transition-transform hover:scale-105 active:scale-95"
      >
        <Lightbulb className="w-3.5 h-3.5 fill-stone-950" />
        <span>💡 意識に追加</span>
      </button>
    </div>,
    document.body
  );
}
