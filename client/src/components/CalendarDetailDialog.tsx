import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CheckCircle2, Circle, Clock, PauseCircle } from "lucide-react";

export type CalendarEvent = {
    id: string; // "template-1" or "quest-10"
    title: string;
    type: "Daily" | "Weekly" | "Monthly" | "Yearly" | "Free";
    source: "template" | "quest";
    status: "completed" | "incomplete" | "aborted" | "planned";
    colorClass: string;
};

interface CalendarDetailDialogProps {
    date: Date | null;
    events: CalendarEvent[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CalendarDetailDialog({ date, events, open, onOpenChange }: CalendarDetailDialogProps) {
    if (!date) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] card-soft border-0 shadow-2xl p-6">
                <DialogHeader className="pb-4 border-b border-border/10">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        {format(date, "M月d日 (E)", { locale: ja })}
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                            {events.length}件の予定
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
                    {events.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            予定はありません
                        </div>
                    ) : (
                        events.map((event) => {
                            // Status Logic for UI
                            const isCompleted = event.status === "completed";
                            const isAborted = event.status === "aborted";
                            const isIncomplete = event.status === "incomplete";

                            // Opacity Control
                            let opacityClass = "opacity-100";
                            if (isCompleted) opacityClass = "opacity-80";
                            if (isAborted) opacityClass = "opacity-60";

                            // Icon Selection
                            let StatusIcon = Circle;
                            let iconColor = "text-muted-foreground/30"; // Default Planned

                            if (isCompleted) {
                                StatusIcon = CheckCircle2;
                                iconColor = "text-current"; // Use text color of card (which is dark for light bg)
                            } else if (isAborted) {
                                StatusIcon = PauseCircle;
                                iconColor = "text-current";
                            } else if (isIncomplete) {
                                StatusIcon = Clock;
                                iconColor = "text-current";
                            }

                            return (
                                <div key={event.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${event.colorClass} ${opacityClass}`}>
                                    <div className={`shrink-0 ${iconColor}`}>
                                        <StatusIcon className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`font-medium truncate ${isAborted || isCompleted ? "" : ""}`}>
                                                {event.title}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Tag is now Attribute Only - Neutral Style */}
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal bg-background/20 border-current/20 text-current">
                                                {event.type}
                                            </Badge>
                                            {event.source === "template" && (
                                                <span className="text-[10px] opacity-70">自動生成</span>
                                            )}
                                            {isAborted && (
                                                <span className="text-[10px] font-bold opacity-80">中止</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
