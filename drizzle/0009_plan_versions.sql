CREATE TABLE `plan_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`label` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`snapshot` text NOT NULL,
	`server_seq_at_tag` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plan_versions_plan_idx` ON `plan_versions` (`plan_id`);--> statement-breakpoint
CREATE INDEX `plan_versions_plan_created_idx` ON `plan_versions` (`plan_id`,`created_at`);