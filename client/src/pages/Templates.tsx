import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useMemo } from "react";
import { 
  Loader2, Scroll, Plus, ArrowLeft, Swords, Calendar, 
  ToggleLeft, ToggleRight, Pencil, Trash2, RefreshCw,
  Search, CheckCircle2, Zap, Coffee, Folder, X, Filter
} from "lucide-react";
import { toast } from "sonner";

/**
 * テンプレートページ
 * 
 * 要求仕様:
 * - Daily: 毎日
 * - Weekly: 指定曜日
 * - Monthly: 指定週・曜日 or 日付
 * - Yearly: 指定月...
 */

// 曜日名
const WEEKDAY_NAMES = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
const SHORT_WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// 週の名前
const WEEK_NAMES = ["第1週", "第2週", "第3週", "第4週", "月末週"];
const SHORT_WEEKS = ["1週", "2週", "3週", "4週", "末週"];

// 月の名前
const MONTH_NAMES = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

// クエスト種別の日本語表示
const QUEST_TYPE_LABELS: Record<string, string> = {
  Daily: "デイリー",
  Weekly: "ウィークリー",
  Monthly: "マンスリー",
  Yearly: "イヤリー",
  Free: "ワンオフ",
  Relax: "リラックス",
  Project: "プロジェクト",
};

// 難易度表示
// 難易度表示 (削除: 要求により非表示)
// function DifficultyStars({ difficulty }: { difficulty: string }) { ... }

// テンプレートカード
function TemplateCard({
  template,
  onToggle,
}: {
  template: any;
  onToggle: () => void;
}) {
  const toggleActive = trpc.template.toggleActive.useMutation();
  const deleteTemplate = trpc.template.delete.useMutation();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleActive.mutateAsync({
        templateId: template.id,
        isActive: !template.isActive,
      });
      onToggle();
      toast.success(template.isActive ? "テンプレートを無効にしました" : "テンプレートを有効にしました");
    } catch (error) {
      toast.error("テンプレートの更新に失敗しました");
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const name = template.questName || "名称未設定";
    if (!confirm(`テンプレート「${name}」を削除しますか？\n（この操作は取り消せません）`)) return;
    try {
      await deleteTemplate.mutateAsync({ templateId: template.id });
      toast.success("テンプレートを削除しました");
      onToggle();
    } catch (error) {
      toast.error("削除に失敗しました");
    }
  };

  const parse = (json: string | null) => {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  };
  const days = parse(template.daysOfWeek);
  const weeks = parse(template.weeksOfMonth);
  const dates = parse(template.datesOfMonth);

  // FIX判定
  let isFix = false;
  if (template.questType === "Daily") {
    isFix = true;
  } else if (days.length > 0 || weeks.length > 0 || dates.length > 0 || template.monthOfYear) {
    isFix = true;
  } else {
    isFix = false;
  }

  // カテゴリー別カラー設定
  let colorClass = {
    border: "border-sky-200",
    bg: "bg-sky-50/60 hover:bg-sky-50/90",
    iconBg: "bg-sky-100 text-sky-600",
    text: "text-sky-950",
    badge: "text-sky-700 bg-sky-100/80 border-sky-200"
  };

  if (template.questType === "Free") {
    colorClass = {
      border: "border-orange-200",
      bg: "bg-orange-50/60 hover:bg-orange-50/90",
      iconBg: "bg-orange-100 text-orange-600",
      text: "text-orange-950",
      badge: "text-orange-700 bg-orange-100/80 border-orange-200"
    };
  } else if (template.questType === "Relax") {
    colorClass = {
      border: "border-emerald-200",
      bg: "bg-emerald-50/60 hover:bg-emerald-50/90",
      iconBg: "bg-emerald-100 text-emerald-600",
      text: "text-emerald-950",
      badge: "text-emerald-700 bg-emerald-100/80 border-emerald-200"
    };
  } else if (template.questType === "Project") {
    colorClass = {
      border: "border-indigo-200",
      bg: "bg-indigo-50/60 hover:bg-indigo-50/90",
      iconBg: "bg-indigo-100 text-indigo-600",
      text: "text-indigo-950",
      badge: "text-indigo-700 bg-indigo-100/80 border-indigo-200"
    };
  } else if (!isFix) {
    colorClass = {
      border: "border-fuchsia-200",
      bg: "bg-fuchsia-50/60 hover:bg-fuchsia-50/90",
      iconBg: "bg-fuchsia-100 text-fuchsia-600",
      text: "text-fuchsia-950",
      badge: "text-fuchsia-700 bg-fuchsia-100/80 border-fuchsia-200"
    };
  }

  const typeLabel = QUEST_TYPE_LABELS[template.questType] || template.questType;
  const executionLabel = isFix ? "FIX" : "NON-FIX";

  const isOneOff = template.questType === "Free";
  const executedCount = template.executedCount || 0;
  const quota = template.frequency || 1;
  const isOneOffCompleted = isOneOff && executedCount >= quota;

  const getScheduleDescription = () => {
    switch (template.questType) {
      case "Daily":
        return "毎日";
      case "Weekly":
        if (days.length > 0) {
          const dayNames = days.map((d: number) => SHORT_WEEKDAYS[d]).join("・");
          return `${dayNames}`;
        }
        return `週${template.frequency || 1}回 (Pool)`;
      case "Monthly":
        let parts = [];
        if (dates.length > 0) parts.push(`${dates.join("・")}日`);
        if (weeks.length > 0) {
          const w = weeks.map((n: number) => SHORT_WEEKS[n - 1]).join("・");
          const d = days.length > 0 ? days.map((n: number) => SHORT_WEEKDAYS[n]).join("・") : "全日";
          parts.push(`${w}${d}`);
        }
        if (parts.length === 0) return `月${template.frequency || 1}回 (Pool)`;
        return `${parts.join(" / ")}`;
      case "Yearly":
        const m = template.monthOfYear ? `${template.monthOfYear}月` : "";
        if (!m) return `年${template.frequency || 1}回`;
        return `${m}`;
      case "Free":
        return `One-off (目標: ${quota}回)`;
      case "Relax":
        return "息抜き・回復";
      case "Project":
        return template.parentProjectName || template.projectName ? `案件: ${template.parentProjectName || template.projectName}` : "プロジェクトタスク";
      default:
        return "";
    }
  };

  return (
    <>
      <div className={`border rounded-xl p-3.5 sm:p-4 shadow-sm transition-all ${colorClass.border} ${colorClass.bg} ${!template.isActive ? "opacity-60 grayscale-[40%] bg-muted/40 border-dashed" : ""}`}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass.iconBg} shadow-inner`}>
              {template.questType === "Daily" && <RefreshCw className="w-5 h-5" />}
              {(template.questType === "Weekly" || template.questType === "Monthly" || template.questType === "Yearly") && <Calendar className="w-5 h-5" />}
              {template.questType === "Free" && <Zap className="w-5 h-5" />}
              {template.questType === "Relax" && <Coffee className="w-5 h-5" />}
              {template.questType === "Project" && <Folder className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h3 className={`font-bold text-base leading-tight truncate ${colorClass.text}`}>
                  {template.questName || "（名称未設定）"}
                </h3>
                {!template.isActive && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                    無効
                  </span>
                )}
                {isOneOffCompleted && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    完了 ({executedCount}/{quota})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm border ${colorClass.badge}`}>
                  {typeLabel}
                </span>
                {template.questType !== "Free" && template.questType !== "Relax" && template.questType !== "Project" && (
                  <span className={`text-[9px] font-bold border px-1 rounded-sm bg-white/80 ${isFix ? "text-sky-600 border-sky-200" : "text-fuchsia-600 border-fuchsia-200"}`}>
                    {executionLabel}
                  </span>
                )}
                {(template.projectName || template.parentProjectName) && (
                  <span className="text-xs text-muted-foreground truncate">
                    🏷️ {template.parentProjectName || template.projectName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* アクションボタン（常時表示） */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isOneOffCompleted && (
              <Button
                size="sm"
                variant="outline"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await toggleActive.mutateAsync({ templateId: template.id, isActive: true });
                    toast.success("ミッションを再開しました（回数をリセット）");
                    onToggle();
                  } catch {
                    toast.error("再開に失敗しました");
                  }
                }}
                className="h-8 text-xs px-2 text-orange-600 border-orange-300 bg-orange-50 hover:bg-orange-100 shadow-sm"
                title="カウントをリセットして再開"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> 再開
              </Button>
            )}

            <Button
              onClick={handleToggle}
              disabled={toggleActive.isPending}
              variant="outline"
              size="sm"
              className={`h-8 px-2.5 text-xs font-bold transition-all shadow-sm ${
                template.isActive
                  ? "text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400"
                  : "text-muted-foreground border-border bg-background hover:bg-muted"
              }`}
              title={template.isActive ? "クリックして無効にする" : "クリックして有効にする"}
            >
              {template.isActive ? (
                <>
                  <ToggleRight className="w-4 h-4 mr-1 text-emerald-600" />
                  有効
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 mr-1 text-muted-foreground" />
                  無効
                </>
              )}
            </Button>

            <Button
              onClick={() => setIsEditOpen(true)}
              variant="outline"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground bg-background shadow-sm hover:border-accent"
              title="編集"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>

            <Button
              onClick={handleDelete}
              disabled={deleteTemplate.isPending}
              variant="outline"
              size="icon"
              className="h-8 w-8 text-destructive/80 hover:text-destructive border-border hover:border-destructive/40 hover:bg-destructive/10 bg-background shadow-sm"
              title="削除"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5 bg-white/70 border border-border/40 px-2 py-0.5 rounded-md">
            <RefreshCw className="w-3 h-3 opacity-60" />
            <span>{getScheduleDescription()}</span>
            {template.frequency > 1 && template.questType !== "Free" && (
              <span className="ml-1 border-l pl-1.5 border-border/50">頻度: {template.frequency}回</span>
            )}
          </div>
          {template.scheduledHour != null && (
            <div className="flex items-center gap-1 bg-sky-100 text-sky-700 px-2 py-0.5 rounded-md font-medium border border-sky-200">
              🕐 {String(template.scheduledHour).padStart(2, '0')}:00
            </div>
          )}
        </div>
      </div>

      <TemplateEditDialog
        template={template}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onUpdated={onToggle}
      />
    </>
  );
}

// テンプレート編集ダイアログ
function TemplateEditDialog({ template, open, onOpenChange, onUpdated }: { template: any, open: boolean, onOpenChange: (open: boolean) => void, onUpdated: () => void }) {
  const parse = (json: string | null) => {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch { return []; }
  };

  // State Initialization
  const initialDays = parse(template.daysOfWeek);
  const initialWeeks = parse(template.weeksOfMonth);
  const initialDates = parse(template.datesOfMonth);

  // FIX Check: If any specific schedule is set, it's FIX.
  const isFix = initialDays.length > 0 || initialWeeks.length > 0 || initialDates.length > 0 || !!template.monthOfYear; // monthOfYear might be tricky, but usually implies fix logic.
  // Actually, Yearly with frequency only is valid.
  // Let's check logic:
  // If Weekly and daysOfWeek set -> FIX
  // If Monthly and (dates OR weeks) set -> FIX
  // If Yearly -> ??
  // User said: "FIX / NON-FIX is about period interpretation".
  // If user has frequency > 1 AND no dates => NON-FIX?
  // Let's assume defaults based on user's logic:
  // Default to FIX if any fix-params exist.
  // Exception: Yearly might have monthOfYear even for Non-Fix? "3 times in August".
  // Our schema `monthOfYear` is integer.

  const detectType = (): "FIX" | "NON-FIX" => {
    if (template.questType === "Weekly" && initialDays.length > 0) return "FIX";
    if (template.questType === "Monthly" && (initialDates.length > 0 || initialWeeks.length > 0)) return "FIX";
    if (template.questType === "Yearly" && (initialWeeks.length > 0 || initialDays.length > 0)) return "FIX";
    // Fallback
    return "NON-FIX";
  };

  const [executionType, setExecutionType] = useState<"FIX" | "NON-FIX">(template.id ? detectType() : "FIX"); // Default new to FIX? Or User preference? Principles say "after selecting Period". FIX seems safer default.

  const [questName, setQuestName] = useState(template.questName || "");
  const [projectName, setProjectName] = useState(template.projectName || "");
  const [questType, setQuestType] = useState<string>(template.questType);
  const [difficulty, setDifficulty] = useState<string>(template.difficulty);
  const [frequency, setFrequency] = useState<string>(template.frequency?.toString() || "1");

  // Multiple selection states
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(initialDays);
  const [weeksOfMonth, setWeeksOfMonth] = useState<string[]>(initialWeeks);
  const [datesOfMonth, setDatesOfMonth] = useState<string>(initialDates.join(", "));
  const [monthOfYear, setMonthOfYear] = useState<string>(template.monthOfYear?.toString() || "");
  const [scheduledHour, setScheduledHour] = useState<string>(
    template.scheduledHour != null ? String(template.scheduledHour) : "none"
  );

  const [isActive, setIsActive] = useState<boolean>(template.isActive !== false);

  const updateTemplate = trpc.template.update.useMutation();
  const deleteTemplate = trpc.template.delete.useMutation();

  const handleDelete = async () => {
    if (!confirm("本当にこのテンプレートを削除しますか？\n（この操作は取り消せません）")) return;

    try {
      await deleteTemplate.mutateAsync({ templateId: template.id });
      toast.success("テンプレートを削除しました");
      onOpenChange(false);
      onUpdated();
    } catch (error) {
      toast.error("削除に失敗しました");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Parse dates
      const parsedDates = datesOfMonth
        .split(/[,、\s]+/)
        .map(d => parseInt(d.trim()))
        .filter(n => !isNaN(n) && n >= 1 && n <= 31);

      // Data Cleaning based on Execution Type
      const isDaily = questType === "Daily";
      const isFix = !isDaily && executionType === "FIX";
      const isNonFix = !isDaily && executionType === "NON-FIX";

      const finalDays = (isFix && daysOfWeek.length > 0) ? daysOfWeek.map(d => parseInt(d)) : null;
      const finalWeeks = (isFix && weeksOfMonth.length > 0) ? weeksOfMonth.map(w => parseInt(w)) : null;
      const finalDates = (isFix && parsedDates.length > 0) ? parsedDates : null;
      const finalMonth = (isFix || questType === "Yearly") && monthOfYear ? parseInt(monthOfYear) : null;

      // Frequency logic
      let finalFrequency = 1;
      if (isNonFix || questType === "Free") {
        finalFrequency = parseInt(frequency) || 1;
      } else {
        finalFrequency = 1;
      }

      await updateTemplate.mutateAsync({
        templateId: template.id,
        questName: questName || null,
        projectName: projectName || null,
        questType: questType as any,
        difficulty: difficulty as any,
        frequency: finalFrequency,
        daysOfWeek: finalDays,
        weeksOfMonth: finalWeeks,
        datesOfMonth: finalDates,
        monthOfYear: finalMonth,
        scheduledHour: questType === "Daily" && scheduledHour !== "none" ? parseInt(scheduledHour) : null,
        isActive: isActive,
      });

      toast.success("テンプレートを更新しました");
      onOpenChange(false);
      onUpdated();
    } catch (error) {
      toast.error("テンプレートの更新に失敗しました");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 w-full max-w-[420px] max-h-[calc(100vh-2rem)] flex flex-col p-0 gap-0 overflow-hidden border border-border/50 bg-background/95 backdrop-blur-sm shadow-xl sm:rounded-xl z-50">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle className="text-accent text-xl">テンプレート編集</DialogTitle>
        </DialogHeader>

        <form id="template-edit-form" onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto px-6 py-2 min-h-0">
          {/* 有効/無効 スイッチ */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-card/60 border-border">
            <div>
              <div className="text-xs font-bold">有効化設定</div>
              <div className="text-[11px] text-muted-foreground">無効にするとホーム棚に表示されなくなります</div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsActive(!isActive)}
              className={`font-bold text-xs h-8 px-3 ${
                isActive ? "text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100" : "text-muted-foreground bg-muted/40"
              }`}
            >
              {isActive ? (
                <>
                  <ToggleRight className="w-4 h-4 mr-1 text-emerald-600" />
                  有効
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 mr-1 text-muted-foreground" />
                  無効
                </>
              )}
            </Button>
          </div>

          <div>
            <Label htmlFor="edit-questName" className="text-foreground">
              クエスト名（任意）
            </Label>
            <Input
              id="edit-questName"
              value={questName}
              onChange={(e) => setQuestName(e.target.value)}
              placeholder="何をするか"
              className="bg-input border-border"
            />
          </div>

          <div>
            <Label htmlFor="edit-projectName" className="text-foreground">
              案件名（任意）
            </Label>
            <Input
              id="edit-projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="例：MOAI活動、仕事、生活"
              className="bg-input border-border"
            />
          </div>

          <div>
            <Label htmlFor="edit-questType" className="text-foreground mb-2 block">
              種別 <span className="text-destructive">*</span>
            </Label>
            <Select value={questType} onValueChange={setQuestType}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">デイリー (Daily)</SelectItem>
                <SelectItem value="Weekly">ウィークリー (Weekly)</SelectItem>
                <SelectItem value="Monthly">マンスリー (Monthly)</SelectItem>
                <SelectItem value="Yearly">イヤリー (Yearly)</SelectItem>
                <SelectItem value="Free">ワンオフ (One-off / Free)</SelectItem>
                <SelectItem value="Relax">リラックス (Relax)</SelectItem>
                {template.questType === "Project" && <SelectItem value="Project">プロジェクト (Project)</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          {/* Daily: Time Scheduling */}
          {questType === "Daily" && (
            <div className="space-y-2 p-4 border rounded-md bg-sky-50/50 border-sky-100 animate-in fade-in">
              <Label className="text-foreground font-bold flex items-center gap-2">
                🕐 自動スケジュール時刻
                <span className="text-xs font-normal text-muted-foreground">（Beta）</span>
              </Label>
              <p className="text-xs text-muted-foreground">指定すると、この時間帯にTODAY PLANNINGへ自動紐付けされます。</p>
              <Select value={scheduledHour} onValueChange={setScheduledHour}>
                <SelectTrigger className="bg-white border-sky-200">
                  <SelectValue placeholder="時刻を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし（自動なし）</SelectItem>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {String(i).padStart(2, '0')}:00 〜 {String(i + 1).padStart(2, '0')}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {questType !== "Daily" && (
            <div className="space-y-3 p-4 border rounded-md bg-muted/20">
              <Label className="text-foreground font-bold">実行タイプ</Label>
              <RadioGroup value={executionType} onValueChange={(v) => setExecutionType(v as "FIX" | "NON-FIX")} className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="FIX" id="r-fix" />
                  <Label htmlFor="r-fix" className="cursor-pointer font-normal">日付・曜日固定 (FIX)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="NON-FIX" id="r-nonfix" />
                  <Label htmlFor="r-nonfix" className="cursor-pointer font-normal">回数指定 (NON-FIX)</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Difficulty - Always show? Or maybe grouped? Requirements didn't specify, keeping it. */}
          {/* Difficulty - Removed as per request */}
          {/* Defaulting to "1" is handled in state init */}
          <input type="hidden" />

          {/* DYNAMIC FIELDS START */}

          {/* NON-FIX: Frequency Input */}
          {(questType !== "Daily" && executionType === "NON-FIX") && (
            <div className="animate-in fade-in slide-in-from-top-1">
              <Label htmlFor="edit-frequency" className="text-foreground">
                回数 <span className="text-xs text-muted-foreground">（{questType === "Weekly" ? "週" : questType === "Monthly" ? "月" : "年"}に何回？）</span>
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="edit-frequency"
                  type="number"
                  min="1"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="bg-input border-border w-24"
                />
                <span className="text-sm text-muted-foreground">回</span>
              </div>
            </div>
          )}

          {/* FIX: Weekly Days */}
          {(questType === "Weekly" && executionType === "FIX") && (
            <div className="animate-in fade-in slide-in-from-top-1">
              <Label className="text-foreground mb-2 block">曜日の指定（複数可）</Label>
              <ToggleGroup type="multiple" value={daysOfWeek} onValueChange={setDaysOfWeek} variant="outline" className="justify-start flex-wrap gap-2">
                {SHORT_WEEKDAYS.map((name, index) => (
                  <ToggleGroupItem key={index} value={index.toString()} className="h-10 w-10 p-0 flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    {name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}

          {/* FIX: Monthly */}
          {(questType === "Monthly" && executionType === "FIX") && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-1">
              <div>
                <Label htmlFor="edit-dates" className="text-foreground">日付指定（カンマ区切り）</Label>
                <Input
                  id="edit-dates"
                  value={datesOfMonth}
                  onChange={(e) => setDatesOfMonth(e.target.value)}
                  placeholder="例: 1, 15, 30"
                  className="bg-input border-border mt-1"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">または</span>
                </div>
              </div>

              <div>
                <Label className="text-foreground mb-2 block">週・曜日の指定</Label>
                <div className="space-y-3">
                  <ToggleGroup type="multiple" value={weeksOfMonth} onValueChange={setWeeksOfMonth} variant="outline" className="justify-start flex-wrap gap-1">
                    {SHORT_WEEKS.map((name, index) => (
                      <ToggleGroupItem key={index} value={(index + 1).toString()} className="h-8 px-3 text-xs flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        {name}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <ToggleGroup type="multiple" value={daysOfWeek} onValueChange={setDaysOfWeek} variant="outline" className="justify-start flex-wrap gap-2">
                    {SHORT_WEEKDAYS.map((name, index) => (
                      <ToggleGroupItem key={index} value={index.toString()} className="h-9 w-9 p-0 flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        {name}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>
            </div>
          )}

          {/* FIX: Yearly */}
          {(questType === "Yearly" && executionType === "FIX") && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-1">
              <div>
                <Label htmlFor="edit-monthOfYear" className="text-foreground">月</Label>
                <Select value={monthOfYear} onValueChange={setMonthOfYear}>
                  <SelectTrigger className="bg-input border-border mt-1">
                    <SelectValue placeholder="月を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Yearly FIX usually implies specific Day/Week too or Date? 
                  Current schema supports monthOfYear + date/week/day logic implicitly if we fill them.
                  But let's keep it simple as per schema capabilities.
                  If the schema supports monthOfYear alone, it means "Once in that month (Non-Fix?)" or "First day of month (Fix?)"?
                  Actually db.ts logic: if Yearly, checks monthOfYear and dateNum===1.
                  So FIX Yearly = specific Month (1st day).
                  Wait, user might want "Yearly, December 25th".
                  The current UI for Yearly was: Month + (Week/Day).
                  If we want Date support for Yearly, we need `datesOfMonth` too?
                  Let's stick to previous UI elements for Yearly but gated by FIX.
              */}
              <div>
                <Label className="text-foreground mb-2 block">週・曜日の指定</Label>
                <div className="space-y-3">
                  <ToggleGroup type="multiple" value={weeksOfMonth} onValueChange={setWeeksOfMonth} variant="outline" className="justify-start flex-wrap gap-1">
                    {SHORT_WEEKS.map((name, index) => (
                      <ToggleGroupItem key={index} value={(index + 1).toString()} className="h-8 px-3 text-xs flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        {name}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <ToggleGroup type="multiple" value={daysOfWeek} onValueChange={setDaysOfWeek} variant="outline" className="justify-start flex-wrap gap-2">
                    {SHORT_WEEKDAYS.map((name, index) => (
                      <ToggleGroupItem key={index} value={index.toString()} className="h-9 w-9 p-0 flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        {name}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>
            </div>
          )}

        </form>

        <DialogFooter className="p-6 pt-4 border-t border-border/40 bg-background/50 backdrop-blur-sm shrink-0 z-10 w-full box-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            キャンセル
          </Button>
          <Button
            form="template-edit-form"
            type="submit"
            disabled={updateTemplate.isPending}
            className="btn-quest btn-quest-primary flex-1"
          >
            {updateTemplate.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Pencil className="w-4 h-4 mr-2" />
            )}
            保存
          </Button>
        </DialogFooter>
        <div className="p-6 pt-0 border-t border-transparent z-10 w-full box-border">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            disabled={deleteTemplate.isPending}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {deleteTemplate.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            このテンプレートを削除
          </Button>
        </div>
      </DialogContent >
    </Dialog >
  );
}

// テンプレート作成ダイアログ
function TemplateCreateDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [questName, setQuestName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [questType, setQuestType] = useState<string>("Daily");
  const [executionType, setExecutionType] = useState<"FIX" | "NON-FIX">("FIX");
  const [difficulty, setDifficulty] = useState<string>("1");
  const [frequency, setFrequency] = useState<string>("1");

  // Multiple selection states
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [weeksOfMonth, setWeeksOfMonth] = useState<string[]>([]);
  const [datesOfMonth, setDatesOfMonth] = useState<string>("");
  const [monthOfYear, setMonthOfYear] = useState<string>("");
  const [scheduledHour, setScheduledHour] = useState<string>("none");

  const createTemplate = trpc.template.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Parse dates
      const parsedDates = datesOfMonth
        .split(/[,、\s]+/)
        .map(d => parseInt(d.trim()))
        .filter(n => !isNaN(n) && n >= 1 && n <= 31);

      // Data Cleaning based on Execution Type
      const isDaily = questType === "Daily";
      const isFix = !isDaily && executionType === "FIX";
      const isNonFix = !isDaily && executionType === "NON-FIX";

      const finalDays = (isFix && daysOfWeek.length > 0) ? daysOfWeek.map(d => parseInt(d)) : null;
      const finalWeeks = (isFix && weeksOfMonth.length > 0) ? weeksOfMonth.map(w => parseInt(w)) : null;
      const finalDates = (isFix && parsedDates.length > 0) ? parsedDates : null;
      const finalMonth = (isFix || questType === "Yearly") && monthOfYear ? parseInt(monthOfYear) : null;

      let finalFrequency = 1;
      if (isNonFix) {
        finalFrequency = parseInt(frequency) || 1;
      }

      await createTemplate.mutateAsync({
        questName: questName || null,
        projectName: projectName || null,
        questType: questType as any,
        difficulty: difficulty as any,
        frequency: finalFrequency,
        daysOfWeek: finalDays,
        weeksOfMonth: finalWeeks,
        datesOfMonth: finalDates,
        monthOfYear: finalMonth,
        scheduledHour: questType === "Daily" && scheduledHour !== "none" ? parseInt(scheduledHour) : null,
      });

      toast.success("テンプレートを作成しました");
      setOpen(false);
      resetForm();
      onCreated();
    } catch (error) {
      toast.error("テンプレートの作成に失敗しました");
    }
  };

  const resetForm = () => {
    setQuestName("");
    setProjectName("");
    setQuestType("Daily");
    setExecutionType("FIX");
    setDifficulty("1");
    setFrequency("1");
    setDaysOfWeek([]);
    setWeeksOfMonth([]);
    setDatesOfMonth("");
    setMonthOfYear("");
    setScheduledHour("none");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-quest btn-quest-primary">
          <Plus className="w-4 h-4 mr-2" />
          新規テンプレート
        </Button>
      </DialogTrigger>
      {/* 
        Fixed Layout:
        - Force centered positioning to avoid browser/framework conflicts
        - Constrained max-height for mobile/small screens
        - Internal scrolling for form inputs
        - Fixed footer for action buttons
      */}
      <DialogContent className="fixed !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 w-full max-w-[420px] max-h-[calc(100vh-2rem)] flex flex-col p-0 gap-0 overflow-hidden border border-border/50 bg-background/95 backdrop-blur-sm shadow-xl sm:rounded-xl z-50">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle className="text-accent text-xl">テンプレート作成</DialogTitle>
        </DialogHeader>

        <form id="template-form" onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto px-6 py-2 min-h-0">
          <div>
            <Label htmlFor="questName" className="text-foreground">
              クエスト名（任意）
            </Label>
            <Input
              id="questName"
              value={questName}
              onChange={(e) => setQuestName(e.target.value)}
              placeholder="何をするか"
              className="bg-input border-border"
            />
          </div>

          <div>
            <Label htmlFor="projectName" className="text-foreground">
              案件名（任意）
            </Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="例：MOAI活動、仕事、生活"
              className="bg-input border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="questType" className="text-foreground">
                種別 <span className="text-destructive">*</span>
              </Label>
              <Select value={questType} onValueChange={setQuestType}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty Removed */}
            <input type="hidden" value="1" />
          </div>

          {/* Daily: Time Scheduling */}
          {questType === "Daily" && (
            <div className="space-y-2 p-4 border rounded-md bg-sky-50/50 border-sky-100 animate-in fade-in">
              <Label className="text-foreground font-bold flex items-center gap-2">
                🕐 自動スケジュール時刻
                <span className="text-xs font-normal text-muted-foreground">（Beta）</span>
              </Label>
              <p className="text-xs text-muted-foreground">指定すると、この時間帯にTODAY PLANNINGへ自動紐付けされます。</p>
              <Select value={scheduledHour} onValueChange={setScheduledHour}>
                <SelectTrigger className="bg-white border-sky-200">
                  <SelectValue placeholder="時刻を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし（自動なし）</SelectItem>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {String(i).padStart(2, '0')}:00 〜 {String(i + 1).padStart(2, '0')}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {questType !== "Daily" && (
            <div className="space-y-3 p-4 border rounded-md bg-muted/20">
              <Label className="text-foreground font-bold">実行タイプ</Label>
              <RadioGroup value={executionType} onValueChange={(v) => setExecutionType(v as "FIX" | "NON-FIX")} className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="FIX" id="r-fix-new" />
                  <Label htmlFor="r-fix-new" className="cursor-pointer font-normal">日付・曜日固定 (FIX)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="NON-FIX" id="r-nonfix-new" />
                  <Label htmlFor="r-nonfix-new" className="cursor-pointer font-normal">回数指定 (NON-FIX)</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* NON-FIX: Frequency Input */}
          {(questType !== "Daily" && executionType === "NON-FIX") && (
            <div className="animate-in fade-in slide-in-from-top-1">
              <Label htmlFor="frequency" className="text-foreground">
                回数 <span className="text-xs text-muted-foreground">（{questType === "Weekly" ? "週" : questType === "Monthly" ? "月" : "年"}に何回？）</span>
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="frequency"
                  type="number"
                  min="1"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="bg-input border-border w-24"
                />
                <span className="text-sm text-muted-foreground">回</span>
              </div>
            </div>
          )}

          {/* Weekly: 曜日選択 (FIX Only) */}
          {(questType === "Weekly" && executionType === "FIX") && (
            <div className="animate-in fade-in slide-in-from-top-1">
              <Label className="text-foreground mb-2 block">曜日の指定（複数可）</Label>
              <ToggleGroup type="multiple" value={daysOfWeek} onValueChange={setDaysOfWeek} variant="outline" className="justify-start flex-wrap">
                {SHORT_WEEKDAYS.map((name, index) => (
                  <ToggleGroupItem key={index} value={index.toString()} className="h-9 w-9 p-0 flex-1">
                    {name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="text-xs text-muted-foreground mt-1">※指定なし＝毎日対象</p>
            </div>
          )}

          {/* Monthly: 日付 or 週/曜日 (FIX Only) */}
          {(questType === "Monthly" && executionType === "FIX") && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
              <div>
                <Label htmlFor="dates" className="text-foreground">日付指定（カンマ区切り）</Label>
                <Input
                  id="dates"
                  value={datesOfMonth}
                  onChange={(e) => setDatesOfMonth(e.target.value)}
                  placeholder="例: 1, 15, 30"
                  className="bg-input border-border"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">または</span>
                </div>
              </div>

              <div>
                <Label className="text-foreground mb-2 block">週・曜日の指定</Label>
                <div className="space-y-2">
                  <ToggleGroup type="multiple" value={weeksOfMonth} onValueChange={setWeeksOfMonth} variant="outline" className="justify-start flex-wrap">
                    {SHORT_WEEKS.map((name, index) => (
                      <ToggleGroupItem key={index} value={(index + 1).toString()} className="h-8 px-2 text-xs flex-1">
                        {name}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <ToggleGroup type="multiple" value={daysOfWeek} onValueChange={setDaysOfWeek} variant="outline" className="justify-start flex-wrap">
                    {SHORT_WEEKDAYS.map((name, index) => (
                      <ToggleGroupItem key={index} value={index.toString()} className="h-8 w-8 p-0 flex-1">
                        {name}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>
            </div>
          )}

          {/* Yearly (FIX Only) */}
          {(questType === "Yearly" && executionType === "FIX") && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
              <div>
                <Label htmlFor="monthOfYear" className="text-foreground">月</Label>
                <Select value={monthOfYear} onValueChange={setMonthOfYear}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="月を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground mb-2 block">週・曜日の指定</Label>
                <div className="space-y-2">
                  <ToggleGroup type="multiple" value={weeksOfMonth} onValueChange={setWeeksOfMonth} variant="outline" className="justify-start flex-wrap">
                    {SHORT_WEEKS.map((name, index) => (
                      <ToggleGroupItem key={index} value={(index + 1).toString()} className="h-8 px-2 text-xs flex-1">
                        {name}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <ToggleGroup type="multiple" value={daysOfWeek} onValueChange={setDaysOfWeek} variant="outline" className="justify-start flex-wrap">
                    {SHORT_WEEKDAYS.map((name, index) => (
                      <ToggleGroupItem key={index} value={index.toString()} className="h-8 w-8 px-0 flex-1">
                        {name}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>
            </div>
          )}

        </form>

        <DialogFooter className="p-6 pt-4 border-t border-border/40 bg-background/50 backdrop-blur-sm shrink-0 z-10 w-full box-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            キャンセル
          </Button>
          <Button
            form="template-form"
            type="submit"
            disabled={createTemplate.isPending}
            className="btn-quest btn-quest-primary flex-1"
          >
            {createTemplate.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            作成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Templates() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  // テンプレートデータ取得
  const { data: templates, isLoading: templatesLoading, refetch: refetchTemplates } = trpc.template.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const counts = useMemo(() => {
    if (!templates) return { total: 0, active: 0, inactive: 0, daily: 0, weekly: 0, monthly: 0, free: 0, relax: 0, project: 0 };
    return {
      total: templates.length,
      active: templates.filter(t => t.isActive).length,
      inactive: templates.filter(t => !t.isActive).length,
      daily: templates.filter(t => t.questType === 'Daily').length,
      weekly: templates.filter(t => t.questType === 'Weekly').length,
      monthly: templates.filter(t => t.questType === 'Monthly' || t.questType === 'Yearly').length,
      free: templates.filter(t => t.questType === 'Free').length,
      relax: templates.filter(t => t.questType === 'Relax').length,
      project: templates.filter(t => t.questType === 'Project').length,
    };
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter(t => {
      // 検索フィルター
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = t.questName?.toLowerCase().includes(q);
        const matchProj = t.projectName?.toLowerCase().includes(q) || t.parentProjectName?.toLowerCase().includes(q);
        if (!matchName && !matchProj) return false;
      }
      // ステータスフィルター
      if (statusFilter === 'active' && !t.isActive) return false;
      if (statusFilter === 'inactive' && t.isActive) return false;
      // カテゴリーフィルター
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'Monthly') {
          if (t.questType !== 'Monthly' && t.questType !== 'Yearly') return false;
        } else if (t.questType !== categoryFilter) {
          return false;
        }
      }
      return true;
    });
  }, [templates, searchTerm, statusFilter, categoryFilter]);

  const CATEGORIES = [
    { key: "Daily", label: "デイリー", icon: "☀️", count: counts.daily, desc: "毎日自動スケジュール・実行", items: filteredTemplates.filter(t => t.questType === "Daily") },
    { key: "Weekly", label: "ウィークリー", icon: "📅", count: counts.weekly, desc: "指定曜日・週次ミッション", items: filteredTemplates.filter(t => t.questType === "Weekly") },
    { key: "Monthly", label: "マンスリー / イヤリー", icon: "🗓️", count: counts.monthly, desc: "定期月次・年次ミッション", items: filteredTemplates.filter(t => t.questType === "Monthly" || t.questType === "Yearly") },
    { key: "Free", label: "ワンオフ (One-off)", icon: "🎯", count: counts.free, desc: "随時実行・目標回数プール", items: filteredTemplates.filter(t => t.questType === "Free") },
    { key: "Relax", label: "リラックス (Relax)", icon: "🌿", count: counts.relax, desc: "息抜き・回復ミッション", items: filteredTemplates.filter(t => t.questType === "Relax") },
    { key: "Project", label: "プロジェクト (Project)", icon: "📁", count: counts.project, desc: "特定案件のミッション", items: filteredTemplates.filter(t => t.questType === "Project") },
  ];

  // ローディング
  if (authLoading || templatesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen texture-overlay pb-16">
      {/* ヘッダー */}
      <header className="border-b border-border/50 bg-card/70 backdrop-blur-md sticky top-0 z-40">
        <div className="container max-w-5xl py-3.5 px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => window.location.href = "/"}
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-9 w-9"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                  <Scroll className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-bold text-accent leading-none">クエストテンプレート</h1>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-muted text-muted-foreground">
                      全{counts.total}件
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    定期タスク・プールミッションの自動生成と管理
                  </p>
                </div>
              </div>
            </div>

            <TemplateCreateDialog onCreated={refetchTemplates} />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container max-w-5xl py-6 px-4 sm:px-6 space-y-6">
        {/* コントロールバー: 検索 & ステータスタブ */}
        <div className="space-y-3 bg-card/40 backdrop-blur-sm border border-border/60 rounded-xl p-3 sm:p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* 検索入力 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="テンプレート名・案件名で検索..."
                className="pl-9 pr-8 bg-background border-border text-sm h-9"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* ステータス切り替えタブ */}
            <div className="flex rounded-lg border border-border bg-background p-1 text-xs shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  statusFilter === "all"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                すべて ({counts.total})
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  statusFilter === "active"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                有効 ({counts.active})
              </button>
              <button
                onClick={() => setStatusFilter("inactive")}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  statusFilter === "inactive"
                    ? "bg-muted-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                無効 ({counts.inactive})
              </button>
            </div>
          </div>

          {/* カテゴリー別フィルタータブ */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 -mx-1 px-1 custom-scrollbar text-xs">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all border ${
                categoryFilter === "all"
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-background/80 text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              全カテゴリー ({counts.total})
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCategoryFilter(cat.key)}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                  categoryFilter === cat.key
                    ? "bg-foreground text-background border-foreground shadow-sm"
                    : "bg-background/80 text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${categoryFilter === cat.key ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"}`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* テンプレート表示エリア */}
        {filteredTemplates.length === 0 ? (
          <div className="quest-frame p-8 text-center bg-card/40 rounded-xl border border-border/60">
            <Scroll className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
            <h3 className="font-bold text-foreground mb-1">該当するテンプレートがありません</h3>
            <p className="text-xs text-muted-foreground mb-4">
              検索条件またはフィルターを変更してお試しください
            </p>
            {(searchTerm || statusFilter !== "all" || categoryFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                }}
                className="text-xs"
              >
                フィルターをリセット
              </Button>
            )}
          </div>
        ) : categoryFilter === "all" ? (
          // 全カテゴリー選択時: セクションごとに整理して表示
          <div className="space-y-8">
            {CATEGORIES.filter(cat => cat.items.length > 0).map(cat => (
              <section key={cat.key} className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.icon}</span>
                    <h2 className="text-sm font-bold text-foreground tracking-wide">{cat.label}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-muted text-muted-foreground">
                      {cat.items.length}件
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:inline">{cat.desc}</span>
                </div>

                <div className="space-y-2.5">
                  {cat.items.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onToggle={refetchTemplates}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          // 単一カテゴリー選択時: 直接リスト表示
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
              <span>{filteredTemplates.length}件のテンプレート</span>
            </div>
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onToggle={refetchTemplates}
              />
            ))}
          </div>
        )}

        {/* 説明カード */}
        <div className="quest-frame p-4 mt-8 bg-card/30 border border-border/50 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-xl">📋</span>
            <div className="text-xs space-y-1">
              <h3 className="font-bold text-foreground">テンプレートの運用について</h3>
              <p className="text-muted-foreground leading-relaxed">
                ・<strong>有効 / 無効</strong>: 「無効」にしたテンプレートは、ホーム画面の各棚（FIX、Non-FIX Pool、One-off、Relax）から自動的に除外されます。<br />
                ・<strong>削除</strong>: 不要になったテンプレートはカード右上のゴミ箱アイコンからいつでも削除できます。<br />
                ・<strong>ワンオフの再開</strong>: 目標回数を達成したワンオフミッションは「再開」ボタンを押すことで、再度ホームの棚で受注できるようになります。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
