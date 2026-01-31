import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Loader2, BookOpen, CheckCircle2, Pause, XCircle, AlertTriangle, ArrowLeft, Swords } from "lucide-react";

/**
 * 履歴ページ
 * 
 * 要求仕様:
 * - 日付＋曜日ごとの表示
 * - クリア、中断、キャンセル、未完了を表示
 * - 評価・点数は付けない（事実ログのみ）
 * 
 * 表示例:
 * 12/25（水）
 * ✔ 今週の振り返り（Weekly｜MOAI活動）
 * ⏸ 年間方針見直し（Yearly｜中断）
 * △ 月次レビュー（Monthly｜未完了）
 */

// 曜日名
const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

// クエスト種別の日本語表示
const QUEST_TYPE_LABELS: Record<string, string> = {
  Daily: "デイリー",
  Weekly: "ウィークリー",
  Monthly: "マンスリー",
  Yearly: "イヤリー",
  Free: "フリー",
};

// ステータスアイコンと色
const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  cleared: { icon: CheckCircle2, color: "text-green-400", label: "クリア" },
  paused: { icon: Pause, color: "text-gray-400", label: "中断" },
  cancelled: { icon: XCircle, color: "text-red-400", label: "キャンセル" },
  incomplete: { icon: AlertTriangle, color: "text-amber-400", label: "未完了" },
};

// 日付をフォーマット（例: 12/25（水））
function formatDateWithWeekday(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAY_NAMES[date.getDay()];
  return `${month}/${day}（${weekday}）`;
}

// 履歴を日付ごとにグループ化
function groupHistoryByDate(history: any[]): Map<string, any[]> {
  const grouped = new Map<string, any[]>();
  
  for (const entry of history) {
    const dateKey = entry.recordedDate;
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(entry);
  }
  
  return grouped;
}

// 履歴エントリコンポーネント
function HistoryEntry({ entry }: { entry: any }) {
  const config = STATUS_CONFIG[entry.finalStatus] || STATUS_CONFIG.incomplete;
  const Icon = config.icon;
  
  return (
    <div className="history-entry">
      <div className={`history-status-icon ${entry.finalStatus}`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground">
            {entry.questName || "（名称未設定）"}
          </span>
          <span className="text-sm text-muted-foreground">
            （{QUEST_TYPE_LABELS[entry.questType]}
            {entry.projectName && `｜${entry.projectName}`}）
          </span>
        </div>
        {entry.xpEarned > 0 && (
          <span className="text-xs text-accent">+{entry.xpEarned} XP</span>
        )}
      </div>
    </div>
  );
}

// 日付グループコンポーネント
function DateGroup({ date, entries }: { date: string; entries: any[] }) {
  return (
    <div className="mb-6">
      <div className="date-header">
        {formatDateWithWeekday(date)}
      </div>
      <div className="quest-frame p-4">
        {entries.map((entry) => (
          <HistoryEntry key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

export default function History() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
  // 履歴データ取得
  const { data: history, isLoading: historyLoading } = trpc.history.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  
  // 未認証時
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 texture-overlay">
        <div className="quest-frame p-8 max-w-md w-full text-center">
          <div className="quest-frame-corner top-left" />
          <div className="quest-frame-corner top-right" />
          <div className="quest-frame-corner bottom-left" />
          <div className="quest-frame-corner bottom-right" />
          
          <h1 className="text-2xl font-bold text-accent mb-4">冒険者の記録帳</h1>
          <p className="text-muted-foreground mb-6">
            履歴を見るにはログインが必要です
          </p>
          
          <Button
            onClick={() => window.location.href = getLoginUrl()}
            className="btn-quest btn-quest-primary"
          >
            <Swords className="w-4 h-4 mr-2" />
            ログイン
          </Button>
        </div>
      </div>
    );
  }
  
  // ローディング
  if (authLoading || historyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }
  
  // 履歴を日付ごとにグループ化
  const groupedHistory = groupHistoryByDate(history || []);
  const sortedDates = Array.from(groupedHistory.keys()).sort((a, b) => b.localeCompare(a));
  
  return (
    <div className="min-h-screen texture-overlay">
      {/* ヘッダー */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => window.location.href = "/"}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-accent" />
              <div>
                <h1 className="text-xl font-bold text-accent">冒険者の記録帳</h1>
                <p className="text-sm text-muted-foreground">
                  クエストの履歴
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* メインコンテンツ */}
      <main className="container py-6">
        {sortedDates.length === 0 ? (
          <div className="quest-frame p-8 text-center">
            <div className="quest-frame-corner top-left" />
            <div className="quest-frame-corner top-right" />
            <div className="quest-frame-corner bottom-left" />
            <div className="quest-frame-corner bottom-right" />
            
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              まだ履歴がありません
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              クエストをクリア、中断、またはキャンセルすると<br />
              ここに記録されます
            </p>
          </div>
        ) : (
          sortedDates.map((date) => (
            <DateGroup
              key={date}
              date={date}
              entries={groupedHistory.get(date)!}
            />
          ))
        )}
        
        {/* 説明 */}
        <div className="quest-frame p-4 mt-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📜</span>
            <div>
              <h3 className="font-bold text-accent mb-1">記録について</h3>
              <p className="text-sm text-muted-foreground">
                この記録帳は評価や点数をつけるものではありません。
                クリア、中断、キャンセル、未完了の事実をそのまま記録しています。
                自分の行動と判断の記録として活用してください。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
