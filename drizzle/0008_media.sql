CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`kind` text NOT NULL,
	`mime_type` text NOT NULL,
	`original_name` text NOT NULL,
	`storage_path` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`width` integer,
	`height` integer,
	`source_url` text,
	`source_chat_attachment_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `media_plan_idx` ON `media` (`plan_id`);--> statement-breakpoint
ALTER TABLE `chat_attachments` ADD `media_id` text;