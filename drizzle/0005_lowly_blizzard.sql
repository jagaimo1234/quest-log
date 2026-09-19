CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`targetType` text NOT NULL,
	`targetId` text NOT NULL,
	`dataUrl` text NOT NULL,
	`fileName` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `insight_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`targetType` text NOT NULL,
	`targetId` integer NOT NULL,
	`content` text NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `investment_tickers` ADD `step1StartedAt` integer;--> statement-breakpoint
ALTER TABLE `memos` ADD `action` text;--> statement-breakpoint
ALTER TABLE `memos` ADD `likes` integer DEFAULT 0 NOT NULL;