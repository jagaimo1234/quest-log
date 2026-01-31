import { useState, useMemo } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, getDate, getDay, getWeekOfMonth, isBefore, isAfter, startOfDay, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, CheckCircle2, Circle, Clock, PauseCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CalendarDetailDialog, type CalendarEvent } from "./CalendarDetailDialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// Days of week for header
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// Color Definitions - SOURCE ONLY
// Text set to slate-900 (Black) for high contrast on pastel backgrounds
const COLORS = {
    Manual: "bg-orange-500/20 text-slate-900 border-orange-500/30",
    Relax: "bg-emerald-500/20 text-slate-900 border-emerald-500/30",
    Template: "bg-sky-500/20 text-slate-900 border-sky-500/30",
    NonFix: "bg-fuchsia-500/20 text-slate-900 border-fuchsia-500/30",
    Project: "bg-indigo-500/20 text-slate-900 border-indigo-500/30",
    Incomplete: "bg-rose-500/10 text-slate-900 border-rose-500/10",
};

type ViewMode = 'month' | 'week' | 'day';

export function CalendarView() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // Range for History Fetching
    // Calculate range based on ViewMode
    const getRange = () => {
        let start: Date, end: Date;
        if (viewMode === 'month') {
            start = startOfWeek(startOfMonth(currentDate));
            end = endOfWeek(endOfMonth(currentDate));
        } else if (viewMode === 'week') {
            start = startOfWeek(currentDate);
            end = endOfWeek(currentDate);
        } else { // day
            start = startOfDay(currentDate);
            end = endOfWeek(currentDate); // Fetch a week around it just in case? Or just the day?
            // Fetching just the day is fine, but for consistency lets fetch the day.
            end = start; // same day
        }
        return { start, end };
    };

    const range = getRange();
    const queryStart = format(range.start, 'yyyy-MM-dd');
    const queryEnd = format(range.end, 'yyyy-MM-dd');

    // Fetch data
    const { data: templates, isLoading: loadingTemplates } = trpc.template.list.useQuery();
    const { data: activeQuests, isLoading: loadingQuests } = trpc.quest.list.useQuery();
    const { data: history, isLoading: loadingHistory } = trpc.history.list.useQuery({
        startDate: queryStart,
        endDate: queryEnd
    });

    // Navigation
    const navigate = (direction: 'prev' | 'next') => {
        const modifier = direction === 'prev' ? -1 : 1;
        if (viewMode === 'month') setCurrentDate(d => addMonths(d, modifier));
        else if (viewMode === 'week') setCurrentDate(d => addWeeks(d, modifier));
        else setCurrentDate(d => addDays(d, modifier));
    };

    const goToToday = () => setCurrentDate(new Date());

    // Generate Calendar Grid
    const calendarDays = useMemo(() => {
        let start: Date, end: Date;
        if (viewMode === 'month') {
            start = startOfWeek(startOfMonth(currentDate));
            end = endOfWeek(endOfMonth(currentDate));
        } else if (viewMode === 'week') {
            start = startOfWeek(currentDate);
            end = endOfWeek(currentDate);
        } else { // Day
            start = startOfDay(currentDate);
            end = startOfDay(currentDate);
        }
        return eachDayOfInterval({ start, end });
    }, [currentDate, viewMode]);

    // NON-FIX Check Helper
    const isNonFix = (templateId: number | null | undefined) => {
        if (!templateId || !templates) return false;
        const t = templates.find(tp => tp.id === templateId);
        if (!t) return false;
        // Pool Logic
        const isWeeklyPool = t.questType === "Weekly" && (!t.daysOfWeek || JSON.parse(t.daysOfWeek).length === 0);
        const isMonthlyPool = t.questType === "Monthly" && (!t.datesOfMonth || JSON.parse(t.datesOfMonth).length === 0) && (!t.weeksOfMonth || JSON.parse(t.weeksOfMonth).length === 0);
        return isWeeklyPool || isMonthlyPool;
    };

    // Check Source Color Helper
    const getSourceColor = (templateId: number | null | undefined): string => {
        const isTemplate = !!templateId;
        const isPool = isNonFix(templateId);

        // Template based
        if (isTemplate) {
            const t = templates?.find(tp => tp.id === templateId);
            if (t?.questType === "Relax") return COLORS.Relax;
            if (t?.questType === "Project") return COLORS.Project;
            if (isPool) return COLORS.NonFix;
            return COLORS.Template;
        }
        // Manual / One-off
        return COLORS.Manual;
    };

    // Project Templates to Events
    const getEventsForDate = (date: Date): CalendarEvent[] => {
        if (!templates) return [];

        const events: CalendarEvent[] = [];
        const dateNum = getDate(date);
        const dayNum = getDay(date); // 0-6
        const weekNum = getWeekOfMonth(date);
        const today = startOfDay(new Date());
        const isPast = isBefore(date, today);
        const isToday = isSameDay(date, today);
        const checkDate = format(date, 'yyyy-MM-dd');

        // 1. History
        const dayHistory = history?.filter(h => h.recordedDate === checkDate) || [];
        dayHistory.forEach(h => {
            let status: CalendarEvent['status'] = "completed";
            if (h.finalStatus === "cancelled" || h.finalStatus === "paused") status = "aborted";
            else if (h.finalStatus === "incomplete") status = "incomplete";

            events.push({
                id: `hist-${h.id}`,
                title: h.questName || "Unnamed",
                type: h.questType as any,
                source: h.templateId ? "template" : "quest",
                status: status,
                colorClass: getSourceColor(h.templateId),
            });
        });

        // 2. Templates
        templates.forEach(t => {
            let shouldOccur = false;
            const isPool = isNonFix(t.id);
            if (isBefore(date, startOfDay(new Date(t.createdAt)))) return;
            if (isPool) return;

            if (t.questType === "Daily") shouldOccur = true;
            else if (t.questType === "Weekly") {
                const days = t.daysOfWeek ? JSON.parse(t.daysOfWeek) : [];
                if (days.includes(dayNum)) shouldOccur = true;
            }
            else if (t.questType === "Monthly") {
                const dates = t.datesOfMonth ? JSON.parse(t.datesOfMonth) : [];
                const weeks = t.weeksOfMonth ? JSON.parse(t.weeksOfMonth) : [];
                const days = t.daysOfWeek ? JSON.parse(t.daysOfWeek) : [];
                if (dates.length > 0) {
                    if (dates.includes(dateNum)) shouldOccur = true;
                } else if (weeks.length > 0) {
                    if (weeks.includes(weekNum) && (days.length === 0 || days.includes(dayNum))) shouldOccur = true;
                } else {
                    if (dateNum === 1) shouldOccur = true;
                }
            }
            else if (t.questType === "Yearly") {
                if (t.monthOfYear === currentDate.getMonth() + 1 && dateNum === 1) shouldOccur = true;
            }
            else if (t.questType === "Project") {
                // Check validity range
                if (t.startDate && t.endDate) {
                    const start = new Date(t.startDate);
                    const end = new Date(t.endDate);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);

                    if ((isAfter(date, start) || isSameDay(date, start)) && (isBefore(date, end) || isSameDay(date, end))) {
                        // Check periodicity
                        const days = t.daysOfWeek ? JSON.parse(t.daysOfWeek) : [];
                        if (days.length === 0) {
                            // No specific days = Anytime? or Daily?
                            // Let's assume Daily for availability if no days specified
                            shouldOccur = true;
                        } else {
                            if (days.includes(dayNum)) shouldOccur = true;
                        }
                    }
                }
            }

            if (shouldOccur) {
                const alreadyDone = dayHistory.some(h => h.templateId === t.id);
                if (!alreadyDone) {
                    const alreadyActive = activeQuests?.some(q => {
                        if (q.templateId !== t.id) return false;
                        const intention = new Date(q.acceptedAt || q.startDate || q.createdAt);
                        return isSameDay(intention, date);
                    });

                    if (!alreadyActive) {
                        let status: CalendarEvent['status'] = "planned";
                        if (isPast) status = "incomplete";
                        events.push({
                            id: `plan-${t.id}-${checkDate}`,
                            title: t.questName || "Unnamed",
                            type: t.questType as any,
                            source: "template",
                            status: status,
                            colorClass: getSourceColor(t.id)
                        });
                    }
                }
            }
        });

        // 3. Active Quests
        activeQuests?.forEach(q => {
            const intentionDate = new Date(q.acceptedAt || q.startDate || q.createdAt);
            if (isSameDay(intentionDate, date)) {
                const doneInHistory = dayHistory.some(h => h.questId === q.id);
                if (doneInHistory) return;

                let status: CalendarEvent['status'] = "planned";
                if (isPast) status = "incomplete";

                events.push({
                    id: `active-${q.id}`,
                    title: q.questName || "Unnamed",
                    type: q.questType as any,
                    source: "quest",
                    status: status,
                    colorClass: getSourceColor(q.templateId)
                });
            }
        });

        return events;
    };

    const handleDateClick = (date: Date) => {
        if (viewMode === 'month') {
            setSelectedDate(date);
            setDetailOpen(true);
        } else {
            // In Week/Day mode, maybe clicking opens detail too? Or maybe it's just edit?
            // Let's keep consistency.
            setSelectedDate(date);
            setDetailOpen(true);
        }
    };

    if (loadingTemplates || loadingQuests || loadingHistory) {
        return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
    }

    const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

    // Layout specific classes
    const gridClass = viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7';
    const cellMinHeight = viewMode === 'month' ? 'min-h-[80px]' : viewMode === 'week' ? 'min-h-[300px]' : 'min-h-[500px]';

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-accent" />
                    {format(currentDate, viewMode === 'month' ? "yyyy年 M月" : viewMode === 'week' ? "M月d日〜" : "M月d日 (E)", { locale: ja })}
                </h2>

                <div className="flex items-center gap-2">
                    <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                        <SelectTrigger className="w-[100px] h-8 text-xs">
                            <SelectValue placeholder="Display" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="month">Month</SelectItem>
                            <SelectItem value="week">Week</SelectItem>
                            <SelectItem value="day">Day</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1 ml-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate('prev')} className="h-8 w-8 rounded-full">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs font-medium h-8 rounded-full px-3">
                            今日
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate('next')} className="h-8 w-8 rounded-full">
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Weekday Header (Hide in Day view?) */}
            {viewMode !== 'day' && (
                <div className={`grid ${gridClass} gap-1 mb-2`}>
                    {WEEKDAYS.map((day, i) => (
                        <div key={day} className={`text-center text-[10px] font-medium py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"}`}>
                            {day}
                        </div>
                    ))}
                </div>
            )}

            <div className={`grid ${gridClass} gap-1 auto-rows-fr`}>
                {calendarDays.map((date, i) => {
                    const isCurrentMonth = isSameMonth(date, currentDate);
                    const isToday = isSameDay(date, new Date());
                    const events = getEventsForDate(date);

                    // In Month view: Slice to 3. In Week/Day: Show all.
                    const displayEvents = viewMode === 'month' ? events.slice(0, 3) : events;

                    return (
                        <div
                            key={date.toISOString()}
                            onClick={() => handleDateClick(date)}
                            className={`
                        ${cellMinHeight} p-1 rounded-lg border transition-colors cursor-pointer relative group flex flex-col gap-0.5
                        ${viewMode === 'day' ? "bg-card/40 border-border/30" : isCurrentMonth ? "bg-card/40 border-border/30 hover:bg-card/80" : "bg-card/10 border-transparent opacity-50"}
                        ${isToday ? "!border-primary/50 !bg-primary/5" : ""}
                    `}
                        >
                            {/* Date Label */}
                            <div className={`text-[10px] text-center mb-0.5 ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>
                                {viewMode === 'day' ? format(date, "M/d (E)", { locale: ja }) : format(date, "d")}
                            </div>

                            <div className="flex-1 flex flex-col gap-1 px-1 overflow-auto">
                                {displayEvents.map(event => {
                                    const isCompleted = event.status === "completed";
                                    const isAborted = event.status === "aborted";
                                    const isIncomplete = event.status === "incomplete";
                                    let opacityClass = isCompleted ? "opacity-80" : isAborted ? "opacity-60" : "opacity-100";

                                    // Icons
                                    let StatusIcon = null;
                                    if (isCompleted) StatusIcon = CheckCircle2;
                                    else if (isAborted) StatusIcon = PauseCircle;
                                    else if (isIncomplete) StatusIcon = Clock;

                                    // Font Size scaling
                                    const textSize = viewMode === 'month' ? 'text-[9px]' : 'text-xs';
                                    const padding = viewMode === 'month' ? 'px-1.5 py-0.5' : 'px-3 py-2';

                                    return (
                                        <div
                                            key={event.id}
                                            className={`${textSize} ${padding} rounded border truncate transition-all flex items-center gap-1 ${event.colorClass} ${opacityClass}`}
                                        >
                                            {StatusIcon && <StatusIcon className="w-3 h-3 shrink-0" />}
                                            <span className="truncate">{event.title}</span>
                                        </div>
                                    );
                                })}
                                {viewMode === 'month' && events.length > 3 && (
                                    <div className="text-[9px] text-center text-muted-foreground font-medium mt-auto">
                                        +{events.length - 3}
                                    </div>
                                )}
                                {events.length === 0 && viewMode !== 'month' && (
                                    <div className="flex items-center justify-center flex-1 opacity-20">
                                        <span className="text-xs italic">No Plan</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <CalendarDetailDialog
                open={detailOpen}
                onOpenChange={setDetailOpen}
                date={selectedDate}
                events={selectedEvents}
            />
        </div>
    );
}
