import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Sprout,
  TreePine,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { BalloonAwarenessItem } from "./AwarenessBalloons";

const STAGE_CONFIG = {
  sprout: {
    label: "芽生え",
    icon: Sprout,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    badge: "🌱 芽生え",
    description: "意識し始めたばかりの段階（実例0件）",
  },
  growing: {
    label: "育成中",
    icon: Sparkles,
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/30",
    badge: "🌿 育成中",
    description: "日常で試行錯誤している段階（実例1〜4件）",
  },
  anchored: {
    label: "定着",
    icon: TreePine,
    color: "text-sky-500",
    bg: "bg-sky-500/10 border-sky-500/30",
    badge: "🌳 定着",
    description: "無意識でも自然にできる習慣化の領域（実例5件以上）",
  },
};

interface AwarenessDetailDialogProps {
  item: BalloonAwarenessItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddLog: (awarenessId: number, logType: "success" | "failure" | "insight", content: string) => void;
  onDeleteLog: (logId: number, awarenessId: number) => void;
  onToggleStatus: (item: BalloonAwarenessItem, newStatus: "active" | "standby" | "anchored") => void;
  onEdit: (item: BalloonAwarenessItem) => void;
  onDelete: (item: BalloonAwarenessItem) => void;
}

export function AwarenessDetailDialog({
  item,
  isOpen,
  onClose,
  onAddLog,
  onDeleteLog,
  onToggleStatus,
  onEdit,
  onDelete,
}: AwarenessDetailDialogProps) {
  const [activeLogType, setActiveLogType] = useState<"success" | "failure" | "insight" | null>(null);
  const [logContent, setLogContent] = useState("");
  const [isContextOpen, setIsContextOpen] = useState(false);

  if (!item) return null;

  const stage = STAGE_CONFIG[item.retentionStage as keyof typeof STAGE_CONFIG] || STAGE_CONFIG.sprout;
  const hasContext = item.contextBefore || item.contextAfter;

  const handleSaveLog = () => {
    if (!activeLogType || !logContent.trim()) {
      toast.error("内容を入力してください");
      return;
    }
    onAddLog(item.id, activeLogType, logContent.trim());
    setActiveLogType(null);
    setLogContent("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader className="space-y-2 pb-2 border-b border-border/50">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Stage badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${stage.bg} ${stage.color}`}>
              <stage.icon className="w-3.5 h-3.5" />
              <span>{stage.badge}</span>
              <span className="text-[11px] opacity-75">
                (実例 {item.counts?.total || 0}件)
              </span>
            </div>

            {/* Status indicator / quick switch */}
            <div className="flex items-center gap-1 text-xs">
              {item.status !== "active" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleStatus(item, "active")}
                  className="h-7 text-xs border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                >
                  🌱 育成中にする
                </Button>
              )}
              {item.status !== "standby" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleStatus(item, "standby")}
                  className="h-7 text-xs text-muted-foreground"
                >
                  📦 待機に戻す
                </Button>
              )}
              {item.status !== "anchored" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleStatus(item, "anchored")}
                  className="h-7 text-xs border-sky-500/40 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10"
                >
                  🌳 定着
                </Button>
              )}
            </div>
          </div>

          <DialogTitle className="text-lg sm:text-xl font-bold leading-snug pt-1 text-foreground">
            「{item.title}」
          </DialogTitle>
          <DialogDescription className="sr-only">
            意識の詳細と実例ログの記録
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Notes */}
          {item.notes && (
            <div className="text-xs sm:text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/40 whitespace-pre-wrap leading-relaxed">
              {item.notes}
            </div>
          )}

          {/* Source & Context */}
          {(item.sourceTitle || hasContext) && (
            <div className="text-xs text-muted-foreground space-y-1.5 p-3 rounded-lg bg-card border border-border/50">
              {item.sourceTitle && (
                <div className="flex items-center gap-1.5">
                  <span className="text-stone-400">出典:</span>
                  <span className="font-semibold text-foreground">{item.sourceTitle}</span>
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      className="text-sky-500 hover:underline inline-flex items-center gap-0.5 ml-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {hasContext && (
                <div>
                  <button
                    type="button"
                    onClick={() => setIsContextOpen(!isContextOpen)}
                    className="text-amber-500 hover:underline flex items-center gap-1 cursor-pointer text-[11px] font-medium"
                  >
                    {isContextOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {isContextOpen ? "前後の文脈を閉じる" : "前後の文脈を見る"}
                  </button>
                  {isContextOpen && (
                    <div className="p-2.5 rounded bg-muted/50 border border-border/40 text-[11.5px] leading-relaxed text-muted-foreground mt-1.5 space-y-1">
                      {item.contextBefore && <div>...{item.contextBefore}</div>}
                      <div className="font-bold text-foreground bg-amber-500/15 px-1 py-0.5 rounded inline-block">
                        {item.title}
                      </div>
                      {item.contextAfter && <div>{item.contextAfter}...</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Practice / Log Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                実例を記録する
              </h3>
              <span className="text-[11px] text-muted-foreground">
                日常の行動や気づきをすぐ蓄積
              </span>
            </div>

            {/* Log Type Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveLogType(activeLogType === "success" ? null : "success")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  activeLogType === "success"
                    ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                    : "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 bg-emerald-500/5"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>成功できた</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLogType(activeLogType === "failure" ? null : "failure")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  activeLogType === "failure"
                    ? "bg-rose-500 text-white border-rose-600 shadow-sm"
                    : "border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 bg-rose-500/5"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>失敗・忘れた</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLogType(activeLogType === "insight" ? null : "insight")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  activeLogType === "insight"
                    ? "bg-amber-500 text-stone-950 border-amber-600 shadow-sm"
                    : "border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 bg-amber-500/5"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>気づき・工夫</span>
              </button>
            </div>

            {/* Quick Log Input Panel */}
            {activeLogType && (
              <div className="p-3 rounded-xl border border-amber-500/40 bg-card shadow-sm space-y-2.5 animate-fade-in">
                <div className="text-xs font-bold text-foreground flex items-center gap-1">
                  <span>
                    {activeLogType === "success" && "✅ 成功の実例をメモ"}
                    {activeLogType === "failure" && "⚠️ 失敗・つまずきのメモ"}
                    {activeLogType === "insight" && "💡 新しい発見・工夫のメモ"}
                  </span>
                </div>
                <Textarea
                  value={logContent}
                  onChange={(e) => setLogContent(e.target.value)}
                  placeholder={
                    activeLogType === "success"
                      ? "例: 会議で結論から先に話すことができた。"
                      : activeLogType === "failure"
                      ? "例: 焦ってまた細かい作業から手をつけてしまった。"
                      : "例: 朝イチに付箋を貼っておくと意識しやすいと気づいた。"
                  }
                  rows={2}
                  className="text-xs"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActiveLogType(null);
                      setLogContent("");
                    }}
                    className="h-7 text-xs"
                  >
                    キャンセル
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveLog}
                    className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold"
                  >
                    記録する
                  </Button>
                </div>
              </div>
            )}

            {/* Past Logs Accordion/List */}
            {item.logs && item.logs.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <div className="text-[11.5px] font-bold text-stone-500 dark:text-stone-400">
                  記録された実例ログ ({item.logs.length}件)
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {item.logs.map((log: any) => {
                    const isSuccess = log.logType === "success";
                    const isFailure = log.logType === "failure";
                    return (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-lg bg-muted/40 border border-border/40 text-xs flex items-start justify-between gap-2"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="shrink-0 mt-0.5 text-sm">
                            {isSuccess ? "✅" : isFailure ? "⚠️" : "💡"}
                          </span>
                          <div className="min-w-0">
                            <div className="text-foreground leading-snug break-words">
                              {log.content}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {format(new Date(log.loggedAt), "yyyy/MM/dd HH:mm")}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteLog(log.id, item.id)}
                          className="text-muted-foreground hover:text-red-500 p-1 shrink-0 cursor-pointer"
                          title="ログを削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="h-8 text-xs gap-1"
            >
              <Edit2 className="w-3.5 h-3.5" />
              編集
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm(`「${item.title}」を削除しますか？`)) {
                  onClose();
                  onDelete(item);
                }
              }}
              className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-500/10 gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              削除
            </Button>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900"
          >
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
