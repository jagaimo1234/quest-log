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
import { useState } from "react";
import { Loader2, Scroll, Plus, ArrowLeft, Swords, Calendar, ToggleLeft, ToggleRight, Pencil, Trash2, RefreshCw } from "lucide-react";
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
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleToggle = async () => {
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

  // FIX判定: Daily または 日付・曜日などの指定がある場合
  // NON-FIX: 上記指定がなく、回数指定のみの場合
  let isFix = false;
  if (template.questType === "Daily") {
    isFix = true;
  } else if (days.length > 0 || weeks.length > 0 || dates.length > 0 || template.monthOfYear) {
    isFix = true;
  } else {
    isFix = false;
  }

  // カラー設定
  // FIX: Sky (水色)
  // NON-FIX: Fuchsia (ピンク)
  const colorClass = isFix
    ? { border: "border-sky-200", bg: "bg-sky-50 hover:bg-sky-100", icon: "text-sky-600 bg-sky-100", text: "text-sky-900", label: "text-sky-600 bg-sky-100" }
    : { border: "border-fuchsia-200", bg: "bg-fuchsia-50 hover:bg-fuchsia-100", icon: "text-fuchsia-600 bg-fuchsia-100", text: "text-fuchsia-900", label: "text-fuchsia-600 bg-fuchsia-100" };

  const typeLabel = QUEST_TYPE_LABELS[template.questType] || template.questType;
  const executionLabel = isFix ? "FIX" : "NON-FIX";


  const getScheduleDescription = () => {
    switch (template.questType) {
      case "Daily":
        return "毎日";
      case "Weekly":
        if (days.length > 0) {
          const dayNames = days.map(d => SHORT_WEEKDAYS[d]).join("・");
          return `${dayNames}`;
        }
        return `週${template.frequency}回`;
      case "Monthly":
        let parts = [];
        if (dates.length > 0) parts.push(`${dates.join("・")}日`);
        if (weeks.length > 0) {
          const w = weeks.map(n => SHORT_WEEKS[n - 1]).join("・");
          const d = days.length > 0 ? days.map(n => SHORT_WEEKDAYS[n]).join("・") : "全日";
          parts.push(`${w}${d}`);
        }
        if (parts.length === 0) return `月${template.frequency}回`;
        return `${parts.join(" / ")}`;
      case "Yearly":
        const m = template.monthOfYear ? `${template.monthOfYear}月` : "";
        if (!m) return `年${template.frequency}回`;
        return `${m}`;
      default:
        return "";
    }
  };

  return (
    <>
      <div className={`border rounded-xl p-4 shadow-sm group hover:shadow-md transition-all ${colorClass.border} ${colorClass.bg} ${!template.isActive ? "opacity-60 grayscale" : ""}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white ${isFix ? "text-sky-600" : "text-fuchsia-600"}`}>
              {template.questType === "Daily" && <RefreshCw className="w-5 h-5" />}
              {template.questType === "Weekly" && <Calendar className="w-5 h-5" />}
              {template.questType === "Monthly" && <Calendar className="w-5 h-5" />}
              {template.questType === "Yearly" && <Calendar className="w-5 h-5" />}
            </div>
            <div>
              <h3 className={`font-bold text-base leading-tight mb-0.5 ${colorClass.text}`}>
                {template.questName || "（名称未設定）"}
              </h3>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-white/50 ${isFix ? "text-sky-700" : "text-fuchsia-700"}`}>
                  {typeLabel}
                </span>
                <span className={`text-[9px] font-bold border px-1 rounded-sm bg-white ${isFix ? "text-sky-400 border-sky-200" : "text-fuchsia-400 border-fuchsia-200"}`}>
                  {executionLabel}
                </span>
                {template.projectName && (
                  <span className="text-xs text-muted-foreground">
                    {template.projectName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              onClick={handleToggle}
              disabled={toggleActive.isPending}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title={template.isActive ? "無効にする" : "有効にする"}
            >
              {template.isActive ? (
                <ToggleRight className="w-5 h-5 text-green-600" />
              ) : (
                <ToggleLeft className="w-5 h-5" />
              )}
            </Button>
            <Button
              onClick={() => setIsEditOpen(true)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
            <RefreshCw className="w-3.5 h-3.5 opacity-70" />
            <span>{getScheduleDescription()}</span>
            {template.frequency > 1 && (
              <span className="ml-1 border-l pl-2 border-border/50">頻度: {template.frequency}回</span>
            )}
          </div>
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
      // Note: Yearly usually needs month even for Non-Fix? "3 times in August".
      // If user wants "3 times a year (any month)", then month is null.
      // If user wants "3 times in August", month is 8.
      // Current UI for Yearly only shows Month selector in FIX block (in my previous edit).
      // If user selects NON-FIX, they see Frequency. They don't see Month selector.
      // So Yearly NON-FIX means "Anytime in the year".
      // If we want "Frequency in specific month", we'd need Month selector in NON-FIX too.
      // But adhering to "Simple Logic":
      // FIX = Specific Day/Date.
      // NON-FIX = Frequency only.
      // So Yearly NON-FIX = Frequency per Year.

      // Frequency logic
      let finalFrequency = 1;
      if (isNonFix) {
        finalFrequency = parseInt(frequency) || 1;
      } else {
        // If FIX, frequency is ignored/default(1).
        // Or maybe we want to allow "2 times on Monday"? (e.g. Morning/Evening).
        // "FIX / NON-FIX separation" implies FIX determines timing fully.
        // Let's force frequency to 1 for FIX to avoid ambiguity.
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

        <form id="template-edit-form" onSubmit={handleSubmit} className="space-y-6 flex-1 overflow-y-auto px-6 py-2 min-h-0">
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
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="Yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

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

  // 未認証時


  // ローディング
  if (authLoading || templatesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen texture-overlay">
      {/* ヘッダー */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container py-4">
          <div className="flex items-center justify-between">
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
                <Scroll className="w-6 h-6 text-accent" />
                <div>
                  <h1 className="text-xl font-bold text-accent">クエストテンプレート</h1>
                  <p className="text-sm text-muted-foreground">
                    定期クエストの自動生成設定
                  </p>
                </div>
              </div>
            </div>

            <TemplateCreateDialog onCreated={refetchTemplates} />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container py-6">
        {templates?.filter(t => t.questType !== "Project").length === 0 ? (
          <div className="quest-frame p-8 text-center">
            <div className="quest-frame-corner top-left" />
            <div className="quest-frame-corner top-right" />
            <div className="quest-frame-corner bottom-left" />
            <div className="quest-frame-corner bottom-right" />

            <Scroll className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              テンプレートがありません
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              テンプレートを作成すると、<br />
              定期的にクエストが自動生成されます
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates?.filter(t => t.questType !== "Project").map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onToggle={refetchTemplates}
              />
            ))}
          </div>
        )}

        {/* 説明 */}
        <div className="quest-frame p-4 mt-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h3 className="font-bold text-accent mb-1">テンプレートについて</h3>
              <p className="text-sm text-muted-foreground">
                テンプレートを設定すると、指定したタイミングで自動的にクエストが生成されます。
                デイリーは毎日、ウィークリーは指定曜日、マンスリーは指定週、イヤリーは指定月の指定週に生成されます。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
