CREATE TABLE `intents_archive` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`server_seq` integer NOT NULL,
	`lamport` integer NOT NULL,
	`origin` text NOT NULL,
	`kind` text NOT NULL,
	`parent_entry_id` text,
	`intent` text NOT NULL,
	`created_at` integer NOT NULL,
	`archived_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `intents_archive_plan_seq_idx` ON `intents_archive` (`plan_id`,`server_seq`);--> statement-breakpoint
ALTER TABLE `plans` ADD `snapshot_seq` integer DEFAULT 0 NOT NULL;