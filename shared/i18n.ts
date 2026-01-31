/**
 * Japanese localization strings for Quest Log
 */

export const ja = {
  // Navigation & Headers
  "nav.home": "ホーム",
  "nav.history": "履歴",
  "nav.templates": "テンプレート",
  "nav.settings": "設定",

  // Home Page
  "home.title": "クエスト ログ",
  "home.subtitle": "冒険者の記録帳へようこそ",
  "home.stats.totalXp": "累計 XP",
  "home.stats.streak": "連続クリア",
  "home.stats.bestStreak": "最高記録",
  "home.activeQuests": "受注中のクエスト",
  "home.noQuests": "受注中のクエストはありません",
  "home.createFirst": "最初のクエストを作成する",
  "home.quickActions": "クイックアクション",
  "home.newQuest": "新規クエスト",
  "home.tip": "ハンターのヒント",
  "home.tipText": "毎日クエストをクリアしてストリークを維持しましょう。各クエストクリアで XP を獲得できます。",

  // Quest Creation
  "quest.create.title": "新規クエスト",
  "quest.create.questName": "クエスト名（任意）",
  "quest.create.questNamePlaceholder": "何をするか",
  "quest.create.projectName": "案件名（任意）",
  "quest.create.projectNamePlaceholder": "何についてのクエストか",
  "quest.create.type": "クエスト種別",
  "quest.create.difficulty": "難易度",
  "quest.create.deadline": "期限（任意）",
  "quest.create.deadlineQuick": "クイック選択",
  "quest.create.deadlineToday": "今日中",
  "quest.create.deadlineThisWeek": "今週中",
  "quest.create.deadlineThisMonth": "今月中",
  "quest.create.deadlineNone": "期限なし",
  "quest.create.deadlineCustom": "日付指定",
  "quest.create.button": "クエスト作成",
  "quest.create.cancel": "キャンセル",

  // Quest Types
  "questType.daily": "デイリー",
  "questType.weekly": "ウィークリー",
  "questType.monthly": "マンスリー",
  "questType.yearly": "イヤーリー",
  "questType.free": "フリー",

  // Difficulty
  "difficulty.easy": "★ 簡単",
  "difficulty.medium": "★★ 普通",
  "difficulty.hard": "★★★ 難しい",

  // Quest Status
  "status.unreceived": "未受注",
  "status.accepted": "受注中",
  "status.challenging": "チャレンジ中",
  "status.almost": "もう少し",
  "status.cleared": "クリア",
  "status.paused": "中断",
  "status.cancelled": "キャンセル",
  "status.ongoing": "進行中",
  "status.continuing": "継続中",

  // Quest Actions
  "quest.action.accept": "受注",
  "quest.action.challenge": "チャレンジ",
  "quest.action.almost": "もう少し",
  "quest.action.clear": "クリア",
  "quest.action.pause": "中断",
  "quest.action.cancel": "キャンセル",
  "quest.action.resume": "再開",

  // Remaining Time
  "time.today": "今日まで",
  "time.daysLeft": "あと{days}日",
  "time.thisWeek": "今週中",
  "time.thisMonth": "今月中",
  "time.thisYear": "今年中",
  "time.overdue": "期限超過",

  // History Page
  "history.title": "クエスト履歴",
  "history.subtitle": "完了、中断、キャンセルしたクエストの記録",
  "history.noHistory": "履歴がありません",
  "history.cleared": "クリア",
  "history.paused": "中断",
  "history.cancelled": "キャンセル",
  "history.incomplete": "未完了",
  "history.xpEarned": "+{xp} XP",

  // Templates Page
  "template.title": "クエスト テンプレート",
  "template.subtitle": "定期的に発生するクエストを管理",
  "template.new": "新規テンプレート",
  "template.active": "有効",
  "template.paused": "一時停止",
  "template.noTemplates": "テンプレートがありません",
  "template.createFirst": "最初のテンプレートを作成する",
  "template.everyDay": "毎日",
  "template.everyWeek": "毎週",
  "template.everyMonth": "毎月",
  "template.everyYear": "毎年",
  "template.dayOfWeek": "曜日",
  "template.whenInMonth": "月内のタイミング",
  "template.month": "月",
  "template.firstWeek": "第1週",
  "template.lastWeek": "最終週",

  // Days of Week
  "day.sunday": "日曜日",
  "day.monday": "月曜日",
  "day.tuesday": "火曜日",
  "day.wednesday": "水曜日",
  "day.thursday": "木曜日",
  "day.friday": "金曜日",
  "day.saturday": "土曜日",

  // Months
  "month.january": "1月",
  "month.february": "2月",
  "month.march": "3月",
  "month.april": "4月",
  "month.may": "5月",
  "month.june": "6月",
  "month.july": "7月",
  "month.august": "8月",
  "month.september": "9月",
  "month.october": "10月",
  "month.november": "11月",
  "month.december": "12月",

  // Quest Clear Animation
  "clear.title": "クエスト クリア",
  "clear.victory": "勝利！",
  "clear.xpEarned": "XP 獲得",

  // Messages
  "message.questCreated": "クエストを作成しました",
  "message.questUpdated": "クエストを更新しました",
  "message.questCleared": "クエストをクリアしました！",
  "message.questPaused": "クエストを中断しました",
  "message.questCancelled": "クエストをキャンセルしました",
  "message.templateCreated": "テンプレートを作成しました",
  "message.templateUpdated": "テンプレートを更新しました",
  "message.error": "エラーが発生しました",
  "message.loading": "読み込み中...",

  // Auth
  "auth.login": "ログイン",
  "auth.logout": "ログアウト",
  "auth.guestMode": "ゲストモード",
  "auth.guestModeDesc": "ログインせずにクエストを記録できます",
  "auth.welcome": "ようこそ、{name}",

  // Footer
  "footer.about": "クエスト ログについて",
  "footer.concept": "自己管理ではなく、クエストの記録",
};

/**
 * Get translated string
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let text = (ja as any)[key] || key;
  
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  
  return text;
}
