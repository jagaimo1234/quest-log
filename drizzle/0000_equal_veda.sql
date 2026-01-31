CREATE TABLE `quest_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`questId` integer NOT NULL,
	`templateId` integer,
	`questName` text,
	`projectName` text,
	`questType` text NOT NULL,
	`difficulty` text DEFAULT '1' NOT NULL,
	`finalStatus` text NOT NULL,
	`xpEarned` integer DEFAULT 0 NOT NULL,
	`recordedAt` integer NOT NULL,
	`recordedDate` text NOT NULL,
	`plannedTimeSlot` text
);
--> statement-breakpoint
CREATE TABLE `quest_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`questName` text,
	`projectName` text,
	`questType` text NOT NULL,
	`difficulty` text DEFAULT '1' NOT NULL,
	`frequency` integer DEFAULT 1 NOT NULL,
	`daysOfWeek` text,
	`weeksOfMonth` text,
	`datesOfMonth` text,
	`monthOfYear` integer,
	`startDate` integer,
	`endDate` integer,
	`isActive` integer DEFAULT true NOT NULL,
	`lastGeneratedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`questName` text,
	`projectName` text,
	`questType` text NOT NULL,
	`difficulty` text DEFAULT '1' NOT NULL,
	`status` text DEFAULT 'unreceived' NOT NULL,
	`plannedTimeSlot` text,
	`startDate` integer,
	`deadline` integer,
	`moaiType` integer DEFAULT 1 NOT NULL,
	`templateId` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`acceptedAt` integer,
	`clearedAt` integer
);
--> statement-breakpoint
CREATE TABLE `user_progression` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`totalXp` integer DEFAULT 0 NOT NULL,
	`currentStreak` integer DEFAULT 0 NOT NULL,
	`longestStreak` integer DEFAULT 0 NOT NULL,
	`lastClearedDate` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_progression_userId_unique` ON `user_progression` (`userId`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`lastSignedIn` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);