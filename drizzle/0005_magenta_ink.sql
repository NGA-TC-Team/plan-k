CREATE TABLE `refs` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`src_id` text NOT NULL,
	`dst_id` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `refs_plan_dst_idx` ON `refs` (`plan_id`,`dst_id`);--> statement-breakpoint
CREATE INDEX `refs_plan_src_idx` ON `refs` (`plan_id`,`src_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `refs_unique_idx` ON `refs` (`src_id`,`dst_id`,`kind`);