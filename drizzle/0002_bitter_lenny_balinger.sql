CREATE TABLE `daily_config` (
	`userId` integer NOT NULL,
	`date` text NOT NULL,
	`jobModeDisabled` integer DEFAULT false NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_insights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`insight` text NOT NULL,
	`action` text,
	`applied` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`content` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `quest_history` ADD `note` text;--> statement-breakpoint
ALTER TABLE `quest_templates` ADD `displayOrder` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `quests` ADD `note` text;--> statement-breakpoint
ALTER TABLE `quests` ADD `targetCount` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `quests` ADD `currentCount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `quests` ADD `displayOrder` integer DEFAULT 0 NOT NULL;