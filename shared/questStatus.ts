/**
 * Quest status definitions and positive language
 * Focus on recording actions and states, not evaluation
 */

export type QuestStatus = 
  | "unreceived"    // 未受注 - Not yet accepted
  | "accepted"      // 受注中 - Accepted, ready to start
  | "challenging"   // チャレンジ中 - In progress, actively challenging
  | "almost"        // もう少し - Almost complete, final push
  | "cleared"       // クリア - Completed successfully
  | "paused"        // 中断 - Paused, can resume
  | "cancelled";    // キャンセル - Cancelled, treated as new if re-accepted

/**
 * Get positive, action-focused status description
 * Emphasizes recording state, not evaluation
 */
export function getStatusDescription(status: QuestStatus): string {
  const descriptions: Record<QuestStatus, string> = {
    unreceived: "受注待ち",        // Waiting to accept
    accepted: "受注中",            // Accepted, in queue
    challenging: "進行中",         // In progress
    almost: "もう少し",            // Almost there
    cleared: "クリア",             // Completed
    paused: "中断中",              // Paused
    cancelled: "キャンセル",       // Cancelled
  };
  return descriptions[status];
}

/**
 * Get visual indicator for status
 */
export function getStatusIcon(status: QuestStatus): string {
  const icons: Record<QuestStatus, string> = {
    unreceived: "◇",  // Empty diamond - waiting
    accepted: "◆",    // Filled diamond - accepted
    challenging: "▶", // Play - in progress
    almost: "◐",      // Half circle - almost
    cleared: "✔",     // Checkmark - completed
    paused: "⏸",      // Pause - paused
    cancelled: "✕",   // X - cancelled
  };
  return icons[status];
}

/**
 * Get color class for status
 */
export function getStatusColorClass(status: QuestStatus): string {
  const colors: Record<QuestStatus, string> = {
    unreceived: "text-muted-foreground",
    accepted: "text-muted-foreground",
    challenging: "text-accent",
    almost: "text-accent",
    cleared: "text-accent",
    paused: "text-muted-foreground",
    cancelled: "text-muted-foreground",
  };
  return colors[status];
}

/**
 * Check if status is "continuing" (not broken streak)
 * Only cleared quests maintain streak
 */
export function isStreakContinuing(status: QuestStatus): boolean {
  return status === "cleared";
}

/**
 * Check if status is "ongoing" (in active state)
 */
export function isOngoing(status: QuestStatus): boolean {
  return ["accepted", "challenging", "almost"].includes(status);
}

/**
 * Check if status is "completed" (final state)
 */
export function isCompleted(status: QuestStatus): boolean {
  return ["cleared", "paused", "cancelled"].includes(status);
}
