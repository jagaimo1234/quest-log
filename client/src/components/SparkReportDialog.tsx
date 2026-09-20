import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Lightbulb,
  Heart,
  Plus,
  Settings,
  Bot,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface SparkReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetDate: string; // 'YYYY-MM-DD'
  onKaizenAdded?: () => void;
}

export function SparkReportDialog({
  open,
  onOpenChange,
  targetDate,
  onKaizenAdded,
}: SparkReportDialogProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    return localStorage.getItem("quest_log_gemini_api_key") || "";
  });

  const utils = trpc.useUtils();
  const { data: report, isLoading, refetch } = trpc.spark.getReport.useQuery(
    { targetDate, periodType: "daily" },
    { enabled: open }
  );

  const analyzeMutation = trpc.spark.analyze.useMutation({
    onSuccess: () => {
      toast.success("✨ Spark 考察レポートを生成しました！");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "レポートの生成に失敗しました");
    },
  });

  const createMemo = trpc.memo.create.useMutation({
    onSuccess: () => {
      toast.success("💡 KAIZEN MEMO に追加しました！");
      onKaizenAdded?.();
    },
  });

  const handleGenerate = (force: boolean = false) => {
    analyzeMutation.mutate({ targetDate, periodType: "daily", force });
  };

  const handleSaveApiKey = () => {
    localStorage.setItem("quest_log_gemini_api_key", apiKeyInput.trim());
    toast.success("APIキーをブラウザに保存しました");
    setShowSettings(false);
  };

  const handleCopyMarkdown = () => {
    if (!report?.rawReportMarkdown) return;
    navigator.clipboard.writeText(report.rawReportMarkdown);
    toast.success("レポート全文をクリップボードにコピーしました");
  };

  const handleAddKaizen = (text: string) => {
    createMemo.mutate({ content: text, action: "Spark考察より採用" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-gradient-to-b from-stone-900 to-stone-950 text-stone-100 border-amber-900/40 shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-amber-900/30 flex items-center justify-between bg-stone-900/80 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-amber-200">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              <span>焚き火の考察 (Spark レポート)</span>
              <span className="text-xs font-normal text-stone-400 bg-stone-800/80 px-2 py-0.5 rounded-full border border-stone-700">
                {targetDate}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-1.5 mr-6">
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 text-stone-400 hover:text-amber-200 hover:bg-stone-800"
              onClick={() => setShowSettings(!showSettings)}
              title="API設定"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* API Settings Dropdown Panel */}
        {showSettings && (
          <div className="p-4 bg-stone-950 border-b border-amber-900/30 space-y-2 animate-in slide-in-from-top duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">⚙️ Spark API設定</span>
              <span className="text-[10px] text-stone-400">Google Gemini API / OpenAI API</span>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Google AI Studio（無料）で取得した Gemini APIキー、または OpenAI APIキーを設定すると、より深い文脈把握とパーソナライズされた考察が行われます。
              <br />
              <span className="text-stone-500">※ サーバーの .env に GEMINI_API_KEY を設定することでも有効化できます。</span>
            </p>
            <div className="flex gap-2 pt-1">
              <Input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy... または sk-..."
                className="text-xs h-8 bg-stone-900 border-stone-700 text-stone-200 focus-visible:ring-amber-500"
              />
              <Button
                size="sm"
                onClick={handleSaveApiKey}
                className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-white"
              >
                保存
              </Button>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar text-stone-200 text-sm">
          {isLoading || analyzeMutation.isPending ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-stone-400">
              <div className="relative">
                <Flame className="w-10 h-10 text-amber-500 animate-bounce" />
                <Sparkles className="w-5 h-5 text-amber-300 absolute -top-1 -right-1 animate-spin" />
              </div>
              <p className="text-xs font-medium text-amber-200/90 animate-pulse">
                焚き火の火を見つめながら、思考とタスクを照合中...
              </p>
            </div>
          ) : !report ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="font-bold text-stone-200">まだ本日の考察レポートはありません</h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  日記の記述とタスク実績をAIが読み解き、充実度やバイオリズム、次の改善アクションを導き出します。
                </p>
              </div>
              <Button
                onClick={() => handleGenerate(false)}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs px-5 shadow-lg shadow-amber-900/30"
              >
                <Sparkles className="w-4 h-4 mr-1.5" /> 今日の日記をSpark考察する
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Condition Rating & Summary Card */}
              <div className="p-4 rounded-xl bg-stone-900/90 border border-amber-900/30 space-y-2 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <span>🌟</span> コンディション充実度
                  </span>
                  <div className="flex gap-1 text-amber-400 text-sm">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < report.conditionScore ? "text-amber-400" : "text-stone-700"}>
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-stone-200 leading-snug">
                  {report.summary}
                </p>
              </div>

              {/* Deep Analysis */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-amber-300/90 flex items-center gap-1.5 uppercase tracking-wide">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>心理バイオリズム＆行動連動の分析</span>
                </h4>
                <div className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 text-xs text-stone-300 leading-relaxed whitespace-pre-wrap">
                  {report.analysis}
                </div>
              </div>

              {/* KAIZEN Suggestions */}
              {report.kaizenSuggestions && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>明日試せる KAIZEN アクション提案</span>
                    </h4>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 space-y-2">
                    <div className="text-xs text-stone-300 leading-relaxed whitespace-pre-wrap">
                      {report.kaizenSuggestions}
                    </div>
                    <div className="pt-1 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddKaizen(report.kaizenSuggestions.slice(0, 100))}
                        className="h-7 text-[11px] border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/30 hover:text-emerald-200"
                      >
                        <Plus className="w-3 h-3 mr-1" /> KAIZEN MEMO に反映
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Companion Voice Message */}
              {report.companionMessage && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-stone-900 to-stone-900 border border-amber-800/40 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-300 text-base">
                    🤖
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                      焚き火の番人からの言葉
                    </div>
                    <p className="text-xs text-amber-100/90 leading-relaxed italic">
                      「{report.companionMessage}」
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {report && (
          <div className="p-3 sm:p-4 border-t border-amber-900/30 bg-stone-900/80 backdrop-blur-sm flex items-center justify-between">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyMarkdown}
              className="text-xs text-stone-400 hover:text-stone-200"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Markdownをコピー
            </Button>

            <Button
              size="sm"
              onClick={() => handleGenerate(true)}
              disabled={analyzeMutation.isPending}
              className="text-xs bg-stone-800 hover:bg-stone-700 text-amber-200 border border-amber-900/40"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${analyzeMutation.isPending ? "animate-spin" : ""}`} />
              再生成
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
