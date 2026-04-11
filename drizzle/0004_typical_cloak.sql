CREATE TABLE `daily_bulletin_boards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`date` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`diary` text DEFAULT '' NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_date_idx` ON `daily_bulletin_boards` (`userId`,`date`);--> statement-breakpoint
CREATE TABLE `investment_tickers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`ticker` text NOT NULL,
	`step1` text DEFAULT 'unstarted' NOT NULL,
	`step2` text DEFAULT 'unstarted' NOT NULL,
	`step3` text DEFAULT 'unstarted' NOT NULL,
	`step4` text DEFAULT 'unstarted' NOT NULL,
	`step5` text DEFAULT 'unstarted' NOT NULL,
	`step6` text DEFAULT 'unstarted' NOT NULL,
	`step7` text DEFAULT 'unstarted' NOT NULL,
	`stopLossText` text DEFAULT '-5%' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `moai_activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`insight` text NOT NULL,
	`action` text,
	`date` text NOT NULL,
	`applied` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `monthly_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`month` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`awareness` text DEFAULT '' NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_month_idx` ON `monthly_goals` (`userId`,`month`);--> statement-breakpoint
CREATE TABLE `reading_books` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'reading' NOT NULL,
	`rating` integer,
	`review` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`completedAt` integer
);
--> statement-breakpoint
CREATE TABLE `watching_movies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'watching' NOT NULL,
	`rating` integer,
	`review` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`completedAt` integer
);
--> statement-breakpoint
ALTER TABLE `daily_config` ADD `lunchCount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `daily_config` DROP COLUMN `lunchCooked`;