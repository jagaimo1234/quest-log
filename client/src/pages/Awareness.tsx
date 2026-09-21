import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Lightbulb,
  Sprout,
  TreePine,
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Trash2,
  Edit2,
  Layers,
  Search,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Check,
  Flame,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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

export default function Awareness() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.awareness.list.useQuery();

  const createMutation = trpc.awareness.create.useMutation({
    onSuccess: () => {
      utils.awareness.list.invalidate();
      toast.success("新しい意識を登録しました");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error("登録に失敗しました"),
  });

  const updateMutation = trpc.awareness.update.useMutation({
    onSuccess: () => {
      utils.awareness.list.invalidate();
      toast.success("意識を更新しました");
      setEditingItem(null);
    },
    onError: () => toast.error("更新に失敗しました"),
  });

  const deleteMutation = trpc.awareness.delete.useMutation({
    onSuccess: () => {
      utils.awareness.list.invalidate();
      toast.success("意識を削除しました");
    },
    onError: () => toast.error("削除に失敗しました"),
  });

  const addLogMutation = trpc.awareness.addLog.useMutation({
    onSuccess: () => {
      utils.awareness.list.invalidate();
      toast.success("実例ログを記録しました！");
      setLogInputTarget(null);
      setLogContent("");
    },
    onError: () => toast.error("ログの記録に失敗しました"),
  });

  const deleteLogMutation = trpc.awareness.deleteLog.useMutation({
    onSuccess: () => {
      utils.awareness.list.invalidate();
      toast.success("ログを削除しました");
    },
    onError: () => toast.error("削除に失敗しました"),
  });

  const mergeMutation = trpc.awareness.merge.useMutation({
    onSuccess: () => {
      utils.awareness.list.invalidate();
      toast.success("意識を統合しました");
      setMergeSource(null);
      setMergeTargetId(null);
    },
    onError: () => toast.error("統合に失敗しました"),
  });

  // State
  const [activeFilterTab, setActiveFilterTab] = useState<"all" | "active" | "standby" | "anchored">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedContexts, setExpandedContexts] = useState<Record<number, boolean>>({});
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});

  // Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "standby" | "anchored">("standby");

  // Log Input State
  const [logInputTarget, setLogInputTarget] = useState<{ item: any; logType: "success" | "failure" | "insight" } | null>(null);
  const [logContent, setLogContent] = useState("");

  // Merge State
  const [mergeSource, setMergeSource] = useState<any | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);

  const resetForm = () => {
    setFormTitle("");
    setFormNotes("");
    setFormStatus("standby");
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormNotes(item.notes || "");
    setFormStatus(item.status);
  };

  const handleSave = () => {
    if (!formTitle.trim()) {
      toast.error("意識したい文章を入力してください");
      return;
    }
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        title: formTitle,
        notes: formNotes,
        status: formStatus,
      });
    } else {
      createMutation.mutate({
        title: formTitle,
        notes: formNotes,
        status: formStatus,
        sourceType: "manual",
      });
    }
  };

  const handleQuickAddLog = () => {
    if (!logInputTarget || !logContent.trim()) {
      toast.error("内容を入力してください");
      return;
    }
    addLogMutation.mutate({
      awarenessId: logInputTarget.item.id,
      logType: logInputTarget.logType,
      content: logContent,
    });
  };

  const toggleStatus = (item: any, newStatus: "active" | "standby" | "anchored") => {
    if (newStatus === "active") {
      const currentActive = items.filter((i: any) => i.status === "active").length;
      if (currentActive >= 5) {
        toast.info("現在すでに5つの意識が育成中です。認知的負担を減らすため、集中する意識は3〜5個以内を推奨しています。");
      }
    }
    updateMutation.mutate({
      id: item.id,
      status: newStatus,
    });
  };

  const handleMergeSubmit = () => {
    if (!mergeSource || !mergeTargetId) {
      toast.error("統合先の意識を選択してください");
      return;
    }
    if (window.confirm(`「${mergeSource.title}」を「${items.find((i: any) => i.id === mergeTargetId)?.title}」に統合しますか？\n実例ログはすべて引き継がれます。`)) {
      mergeMutation.mutate({
        sourceId: mergeSource.id,
        targetId: mergeTargetId,
      });
    }
  };

  // Groupings
  const activeItems = useMemo(() => items.filter((i: any) => i.status === "active"), [items]);
  const standbyItems = useMemo(() => items.filter((i: any) => i.status === "standby"), [items]);
  const anchoredItems = useMemo(() => items.filter((i: any) => i.status === "anchored"), [items]);

  const filteredItems = useMemo(() => {
    return items.filter((i: any) => {
      if (activeFilterTab !== "all" && i.status !== activeFilterTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = i.title?.toLowerCase().includes(q);
        const matchNotes = i.notes?.toLowerCase().includes(q);
        const matchSource = i.sourceTitle?.toLowerCase().includes(q);
        return matchTitle || matchNotes || matchSource;
      }
      return true;
    });
  }, [items, activeFilterTab, searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.href = "/"}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <Lightbulb className="w-5 h-5 fill-amber-500/30" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                  意識を育てる
                  <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Awareness Garden
                  </span>
                </h1>
                <p className="text-[11px] text-muted-foreground hidden sm:block">
                  気づきを昇格させ、日常の実例（成功・失敗・気づき）を通じて定着させる
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={openCreateModal}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold gap-1 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">手動で意識を追加</span>
            <span className="sm:hidden">追加</span>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Philosophy Card Banner */}
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-1">
            <div className="font-bold text-foreground">
              💡 どこからでも文章を選択して「意識に追加」
            </div>
            <p className="text-muted-foreground leading-relaxed">
              日記やクエストメモ、振り返りを書いている最中に、大切だと感じた言葉を選択するだけで、文脈・出典付きでこの場所へ昇格されます。
              現在意識するものは<strong>最大3〜5個</strong>に絞り、日々の実践ログを蓄積して無意識の習慣へ育てましょう。
            </p>
          </div>
        </div>

        {/* SECTION 1: FOCUS / ACTIVE AWARENESS (育成中) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌱</span>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                現在フォーカス中（育成中）
              </h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeItems.length > 5 ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                {activeItems.length} / 5
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              日常で常に頭に置いておきたい核となる意識
            </span>
          </div>

          {activeItems.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-border/70 rounded-2xl bg-card/30 space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Sprout className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-foreground">
                現在フォーカス中の意識がありません
              </div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                画面下の「待機中（ストック）」から意識したいものを【育成中にする】か、日記やクエストメモなどの文章を選択して【💡 意識に追加】してみましょう。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeItems.map((item: any) => {
                const stage = STAGE_CONFIG[item.retentionStage as keyof typeof STAGE_CONFIG] || STAGE_CONFIG.sprout;
                const isContextOpen = !!expandedContexts[item.id];
                const isLogsOpen = !!expandedLogs[item.id];
                const hasContext = item.contextBefore || item.contextAfter;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-amber-500/40 bg-card/90 shadow-md flex flex-col justify-between space-y-4 relative group"
                  >
                    {/* Card Header */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {/* Stage Badge */}
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border ${stage.bg} ${stage.color}`}>
                          <stage.icon className="w-3.5 h-3.5" />
                          <span>{stage.badge}</span>
                          <span className="text-[10px] opacity-70">
                            (実例 {item.counts?.total || 0}件)
                          </span>
                        </div>

                        {/* Card Dropdown Menu */}
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => toggleStatus(item, "standby")}>
                                📦 待機中に戻す
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleStatus(item, "anchored")}>
                                🌳 定着済みにする
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditModal(item)}>
                                <Edit2 className="w-3.5 h-3.5 mr-2" /> 編集
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setMergeSource(item); }}>
                                <Layers className="w-3.5 h-3.5 mr-2" /> 別の意識と統合
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (window.confirm(`「${item.title}」を削除しますか？`)) {
                                    deleteMutation.mutate({ id: item.id });
                                  }
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> 削除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Main Title Phrase */}
                      <div className="text-base font-bold text-foreground leading-snug tracking-tight">
                        「{item.title}」
                      </div>

                      {/* Notes / Subtext */}
                      {item.notes && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {item.notes}
                        </p>
                      )}

                      {/* Source & Context */}
                      <div className="text-[11px] text-muted-foreground space-y-1 pt-1">
                        {item.sourceTitle && (
                          <div className="flex items-center gap-1 text-stone-400">
                            <span>出典:</span>
                            <span className="font-medium text-foreground">{item.sourceTitle}</span>
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
                              onClick={() => setExpandedContexts(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className="text-amber-500 hover:underline flex items-center gap-1 cursor-pointer text-[10.5px]"
                            >
                              {isContextOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              {isContextOpen ? "前後の文脈を閉じる" : "前後の文脈を見る"}
                            </button>
                            {isContextOpen && (
                              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-[11px] leading-relaxed text-muted-foreground mt-1 space-y-1">
                                {item.contextBefore && <div>...{item.contextBefore}</div>}
                                <div className="font-bold text-foreground bg-amber-500/10 px-1 py-0.5 rounded">
                                  {item.title}
                                </div>
                                {item.contextAfter && <div>{item.contextAfter}...</div>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress / Practice Section */}
                    <div className="space-y-3 pt-2 border-t border-border/50">
                      {/* Log Action Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10.5px] font-bold text-muted-foreground mr-1">実例を記録:</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLogInputTarget({ item, logType: "success" })}
                          className="h-7 px-2 text-[11px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1 font-bold"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          成功
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLogInputTarget({ item, logType: "failure" })}
                          className="h-7 px-2 text-[11px] border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 gap-1 font-bold"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          失敗
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLogInputTarget({ item, logType: "insight" })}
                          className="h-7 px-2 text-[11px] border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-1 font-bold"
                        >
                          <Sparkles className="w-3 h-3" />
                          気づき
                        </Button>
                      </div>

                      {/* Log History Accordion */}
                      {item.logs && item.logs.length > 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setExpandedLogs(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer font-medium"
                          >
                            {isLogsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            <span>記録された実例ログ ({item.logs.length}件)</span>
                          </button>

                          {isLogsOpen && (
                            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {item.logs.map((log: any) => {
                                const isSuccess = log.logType === "success";
                                const isFailure = log.logType === "failure";
                                return (
                                  <div
                                    key={log.id}
                                    className="p-2 rounded-lg bg-muted/40 border border-border/40 text-xs flex items-start justify-between gap-2"
                                  >
                                    <div className="flex items-start gap-1.5 min-w-0">
                                      <span className="shrink-0 mt-0.5">
                                        {isSuccess ? "✅" : isFailure ? "⚠️" : "💡"}
                                      </span>
                                      <div className="min-w-0">
                                        <div className="text-foreground leading-snug break-words">
                                          {log.content}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                          {format(new Date(log.loggedAt), "yyyy/MM/dd HH:mm")}
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => deleteLogMutation.mutate({ logId: log.id, awarenessId: item.id })}
                                      className="text-muted-foreground hover:text-red-500 p-1 shrink-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: STOCK & BACKLOG (待機中・定着済み・すべて) */}
        <section className="space-y-4 pt-6 border-t border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📦</span>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                意識のストック・全一覧
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border/50 text-xs">
              <button
                type="button"
                onClick={() => setActiveFilterTab("all")}
                className={`px-2.5 py-1 rounded-md font-bold transition ${activeFilterTab === "all" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                すべて ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilterTab("active")}
                className={`px-2.5 py-1 rounded-md font-bold transition ${activeFilterTab === "active" ? "bg-card text-amber-500 shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                🌱 育成中 ({activeItems.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilterTab("standby")}
                className={`px-2.5 py-1 rounded-md font-bold transition ${activeFilterTab === "standby" ? "bg-card text-stone-400 shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                📦 待機中 ({standbyItems.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilterTab("anchored")}
                className={`px-2.5 py-1 rounded-md font-bold transition ${activeFilterTab === "anchored" ? "bg-card text-sky-500 shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                🌳 定着済み ({anchoredItems.length})
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="意識の言葉やメモで検索..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* List */}
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              該当する意識がありません。
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item: any) => {
                const stage = STAGE_CONFIG[item.retentionStage as keyof typeof STAGE_CONFIG] || STAGE_CONFIG.sprout;
                const isAnchored = item.status === "anchored";
                const isActive = item.status === "active";

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border transition flex items-center justify-between gap-3 ${
                      isActive
                        ? "border-amber-500/40 bg-card"
                        : isAnchored
                          ? "border-sky-500/30 bg-sky-500/5 text-slate-700 dark:text-slate-300"
                          : "border-border/60 bg-card/60 hover:bg-card"
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${stage.bg} ${stage.color}`}>
                          {stage.badge}
                        </span>
                        {item.status === "standby" && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                            待機中
                          </span>
                        )}
                        <span className="text-xs font-bold text-foreground truncate">
                          「{item.title}」
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                        {item.sourceTitle && (
                          <span>出典: {item.sourceTitle}</span>
                        )}
                        <span>実例: {item.counts?.total || 0}件</span>
                        <span>登録: {format(new Date(item.createdAt), "yyyy/MM/dd")}</span>
                      </div>
                    </div>

                    {/* Quick State Toggle Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.status !== "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStatus(item, "active")}
                          className="h-8 text-xs font-bold text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                        >
                          🌱 育成中にする
                        </Button>
                      )}
                      {item.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(item, "standby")}
                          className="h-8 text-xs text-muted-foreground hover:text-foreground"
                        >
                          📦 待機中へ
                        </Button>
                      )}
                      {item.status !== "anchored" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(item, "anchored")}
                          className="h-8 text-xs text-sky-500 hover:bg-sky-500/10"
                        >
                          🌳 定着
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => openEditModal(item)}>
                            <Edit2 className="w-3.5 h-3.5 mr-2" /> 編集
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setMergeSource(item)}>
                            <Layers className="w-3.5 h-3.5 mr-2" /> 統合
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (window.confirm(`「${item.title}」を削除しますか？`)) {
                                deleteMutation.mutate({ id: item.id });
                              }
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> 削除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={isCreateOpen || !!editingItem} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingItem(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "意識を編集" : "新しい意識を登録"}</DialogTitle>
            <DialogDescription>
              日頃から意識したい言葉や教訓を登録します。分類や対策は必須ではありません。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">
                意識したい文章・言葉 <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="例: 「感情が揺れたら一拍置いて深呼吸する」"
                className="h-20 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">
                メモ・背景（任意）
              </label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="例: ミーティングでの焦りを防ぐため"
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">
                ステータス
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formStatus === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormStatus("active")}
                  className="flex-1 text-xs"
                >
                  🌱 育成中 (フォーカス)
                </Button>
                <Button
                  type="button"
                  variant={formStatus === "standby" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormStatus("standby")}
                  className="flex-1 text-xs"
                >
                  📦 待機中 (ストック)
                </Button>
                <Button
                  type="button"
                  variant={formStatus === "anchored" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormStatus("anchored")}
                  className="flex-1 text-xs"
                >
                  🌳 定着済み
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingItem(null);
              }}
            >
              キャンセル
            </Button>
            <Button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold">
              保存する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QUICK LOG INPUT DIALOG */}
      <Dialog open={!!logInputTarget} onOpenChange={(open) => {
        if (!open) {
          setLogInputTarget(null);
          setLogContent("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>
                {logInputTarget?.logType === "success"
                  ? "✅ 成功の実例を記録"
                  : logInputTarget?.logType === "failure"
                    ? "⚠️ 失敗の実例を記録"
                    : "💡 気づきを記録"}
              </span>
            </DialogTitle>
            <DialogDescription>
              「{logInputTarget?.item.title}」に関する日常の実例を一言で記録します。
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Textarea
              value={logContent}
              onChange={(e) => setLogContent(e.target.value)}
              placeholder={
                logInputTarget?.logType === "success"
                  ? "例: 午後の会議でイラッとしたが、深呼吸して穏やかに返答できた！"
                  : logInputTarget?.logType === "failure"
                    ? "例: 締め切り直前に焦って早口になってしまった。次回はタイマーを使う。"
                    : "例: 感情が揺れるのは睡眠不足の時が多いことに気づいた。"
              }
              className="h-24 text-sm"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setLogInputTarget(null)}>
              キャンセル
            </Button>
            <Button onClick={handleQuickAddLog} className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold">
              実例を保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MERGE DIALOG */}
      <Dialog open={!!mergeSource} onOpenChange={(open) => {
        if (!open) {
          setMergeSource(null);
          setMergeTargetId(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              意識の統合（マージ）
            </DialogTitle>
            <DialogDescription>
              同じ意味を持つ意識を1つに統合します。実例ログはすべて統合先へ引き継がれ、元の意識はアーカイブされます。
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-xs">
              <span className="text-muted-foreground block text-[11px]">統合元（削除される意識）:</span>
              <span className="font-bold text-foreground">「{mergeSource?.title}」</span>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">
                統合先（残す意識）を選択してください:
              </label>
              <select
                className="w-full p-2 rounded-md bg-background border border-border text-xs"
                value={mergeTargetId || ""}
                onChange={(e) => setMergeTargetId(Number(e.target.value))}
              >
                <option value="">-- 統合先を選択 --</option>
                {items
                  .filter((i: any) => i.id !== mergeSource?.id)
                  .map((i: any) => (
                    <option key={i.id} value={i.id}>
                      「{i.title}」({STAGE_CONFIG[i.retentionStage as keyof typeof STAGE_CONFIG]?.badge || ""})
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setMergeSource(null)}>
              キャンセル
            </Button>
            <Button
              onClick={handleMergeSubmit}
              disabled={!mergeTargetId}
              className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold"
            >
              統合を実行する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
